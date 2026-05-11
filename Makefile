# Docker Compose wrapper for Havamind
# Usage: make [target]

COMPOSE := docker compose
COMPOSE_FILE := docker-compose.yml

.PHONY: help up down build rebuild recreate clean-rebuild restart stop logs ps shell shell-db clean

help:
	@echo "Docker targets for Havamind"
	@echo ""
	@echo "  make up           - Start all containers (detached)"
	@echo "  make down         - Stop and remove containers (keep volumes)"
	@echo "  make build        - Build images (use cache)"
	@echo "  make rebuild      - Clean rebuild: down, build --no-cache, up"
	@echo "  make recreate     - Recreate containers from existing images (no build; compose/env/health only)"
	@echo "                      (To ship new app code into the image, run \`make build\` then \`make recreate\`.)"
	@echo "  make restart      - Restart running containers (fast; same as docker compose restart)"
	@echo "  make clean-rebuild - Full reset: down -v, build --no-cache, up (wipes DB)"
	@echo "  make stop         - Stop containers without removing"
	@echo "  make logs         - Follow logs (all services)"
	@echo "  make logs-web     - Follow web service logs"
	@echo "  make logs-db      - Follow postgres logs"
	@echo "  make ps           - List running containers"
	@echo "  make shell        - Open shell in web container"
	@echo "  make shell-db     - Open psql in postgres container"
	@echo "  make clean        - Stop and remove containers + volumes"

up:
	$(COMPOSE) -f $(COMPOSE_FILE) up -d

down:
	$(COMPOSE) -f $(COMPOSE_FILE) down

build:
	$(COMPOSE) -f $(COMPOSE_FILE) build

rebuild: down
	$(COMPOSE) -f $(COMPOSE_FILE) build --no-cache
	$(COMPOSE) -f $(COMPOSE_FILE) up -d

# Recreate containers without rebuilding images. App code baked into the image only updates after `make build`.
recreate:
	$(COMPOSE) -f $(COMPOSE_FILE) up -d --force-recreate

restart:
	$(COMPOSE) -f $(COMPOSE_FILE) restart

clean-rebuild: down
	$(COMPOSE) -f $(COMPOSE_FILE) down -v
	$(COMPOSE) -f $(COMPOSE_FILE) build --no-cache
	$(COMPOSE) -f $(COMPOSE_FILE) up -d

stop:
	$(COMPOSE) -f $(COMPOSE_FILE) stop

logs:
	$(COMPOSE) -f $(COMPOSE_FILE) logs -f

logs-web:
	$(COMPOSE) -f $(COMPOSE_FILE) logs -f web

logs-db:
	$(COMPOSE) -f $(COMPOSE_FILE) logs -f postgres

ps:
	$(COMPOSE) -f $(COMPOSE_FILE) ps

shell:
	$(COMPOSE) -f $(COMPOSE_FILE) exec web sh

shell-db:
	$(COMPOSE) -f $(COMPOSE_FILE) exec postgres psql -U postgres -d goventurevalue

clean:
	$(COMPOSE) -f $(COMPOSE_FILE) down -v
