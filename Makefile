PORT ?= 3000
URL := http://localhost:$(PORT)
COMPOSE := docker compose

UNAME_S := $(shell uname -s)
ifeq ($(UNAME_S),Darwin)
  OPEN := open
else
  OPEN := xdg-open
endif

.DEFAULT_GOAL := all
.PHONY: all setup dev build clean open

all: setup dev

setup:
	$(COMPOSE) build
	$(COMPOSE) run --rm web bin/rails db:prepare

dev:
	$(COMPOSE) up --build -d
	@until curl -sf $(URL) >/dev/null; do sleep 1; done
	$(OPEN) $(URL)
	$(COMPOSE) logs -f web

build:
	docker build --target production -t inertia-backend:production ./backend
	docker build --target web -t inertia-frontend:web ./frontend

clean:
	$(COMPOSE) down --rmi local -v

APP := frontend/dist/mac-arm64/Inertia.app

# Builds the packaged macOS app the first time (or after source changes force
# a rebuild), then opens it like any other Mac app. Expects the backend from
# `make dev` to already be running.
open: $(APP)
	open $(APP)

$(APP): frontend/package.json $(shell find frontend/src -type f)
	cd frontend && test -d node_modules || npm install
	cd frontend && npm run build:mac
