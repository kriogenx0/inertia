.PHONY: help setup build up up-d down restart \
        logs logs-api logs-frontend ps open \
        db-migrate db-rollback db-reset db-seed \
        console routes shell-api shell-frontend \
        test lint clean nuke

# Rewrite localhost proxy URLs to host.docker.internal so containers can reach them
HOST_PROXY = $(shell echo "$${HTTP_PROXY:-}" | sed 's/localhost/host.docker.internal/g')
COMPOSE     = HTTP_PROXY=$(HOST_PROXY) HTTPS_PROXY=$(HOST_PROXY) docker compose

# ── Help ──────────────────────────────────────────────────────────────────────

help: ## Show this help message
	@awk 'BEGIN{FS=":.*##"} /^[a-zA-Z_-]+:.*##/{printf "  \033[36m%-18s\033[0m %s\n",$$1,$$2}' $(MAKEFILE_LIST)

# ── First-time setup ──────────────────────────────────────────────────────────

setup: ## Build images, start services, run migrations, and seed the DB
	$(COMPOSE) build
	$(COMPOSE) up -d
	@echo "Waiting for services to be ready..."
	@sleep 5
	$(COMPOSE) exec api bundle exec rails db:migrate
	$(COMPOSE) exec api bundle exec rails db:seed
	@echo ""
	@echo "✓ Setup complete — app running at http://localhost:5173"

# ── Build ─────────────────────────────────────────────────────────────────────

build: ## Build (or rebuild) all Docker images
	$(COMPOSE) build

build-api: ## Build only the API image
	$(COMPOSE) build api

build-frontend: ## Build only the frontend image
	$(COMPOSE) build frontend

# ── Run ───────────────────────────────────────────────────────────────────────

up: ## Start all services (foreground, streaming logs)
	$(COMPOSE) up

up-d: ## Start all services in the background
	$(COMPOSE) up -d

up-build: ## Rebuild images then start all services
	$(COMPOSE) up --build

down: ## Stop and remove containers
	docker compose down

restart: ## Restart all services
	docker compose restart

open: ## Open the app in the default browser
	open http://localhost:5173

# ── Logs ──────────────────────────────────────────────────────────────────────

logs: ## Tail logs for all services
	docker compose logs -f

logs-api: ## Tail API logs
	docker compose logs -f api

logs-frontend: ## Tail frontend logs
	docker compose logs -f frontend

ps: ## Show running service status
	docker compose ps

# ── Database ──────────────────────────────────────────────────────────────────

db-migrate: ## Run pending migrations
	docker compose exec api bundle exec rails db:migrate

db-rollback: ## Roll back the last migration
	docker compose exec api bundle exec rails db:rollback

db-reset: ## Drop, recreate, migrate, and seed the database
	docker compose exec api bundle exec rails db:drop db:create db:migrate db:seed

db-seed: ## Run database seeds
	docker compose exec api bundle exec rails db:seed

db-status: ## Show migration status
	docker compose exec api bundle exec rails db:migrate:status

# ── Rails ─────────────────────────────────────────────────────────────────────

console: ## Open a Rails console
	docker compose exec api bundle exec rails console

routes: ## Print all API routes
	docker compose exec api bundle exec rails routes

shell-api: ## Open a shell in the API container
	docker compose exec api bash

# ── Frontend ──────────────────────────────────────────────────────────────────

shell-frontend: ## Open a shell in the frontend container
	docker compose exec frontend sh

typecheck: ## Run TypeScript type-checker
	docker compose exec frontend sh -c "cd /app && ./node_modules/.bin/tsc --noEmit"

# ── Quality ───────────────────────────────────────────────────────────────────

test: ## Run the API test suite
	docker compose exec api bundle exec rails test

lint-api: ## Lint Ruby code with RuboCop (if installed)
	docker compose exec api bundle exec rubocop --parallel || true

# ── Cleanup ───────────────────────────────────────────────────────────────────

clean: ## Stop services and remove containers, networks, and volumes
	docker compose down -v --remove-orphans

nuke: ## Remove everything including built images (full reset)
	docker compose down -v --remove-orphans --rmi all
