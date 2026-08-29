#!/bin/bash
# One-time, app-specific setup: this app's database on the DigitalOcean
# managed MySQL cluster. Everything else (nginx, certbot, Docker, the deploy
# directory, .env, the site's nginx vhost) is handled generically by
# ~/Sites/server-config's bootstrap.sh (run once per host) and site.sh (run
# once per site) — see this repo's README "Deploy" section.
#
# Just one database, unlike ~/Sites/pocketproducer-web's two: that app's
# solid_cable adapter needs its own database, but Inertia's ActionCable
# setup is unused (see config/cable.yml), so there's no cable database here.
set -e

read -s -p "Password for the DigitalOcean managed MySQL cluster's doadmin user: " DB_PW
echo

# Requires this machine's IP to be in the cluster's Trusted Sources in the
# DigitalOcean control panel, or this will hang/time out. doadmin already has
# full cluster-wide privileges, so there's no separate app user/GRANT step.
command -v mysql >/dev/null 2>&1 || { echo "mysql client required (e.g. brew install mysql-client, or apt-get install mysql-client)"; exit 1; }

read -p "Managed MySQL cluster host (e.g. db-mysql-nyc3-XXXXX-do-user-XXXXXXX-0.b.db.ondigitalocean.com): " DB_HOST
read -p "Managed MySQL cluster port [25060]: " DB_PORT
DB_PORT="${DB_PORT:-25060}"

MYSQL_PWD="${DB_PW}" mysql \
  -h "$DB_HOST" -P "$DB_PORT" \
  -u doadmin --ssl-mode=REQUIRED \
  -e "CREATE DATABASE IF NOT EXISTS inertia_production CHARACTER SET utf8mb4;"

echo "Done."
