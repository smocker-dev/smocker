APPNAME:=$(shell basename $(shell go list))
VERSION?=snapshot
COMMIT:=$(shell git rev-parse --verify HEAD)
DATE:=$(shell date +%FT%T%z)

GOPATH?=$(shell go env GOPATH)
GO_LDFLAGS+=-X main.appName=$(APPNAME)
GO_LDFLAGS+=-X main.buildVersion=$(VERSION)
GO_LDFLAGS+=-X main.buildCommit=$(COMMIT)
GO_LDFLAGS+=-X main.buildDate=$(DATE)
GO_LDFLAGS:=-ldflags="$(GO_LDFLAGS)"

DOCKER_ACCOUNT:=thiht
DOCKER_IMAGE:=$(DOCKER_ACCOUNT)/$(APPNAME)

REFLEX=$(GOPATH)/bin/reflex
$(REFLEX):
	go get github.com/cespare/reflex

GOLANGCILINTVERSION:=1.18.0
GOLANGCILINT=$(GOPATH)/bin/golangci-lint
$(GOLANGCILINT):
	curl -fsSL https://raw.githubusercontent.com/golangci/golangci-lint/master/install.sh | sh -s -- -b $(GOPATH)/bin v$(GOLANGCILINTVERSION)

VENOM=$(GOPATH)/bin/venom
$(VENOM):
	go install github.com/ovh/venom/cli/venom

.PHONY: start
start: $(REFLEX)
	reflex --start-service \
		--decoration='none' \
		--regex='\.go$$' \
		--inverse-regex='^vendor/' \
		-- go run $(GO_LDFLAGS) main.go --log-level=debug

.PHONY: build
build:
	go build $(GO_LDFLAGS) -o ./build/$(APPNAME)

.PHONY: build-docker
build-docker:
	docker build --build-arg VERSION=$(VERSION) --tag $(DOCKER_IMAGE):latest .
	docker tag $(DOCKER_IMAGE) $(DOCKER_IMAGE):$(VERSION)

.PHONY: clean
clean:
	rm -rf ./build

.PHONY: lint
lint: $(GOLANGCILINT)
	golangci-lint run

.PHONY: test
test:
	go test ./...

.PHONY: test-integration
test-integration: $(VENOM)
	venom run tests/features/*.yml

.PHONY: deploy-docker
deploy-docker:
	docker push $(DOCKER_IMAGE):latest
	docker push $(DOCKER_IMAGE):$(VERSION)
