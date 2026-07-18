APPNAME=$(shell basename $(shell go list))
VERSION?=snapshot
COMMIT=$(shell git rev-parse --verify HEAD)
DATE?=$(shell date +%FT%T%z)
RELEASE?=0

GOPATH?=$(shell go env GOPATH)
GO_LDFLAGS+=-X main.appName=$(APPNAME)
GO_LDFLAGS+=-X main.buildVersion=$(VERSION)
GO_LDFLAGS+=-X main.buildCommit=$(COMMIT)
GO_LDFLAGS+=-X main.buildDate=$(DATE)
ifeq ($(RELEASE), 1)
	# Strip debug information from the binary
	GO_LDFLAGS+=-s -w
endif
GO_LDFLAGS:=-ldflags="$(GO_LDFLAGS)"

DOCKER_IMAGE=ghcr.io/smocker-dev/smocker

# See: https://docs.docker.com/engine/reference/commandline/tag/#extended-description
# A tag name must be valid ASCII and may contain lowercase and uppercase letters, digits, underscores, periods and dashes.
# A tag name may not start with a period or a dash and may contain a maximum of 128 characters.
DOCKER_TAG:=$(shell echo $(VERSION) | tr -cd '[:alnum:]_.-')
IS_SEMVER:=$(shell echo $(DOCKER_TAG) | grep -E "^[[:digit:]]+\.[[:digit:]]+\.[[:digit:]]+$$")

LEVEL=debug

SUITE=*.yml

.PHONY: default
default: start

REFLEX=$(GOPATH)/bin/reflex
$(REFLEX):
	go install github.com/cespare/reflex@latest

GOLANGCILINTVERSION:=2.12.2
GOLANGCILINT=$(GOPATH)/bin/golangci-lint
$(GOLANGCILINT):
	curl -fsSL https://raw.githubusercontent.com/golangci/golangci-lint/v$(GOLANGCILINTVERSION)/install.sh | sh -s -- -b $(GOPATH)/bin v$(GOLANGCILINTVERSION)

VENOMVERSION:=v1.0.0-rc.6
VENOM=$(GOPATH)/bin/venom
$(VENOM):
	go install github.com/ovh/venom/cmd/venom@$(VENOMVERSION)

GOCOVMERGE=$(GOPATH)/bin/gocovmerge
$(GOCOVMERGE):
	go install github.com/wadey/gocovmerge@latest

CADDYVERSION:=v2.8.4
CADDY=$(GOPATH)/bin/caddy
$(CADDY):
	go install github.com/caddyserver/caddy/v2/cmd/caddy@$(CADDYVERSION)

# All generated/runtime artifacts live under build/ so the repository root stays clean.
BUILD_DIR=build
SESSIONS_DIR=$(BUILD_DIR)/sessions
COVERAGE_DIR=$(BUILD_DIR)/coverage

.PHONY: persistence
persistence:
	rm -rf ./$(SESSIONS_DIR) || true
	mkdir -p $(BUILD_DIR)
	cp -r tests/sessions $(SESSIONS_DIR)

.PHONY: start
start: $(REFLEX) persistence
	$(REFLEX) --start-service \
		--decoration='none' \
		--regex='\.go$$' \
		--inverse-regex='^vendor|node_modules|.cache/' \
		-- go run $(GO_LDFLAGS) main.go --log-level=$(LEVEL) --static-files ./build/client --persistence-directory ./$(SESSIONS_DIR)

.PHONY: build
build:
	go build -trimpath $(GO_LDFLAGS) -o ./build/$(APPNAME)

.PHONY: lint
lint: $(GOLANGCILINT)
	$(GOLANGCILINT) run

.PHONY: format
format:
	gofmt -s -w .

.PHONY: test
test:
	mkdir -p $(COVERAGE_DIR)
	go test -v -race -coverprofile=$(COVERAGE_DIR)/test-cover.out ./server/...

PID_FILE=/tmp/$(APPNAME).test.pid
.PHONY: test-integration
test-integration: $(VENOM) check-default-ports persistence
	mkdir -p $(COVERAGE_DIR)
	go test -race -coverpkg="./..." -c . -o $(BUILD_DIR)/$(APPNAME).test
	SMOCKER_PERSISTENCE_DIRECTORY=./$(SESSIONS_DIR) $(BUILD_DIR)/$(APPNAME).test -test.coverprofile=$(COVERAGE_DIR)/test-integration-cover.out >/dev/null 2>&1 & echo $$! > $(PID_FILE)
	sleep 5
	$(VENOM) run tests/features/$(SUITE)
	kill `cat $(PID_FILE)` 2> /dev/null || true

.PHONY: start-integration
start-integration: $(VENOM)
	$(VENOM) run tests/features/$(SUITE)

# End-to-end UI non-regression tests (Playwright). Builds the client and backend, serves the
# built client through smocker (seeded with tests/sessions), runs the suite, then stops the
# server. Requires the Playwright browser to be installed (npx playwright install chromium).
E2E_MOCK_PORT ?= 8080
E2E_ADMIN_PORT ?= 8081
.PHONY: test-e2e
test-e2e: build persistence
	npm run build
	SMOCKER_PERSISTENCE_DIRECTORY=./$(SESSIONS_DIR) ./$(BUILD_DIR)/$(APPNAME) \
		--static-files ./$(BUILD_DIR)/client \
		--mock-server-listen-port=$(E2E_MOCK_PORT) --config-listen-port=$(E2E_ADMIN_PORT) \
		> $(BUILD_DIR)/e2e-smocker.log 2>&1 & \
	SMK_PID=$$!; \
	for i in $$(seq 1 30); do curl -sf localhost:$(E2E_ADMIN_PORT)/version >/dev/null 2>&1 && break; sleep 0.3; done; \
	SMOCKER_E2E_URL=http://localhost:$(E2E_ADMIN_PORT) npx playwright test --config tests/e2e/playwright.config.ts; \
	RC=$$?; kill $$SMK_PID 2>/dev/null || true; exit $$RC

$(COVERAGE_DIR)/test-cover.out:
	$(MAKE) test

$(COVERAGE_DIR)/test-integration-cover.out:
	$(MAKE) test-integration

.PHONY: coverage
coverage: $(GOCOVMERGE) $(COVERAGE_DIR)/test-cover.out $(COVERAGE_DIR)/test-integration-cover.out
	$(GOCOVMERGE) $(COVERAGE_DIR)/test-cover.out $(COVERAGE_DIR)/test-integration-cover.out > $(COVERAGE_DIR)/cover.out

.PHONY: clean
clean:
	rm -rf ./$(BUILD_DIR)

.PHONY: build-docker
build-docker:
	docker build --build-arg VERSION=$(VERSION) --build-arg COMMIT=$(COMMIT) --tag $(DOCKER_IMAGE):latest .
	docker tag $(DOCKER_IMAGE) $(DOCKER_IMAGE):$(DOCKER_TAG)

.PHONY: start-docker
start-docker: check-default-ports
	docker run -d -p 8080:8080 -p 8081:8081 --name $(APPNAME) $(DOCKER_IMAGE):$(DOCKER_TAG)

.PHONY: check-default-ports
check-default-ports:
	@lsof -i:8080 > /dev/null && (echo "Port 8080 already in use"; exit 1) || true
	@lsof -i:8081 > /dev/null && (echo "Port 8081 already in use"; exit 1) || true

.PHONY: optimize
optimize:
	find client/assets/ -iname '*.png' -print0 | xargs -0 -n1 optipng -strip all
	find docs/ -iname '*.png' -print0 | xargs -0 -n1 optipng -strip all

# The following targets are only available for CI usage

build/smocker.tar.gz:
	$(MAKE) build
	npm ci --ignore-scripts
	npm run build
	# Package only the release artifacts, not test/runtime output that may also live in build/.
	cd build/; tar -czvf smocker.tar.gz smocker client

.PHONY: release
release: build/smocker.tar.gz

.PHONY: start-release
start-release: clean build/smocker.tar.gz
	cd build/; ./smocker --config-base-path=/smocker/

.PHONY: start-caddy
start-caddy: $(CADDY)
	$(CADDY) run

.PHONY: deploy-docker
deploy-docker:
	docker run --rm --privileged multiarch/qemu-user-static --reset -p yes
	docker buildx create --use
ifdef IS_SEMVER
	docker buildx build --push --build-arg VERSION=$(VERSION) --build-arg COMMIT=$(COMMIT) --platform linux/arm/v7,linux/arm64/v8,linux/amd64 --tag $(DOCKER_IMAGE):latest .
endif
	docker buildx build --push --build-arg VERSION=$(VERSION) --build-arg COMMIT=$(COMMIT) --platform linux/arm/v7,linux/arm64/v8,linux/amd64 --tag $(DOCKER_IMAGE):$(DOCKER_TAG) .
