#!/bin/bash
# Deploys Inertia to production end to end: copies the built webpack app and
# compose file, writes .env, brings up the api container, and installs this
# app's own nginx vhost + TLS cert. Run from CI
# (.github/workflows/deploy.yml) or by hand — either way it just SSHes/SCPs
# to deploy@inertia.it.com; no other tooling required. CI loads
# inertia-backend:latest onto the host before running this script. Safe to
# re-run.
#
# Mirrors ~/Sites/pocketproducer-web/deploy/deploy.sh — same shared droplet
# (several other sites live on it under the same `deploy` account),
# ~/Sites/server-config bootstrap, and per-app-owns-its-own-vhost convention.
# See that repo's README "Conventions for per-app deploy scripts".
#
# Needs, on top of the shared sudoers grant bootstrap.sh installs: the
# per-app grant at deploy/server/sudoers.d/inertia-web (installed once, by
# hand, as admin — see that file's own header).
#
# No RAILS_MASTER_KEY needed: SECRET_KEY_BASE is set directly below, which
# Rails reads before ever trying to decrypt config/credentials.yml.enc, and
# JWT_SECRET_KEY is what devise.rb actually checks first. Neither requires
# config/master.key to exist anywhere.
set -euo pipefail

: "${SECRET_KEY_BASE:?SECRET_KEY_BASE must be set in the environment}"
: "${JWT_SECRET_KEY:?JWT_SECRET_KEY must be set in the environment}"
: "${DATABASE_HOST:?DATABASE_HOST must be set in the environment}"
: "${DATABASE_USERNAME:?DATABASE_USERNAME must be set in the environment}"
: "${DATABASE_PASSWORD:?DATABASE_PASSWORD must be set in the environment}"

SSH_TARGET="deploy@inertia.it.com"
DOMAIN="inertia.it.com"
REMOTE_DIR="/var/www/$DOMAIN"
CERTBOT_EMAIL="simplex0@gmail.com"
SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
WEB_DIST="$SCRIPT_DIR/../frontend/dist"
CERTBOT_CMD="sudo -n /usr/bin/certbot certonly --webroot -w /var/www/certbot -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos -m $CERTBOT_EMAIL"

if [ ! -f "$WEB_DIST/index.html" ]; then
  echo "frontend/dist is missing; run 'cd frontend && npm ci && npm run build' first" >&2
  exit 1
fi

echo "==> Ensuring $REMOTE_DIR exists"
ssh "$SSH_TARGET" "sudo -n /usr/bin/mkdir -p '$REMOTE_DIR' && sudo -n /bin/chown deploy:deploy '$REMOTE_DIR'"

echo "==> Copying compose file"
scp "$SCRIPT_DIR/../docker-compose.prod.yml" "$SSH_TARGET:$REMOTE_DIR/docker-compose.yml"

echo "==> Copying web app"
COPYFILE_DISABLE=1 tar -C "$WEB_DIST" -czf - . | ssh "$SSH_TARGET" "mkdir -p '$REMOTE_DIR/web' && tar -C '$REMOTE_DIR/web' -xzf -"

echo "==> Picking (or reusing) a host port"
HOST_PORT=$(ssh "$SSH_TARGET" bash -s -- "$REMOTE_DIR" <<'REMOTE'
set -e
cd "$1"
port=$(grep -m1 '^HOST_PORT=' .env 2>/dev/null | cut -d= -f2 | sed 's/[^0-9]//g' || true)
if [ -z "$port" ]; then
  port=$(python3 -c 'import socket; s=socket.socket(); s.bind(("127.0.0.1",0)); print(s.getsockname()[1]); s.close()')
fi
echo "$port"
REMOTE
)
echo "    HOST_PORT=$HOST_PORT"

write_env_var() {
  local NAME="$1"
  local VALUE="$2"
  [ -z "$VALUE" ] && return
  if [[ "$VALUE" == *$'\n'* || "$VALUE" == *$'\r'* ]]; then
    echo "$NAME must be a single-line value" >&2
    exit 1
  fi
  # Compose env files treat single-quoted values literally. Escape the two
  # characters that can otherwise terminate or alter that representation.
  VALUE=${VALUE//\\/\\\\}
  VALUE=${VALUE//\'/\\\'}
  printf "%s='%s'\n" "$NAME" "$VALUE"
}

echo "==> Writing runtime secrets and variables to .env"
{
  write_env_var RAILS_ENV "${RAILS_ENV:-production}"
  write_env_var SECRET_KEY_BASE "$SECRET_KEY_BASE"
  write_env_var JWT_SECRET_KEY "$JWT_SECRET_KEY"
  write_env_var DATABASE_HOST "$DATABASE_HOST"
  write_env_var DATABASE_PORT "${DATABASE_PORT:-}"
  write_env_var DATABASE_USERNAME "$DATABASE_USERNAME"
  write_env_var DATABASE_PASSWORD "$DATABASE_PASSWORD"
  write_env_var CORS_ORIGINS "${CORS_ORIGINS:-https://$DOMAIN}"
  write_env_var HOST_PORT "$HOST_PORT"
  write_env_var SERVICE api
} | ssh "$SSH_TARGET" "umask 077; cat > '$REMOTE_DIR/.env'; chmod 600 '$REMOTE_DIR/.env'"

echo "==> Recreating the api container from the image loaded by CI"
ssh "$SSH_TARGET" "cd '$REMOTE_DIR' && docker compose up -d --force-recreate --no-deps --pull never api && docker image prune -f"

install_vhost() {
  local SRC="$1"
  local RENDERED; RENDERED=$(mktemp)
  sed "s/__HOST_PORT__/$HOST_PORT/g" "$SRC" > "$RENDERED"
  scp "$RENDERED" "$SSH_TARGET:/tmp/$(basename "$SRC")"
  rm -f "$RENDERED"
  ssh "$SSH_TARGET" "sudo -n /bin/cp /tmp/$(basename "$SRC") /etc/nginx/sites-available/$DOMAIN && sudo -n /bin/ln -sf /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/$DOMAIN && sudo -n /usr/sbin/nginx -t && sudo -n /bin/systemctl reload nginx"
}

if ssh "$SSH_TARGET" "sudo -n /usr/bin/test -f /etc/letsencrypt/live/$DOMAIN/cert.pem"; then
  echo "==> Cert already exists"
else
  echo "==> No cert yet — installing the HTTP-only bootstrap vhost first"
  install_vhost "$SCRIPT_DIR/server/sites-available/$DOMAIN.bootstrap.conf"

  echo "==> Requesting the cert"
  ssh "$SSH_TARGET" "$CERTBOT_CMD"
fi

echo "==> Installing the full (HTTPS) vhost"
install_vhost "$SCRIPT_DIR/server/sites-available/$DOMAIN.conf"

echo "==> Renewing the cert if due (no-op otherwise — webroot mode never touches the vhost)"
ssh "$SSH_TARGET" "$CERTBOT_CMD"
ssh "$SSH_TARGET" "sudo -n /bin/systemctl reload nginx"

echo "Done. https://$DOMAIN -> 127.0.0.1:$HOST_PORT"
