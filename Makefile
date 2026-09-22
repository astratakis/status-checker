COMPOSE := docker compose

# A container cannot see the machine's real hostname, so hand it over.
export HOST_NAME ?= $(shell hostname)

.DEFAULT_GOAL := help
.PHONY: help server server-stop client client-stop

help:
	@echo "make server       Start the status server on this machine"
	@echo "make server-stop  Stop the status server"
	@echo "make client       Start the dashboard"
	@echo "make client-stop  Stop the dashboard"

# First run: create .env with a freshly generated API key.
.env:
	@key=$$(openssl rand -hex 32) && sed "s/^API_KEY=.*/API_KEY=$$key/" .env.example > .env
	@echo "Created .env with a new API key."

# Start a service, wait until it is healthy, then print where to find it.
define start
	$(COMPOSE) up --detach --build --wait $(1)
	@echo "$(2): http://localhost:$$($(COMPOSE) port $(1) $(3) | cut -d: -f2)$(4)"
endef

# Stop a service, and clean up the shared network once nothing is left running.
define stop
	$(COMPOSE) rm --stop --force $(1)
	@[ -n "$$($(COMPOSE) ps --all --quiet)" ] || $(COMPOSE) down
endef

server: .env
	$(call start,server,Server API docs,8000,/docs)

server-stop:
	$(call stop,server)

client: .env
	$(call start,client,Dashboard,3000,)

client-stop:
	$(call stop,client)
