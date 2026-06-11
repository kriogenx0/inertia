.DEFAULT_GOAL := all

.PHONY: all setup dev dev-api dev-frontend dev-mac build build-api build-frontend build-mac clean clean-api clean-frontend clean-mac help \
        up up-d up-build down restart open \
        logs logs-api logs-frontend ps \
        db-migrate db-rollback db-reset db-seed db-status \
        console routes shell-api shell-frontend \
        typecheck test lint-api nuke

# Rewrite localhost proxy URLs to host.docker.internal so containers can reach them
HOST_PROXY = $(shell echo "$${HTTP_PROXY:-}" | sed 's/localhost/host.docker.internal/g')
COMPOSE     = HTTP_PROXY=$(HOST_PROXY) HTTPS_PROXY=$(HOST_PROXY) docker compose

# ── Main ──────────────────────────────────────────────────────────────────────

all: setup dev ## Setup environment and start development (default)

setup: ## Build images, start services, prepare the database, and install local deps
	$(COMPOSE) build
	$(COMPOSE) up -d
	@echo "Waiting for services to be ready..."
	@sleep 5
	$(COMPOSE) exec api bundle exec rails db:prepare
	$(COMPOSE) exec api bundle exec rails db:seed
	cd app && npm install
	@echo "✓ Setup complete"

dev: ## Rebuild all services, start detached, and open browser
	$(COMPOSE) down --remove-orphans
	$(COMPOSE) build
	$(COMPOSE) up -d
	@sleep 3
	open http://localhost:5173

dev-api: ## Rebuild and restart the API service only
	$(COMPOSE) build api
	$(COMPOSE) up -d api

dev-frontend: ## Rebuild and restart the frontend service only
	$(COMPOSE) build frontend
	$(COMPOSE) up -d frontend

dev-mac: ## Start services, stream logs, and open the Electron app
	$(COMPOSE) up -d
	@echo "Waiting for frontend dev server..."
	@until $$(curl -sf http://localhost:5173 > /dev/null); do sleep 1; done
	$(COMPOSE) logs -f &
	cd app && VITE_DEV_SERVER_URL=http://localhost:5173 npx electron .
	@kill $$(jobs -p) 2>/dev/null || true

build: ## Build all (API Docker image + macOS Electron app)
	$(COMPOSE) build api
	cd app && npm install && npm run electron:build-mac

build-api: ## Build the API production Docker image
	$(COMPOSE) build api

build-frontend: ## Build the frontend for production (Vite bundle)
	$(COMPOSE) run --rm frontend npm run build

build-mac: ## Build the macOS Electron app (outputs to app/dist-electron)
	cd app && npm install && npm run electron:build-mac

clean: ## Remove containers, volumes, all build artifacts, and Docker build cache
	$(COMPOSE) down -v --remove-orphans
	rm -rf app/dist app/dist-electron
	docker builder prune -f

clean-api: ## Remove the API container and its volume
	$(COMPOSE) rm -sf api
	docker volume rm $$(docker volume ls -q | grep api_bundle) 2>/dev/null || true

clean-frontend: ## Remove the frontend container, node_modules volume, and Vite build output
	$(COMPOSE) rm -sf frontend
	docker volume rm $$(docker volume ls -q | grep app_node_modules) 2>/dev/null || true
	rm -rf app/dist

clean-mac: ## Remove the Electron build output
	rm -rf app/dist app/dist-electron

# ── Help ──────────────────────────────────────────────────────────────────────

help: ## Show this help message
	@awk 'BEGIN{FS=":.*##"} /^[a-zA-Z_-]+:.*##/{printf "  \033[36m%-18s\033[0m %s\n",$$1,$$2}' $(MAKEFILE_LIST)

# ── Run ───────────────────────────────────────────────────────────────────────

up: ## Start all services (foreground, streaming logs)
	$(COMPOSE) up

up-d: ## Start all services in the background
	$(COMPOSE) up -d

up-build: ## Rebuild images then start all services
	$(COMPOSE) up --build

down: ## Stop and remove containers
	$(COMPOSE) down

restart: ## Restart all services
	$(COMPOSE) restart

open: ## Open the app in the default browser
	open http://localhost:5173

# ── Logs ──────────────────────────────────────────────────────────────────────

logs: ## Tail logs for all services
	$(COMPOSE) logs -f

logs-api: ## Tail API logs
	$(COMPOSE) logs -f api

logs-frontend: ## Tail frontend logs
	$(COMPOSE) logs -f frontend

ps: ## Show running service status
	$(COMPOSE) ps

# ── Database ──────────────────────────────────────────────────────────────────

db-migrate: ## Run pending migrations
	$(COMPOSE) exec api bundle exec rails db:migrate

db-rollback: ## Roll back the last migration
	$(COMPOSE) exec api bundle exec rails db:rollback

db-reset: ## Drop, recreate, migrate, and seed the database
	$(COMPOSE) exec api bundle exec rails db:drop db:create db:migrate db:seed

db-seed: ## Run database seeds
	$(COMPOSE) exec api bundle exec rails db:seed

db-status: ## Show migration status
	$(COMPOSE) exec api bundle exec rails db:migrate:status

# ── Rails ─────────────────────────────────────────────────────────────────────

console: ## Open a Rails console
	$(COMPOSE) exec api bundle exec rails console

routes: ## Print all API routes
	$(COMPOSE) exec api bundle exec rails routes

shell-api: ## Open a shell in the API container
	$(COMPOSE) exec api bash

# ── Frontend ──────────────────────────────────────────────────────────────────

shell-frontend: ## Open a shell in the frontend container
	$(COMPOSE) exec frontend sh

typecheck: ## Run TypeScript type-checker
	$(COMPOSE) exec frontend sh -c "cd /app && ./node_modules/.bin/tsc --noEmit"

# ── Quality ───────────────────────────────────────────────────────────────────

test: ## Run the API test suite
	$(COMPOSE) exec api bundle exec rails test

lint-api: ## Lint Ruby code with RuboCop
	$(COMPOSE) exec api bundle exec rubocop --parallel || true

# ── Cleanup ───────────────────────────────────────────────────────────────────

nuke: ## Remove everything including built images (full reset)
	$(COMPOSE) down -v --remove-orphans --rmi all
