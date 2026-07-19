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
IS_SEMVER:=$(shell echo $(DOCKER_TAG) | grep -E "^v?[[:digit:]]+\.[[:digit:]]+\.[[:digit:]]+$$")

# Published image platforms. The binary suffix must match the Dockerfile's
# ${TARGETOS}-${TARGETARCH}${TARGETVARIANT}: linux/amd64 -> linux-amd64, linux/arm64 ->
# linux-arm64, linux/arm/v7 -> linux-armv7.
DOCKER_PLATFORMS:=linux/amd64,linux/arm64,linux/arm/v7

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

# Local proxy target for the integration tests: a self-hosted httpbin (go-httpbin) so the
# proxy mocks don't depend on the flaky public httpbin.org.
GOHTTPBINVERSION:=v2.18.3
GOHTTPBIN=$(GOPATH)/bin/go-httpbin
$(GOHTTPBIN):
	go install github.com/mccutchen/go-httpbin/v2/cmd/go-httpbin@$(GOHTTPBINVERSION)

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
		-- go run $(GO_LDFLAGS) main.go --log-level=$(LEVEL) --static-files ./server/frontend/dist --persistence-directory ./$(SESSIONS_DIR)

.PHONY: build
build:
	go build -trimpath $(GO_LDFLAGS) -o ./build/$(APPNAME)

# Build the client into server/frontend/dist, the go:embed source (Vite outputs straight there).
.PHONY: build-client
build-client:
	npm ci --ignore-scripts
	npm run build

# -tags embedclient bakes the built client into the binary via go:embed (default builds skip it
# and serve from --static-files). CGO off keeps every target a static, cross-compilable binary.
GO_BUILD_EMBED=CGO_ENABLED=0 go build -tags embedclient -trimpath $(GO_LDFLAGS)

# Published platforms as GOOS/GOARCH[/variant]. The binary suffix mirrors the Dockerfile's
# ${TARGETOS}-${TARGETARCH}${TARGETVARIANT} (e.g. linux/arm/v7 -> smocker-linux-armv7). The linux
# artifacts are what the docker images are assembled from (the image build only packages them,
# never compiles); darwin/windows are shipped as release downloads.
RELEASE_PLATFORMS=linux/amd64 linux/arm64 linux/arm/v7 darwin/amd64 darwin/arm64 windows/amd64 windows/arm64

.PHONY: build-binaries
build-binaries: build-client
	@set -e; for p in $(RELEASE_PLATFORMS); do \
		os=$${p%%/*}; rest=$${p#*/}; arch=$${rest%%/*}; variant=$${rest#$$arch}; variant=$${variant#/}; \
		ext=; [ "$$os" = windows ] && ext=.exe; \
		out=$(BUILD_DIR)/smocker-$$os-$$arch$$variant$$ext; \
		echo ">> building $$out"; \
		GOOS=$$os GOARCH=$$arch GOARM=$${variant#v} $(GO_BUILD_EMBED) -o $$out .; \
	done

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
HTTPBIN_PID_FILE=/tmp/$(APPNAME).httpbin.pid
PROXY_TARGET_PORT ?= 8090
.PHONY: test-integration
test-integration: $(VENOM) $(GOHTTPBIN) check-default-ports persistence
	mkdir -p $(COVERAGE_DIR)
	go test -race -coverpkg="./..." -c . -o $(BUILD_DIR)/$(APPNAME).test
	$(GOHTTPBIN) -port $(PROXY_TARGET_PORT) >/dev/null 2>&1 & echo $$! > $(HTTPBIN_PID_FILE)
	SMOCKER_PERSISTENCE_DIRECTORY=./$(SESSIONS_DIR) $(BUILD_DIR)/$(APPNAME).test -test.coverprofile=$(COVERAGE_DIR)/test-integration-cover.out >/dev/null 2>&1 & echo $$! > $(PID_FILE)
	sleep 5
	@ret=0; $(VENOM) run tests/features/$(SUITE) || ret=$$?; \
		kill `cat $(PID_FILE)` 2>/dev/null || true; \
		kill `cat $(HTTPBIN_PID_FILE)` 2>/dev/null || true; \
		exit $$ret

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
		--static-files ./server/frontend/dist \
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
build-docker: build-client
	# Build the native linux/amd64 binary and package it into a single-arch image (used for the
	# smoke test) — no cross-compilation of the other release platforms.
	GOOS=linux GOARCH=amd64 $(GO_BUILD_EMBED) -o $(BUILD_DIR)/smocker-linux-amd64 .
	docker build --tag $(DOCKER_IMAGE):latest --tag $(DOCKER_IMAGE):$(DOCKER_TAG) .

.PHONY: start-docker
start-docker: check-default-ports
	docker run -d -p 8080:8080 -p 8081:8081 --name $(APPNAME) $(DOCKER_IMAGE):$(DOCKER_TAG)

# Smoke-test the running container (started by start-docker): the config API answers, the UI is
# served (proves the embedded client works — the image ships no client directory), and a mock
# registered on the config port is served on the mock port.
.PHONY: smoke-docker
smoke-docker:
	@for i in $$(seq 1 30); do curl -sf http://localhost:8081/version >/dev/null 2>&1 && break; sleep 1; done
	@curl -sf http://localhost:8081/version >/dev/null || { echo "FAIL: /version"; exit 1; }
	@curl -sf http://localhost:8081/ | grep -q Smocker || { echo "FAIL: embedded UI not served"; exit 1; }
	@curl -sf -XPOST http://localhost:8081/mocks -H "Content-Type: application/json" \
		--data '[{"request":{"method":"GET","path":"/smoke"},"response":{"status":200,"body":"ok"}}]' >/dev/null \
		|| { echo "FAIL: register mock"; exit 1; }
	@test "$$(curl -s -o /dev/null -w '%{http_code}' http://localhost:8080/smoke)" = "200" \
		|| { echo "FAIL: mock round-trip"; exit 1; }
	@echo "docker smoke tests passed"

.PHONY: check-default-ports
check-default-ports:
	@lsof -i:8080 > /dev/null && (echo "Port 8080 already in use"; exit 1) || true
	@lsof -i:8081 > /dev/null && (echo "Port 8081 already in use"; exit 1) || true
	@lsof -i:$(PROXY_TARGET_PORT) > /dev/null && (echo "Port $(PROXY_TARGET_PORT) (go-httpbin) already in use"; exit 1) || true

.PHONY: optimize
optimize:
	find client/assets/ -iname '*.png' -print0 | xargs -0 -n1 optipng -strip all
	find docs/ -iname '*.png' -print0 | xargs -0 -n1 optipng -strip all

# The following targets are only available for CI usage

build/smocker.tar.gz: build-binaries
	# Primary release artifact: the self-contained linux/amd64 binary (UI embedded) as "smocker".
	cp $(BUILD_DIR)/smocker-linux-amd64 $(BUILD_DIR)/$(APPNAME)
	cd build/; tar -czvf smocker.tar.gz smocker

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
	# Assemble and push the multi-arch image from the pre-built binaries. No compilation and no
	# QEMU: every target stage is COPY-only (the cert stage runs on the build platform).
	docker buildx create --use
	# Smoke-test BEFORE publishing anything: build the native amd64 image locally (--load) from the
	# exact downloaded artifact — which has lost its executable bit through the GitHub artifact
	# round-trip — then run it and check it serves. Nothing is pushed unless this passes, so a
	# broken image can never reach the registry (the build job's smoke can't catch this: it builds
	# the binary locally, never from the artifact).
	docker buildx build --load --platform linux/amd64 --tag $(DOCKER_IMAGE):$(DOCKER_TAG) .
	$(MAKE) start-docker smoke-docker
	docker rm -f $(APPNAME) >/dev/null 2>&1 || true
ifdef IS_SEMVER
	docker buildx build --push --platform $(DOCKER_PLATFORMS) --tag $(DOCKER_IMAGE):latest .
endif
	docker buildx build --push --platform $(DOCKER_PLATFORMS) --tag $(DOCKER_IMAGE):$(DOCKER_TAG) .
