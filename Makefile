APPNAME:=$(shell basename $(shell go list))
VERSION?=snapshot
COMMIT?=$(shell git rev-parse --verify HEAD)
DATE:=$(shell date +%FT%T%z)
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

PID_FILE:=/tmp/$(APPNAME).test.pid

DOCKER_ACCOUNT:=thiht
DOCKER_IMAGE:=$(DOCKER_ACCOUNT)/$(APPNAME)

# See: https://docs.docker.com/engine/reference/commandline/tag/#extended-description
# A tag name must be valid ASCII and may contain lowercase and uppercase letters, digits, underscores, periods and dashes.
# A tag name may not start with a period or a dash and may contain a maximum of 128 characters.
DOCKER_TAG:=$(shell echo $(VERSION) | tr -cd '[:alnum:]_.-')

LEVEL=debug

SUITE=*.yml

.PHONY: default
default: start

REFLEX=$(GOPATH)/bin/reflex
$(REFLEX):
	go install github.com/cespare/reflex@latest

GOLANGCILINTVERSION:=1.32.0
GOLANGCILINT=$(GOPATH)/bin/golangci-lint
$(GOLANGCILINT):
	curl -fsSL https://raw.githubusercontent.com/golangci/golangci-lint/master/install.sh | sh -s -- -b $(GOPATH)/bin v$(GOLANGCILINTVERSION)

VENOMVERSION:=v1.0.0-rc.6
VENOM=$(GOPATH)/bin/venom
$(VENOM):
	go install github.com/ovh/venom/cmd/venom@$(VENOMVERSION)

GOCOVMERGE=$(GOPATH)/bin/gocovmerge
$(GOCOVMERGE):
	go install github.com/wadey/gocovmerge@latest

CADDY=$(GOPATH)/bin/caddy
$(CADDY):
	cd /tmp; go get github.com/caddyserver/caddy/v2/...

.PHONY: start
start: $(REFLEX)
	$(REFLEX) --start-service \
		--decoration='none' \
		--regex='\.go$$' \
		--inverse-regex='^vendor|node_modules|.cache/' \
		-- go run $(GO_LDFLAGS) main.go --log-level=$(LEVEL) --static-files ./build --persistence-directory ./sessions

.PHONY: build
build:
	go build $(GO_LDFLAGS) -o ./build/$(APPNAME)

.PHONY: lint
lint: $(GOLANGCILINT)
	$(GOLANGCILINT) run

.PHONY: format
format:
	gofmt -s -w .

.PHONY: test
test:
	mkdir -p coverage
	go test -v -race -coverprofile=coverage/test-cover.out ./server/...

.PHONY: test-integration
test-integration: $(VENOM) check-default-ports
	mkdir -p coverage
	go test -race -coverpkg="./..." -c . -o $(APPNAME).test
	SMOCKER_PERSISTENCE_DIRECTORY=./sessions ./$(APPNAME).test -test.coverprofile=coverage/test-integration-cover.out >/dev/null 2>&1 & echo $$! > $(PID_FILE)
	sleep 5
	$(VENOM) run tests/features/$(SUITE)
	kill `cat $(PID_FILE)` 2> /dev/null || true

.PHONY: start-integration
start-integration: $(VENOM)
	$(VENOM) run tests/features/$(SUITE)

coverage/test-cover.out:
	$(MAKE) test

coverage/test-integration-cover.out:
	$(MAKE) test-integration

.PHONY: coverage
coverage: $(GOCOVMERGE) coverage/test-cover.out coverage/test-integration-cover.out
	$(GOCOVMERGE) coverage/test-cover.out coverage/test-integration-cover.out > coverage/cover.out

.PHONY: clean
clean:
	rm -rf ./build ./coverage

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

# The following targets are only available for CI usage

build/smocker.tar.gz:
	$(MAKE) build
	yarn install --frozen-lockfile
	yarn build
	cd build/; tar cvf smocker.tar.gz *

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
	docker push $(DOCKER_IMAGE):latest
	docker push $(DOCKER_IMAGE):$(DOCKER_TAG)
