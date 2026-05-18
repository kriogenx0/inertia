.PHONY: up down build restart logs ps clean open \
        db-migrate db-rollback db-reset db-seed \
        console shell-api shell-frontend \
        routes test

# Rewrite localhost proxy URLs to host.docker.internal so containers can reach them
HOST_PROXY = $(shell echo "$${HTTP_PROXY:-}" | sed 's/localhost/host.docker.internal/g')

# ── Docker ────────────────────────────────────────────────────────────────────

open:
	open http://localhost:5173

up:
	HTTP_PROXY=$(HOST_PROXY) HTTPS_PROXY=$(HOST_PROXY) docker compose up

up-build:
	HTTP_PROXY=$(HOST_PROXY) HTTPS_PROXY=$(HOST_PROXY) docker compose up --build

down:
	docker compose down

build:
	HTTP_PROXY=$(HOST_PROXY) HTTPS_PROXY=$(HOST_PROXY) docker compose build

restart:
	docker compose restart

logs:
	docker compose logs -f

logs-api:
	docker compose logs -f api

logs-frontend:
	docker compose logs -f frontend

ps:
	docker compose ps

# ── Database ──────────────────────────────────────────────────────────────────

db-migrate:
	docker compose exec api bundle exec rails db:migrate

db-rollback:
	docker compose exec api bundle exec rails db:rollback

db-reset:
	docker compose exec api bundle exec rails db:drop db:create db:migrate

db-seed:
	docker compose exec api bundle exec rails db:seed

# ── Rails ─────────────────────────────────────────────────────────────────────

console:
	docker compose exec api bundle exec rails console

routes:
	docker compose exec api bundle exec rails routes

shell-api:
	docker compose exec api bash

# ── Frontend ──────────────────────────────────────────────────────────────────

shell-frontend:
	docker compose exec frontend sh

# ── Cleanup ───────────────────────────────────────────────────────────────────

clean:
	docker compose down -v --remove-orphans
