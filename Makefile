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

REFLEX=$(GOPATH)/bin/reflex
$(REFLEX):
	go get github.com/cespare/reflex

GOLANGCILINTVERSION:=1.18.0
GOLANGCILINT=$(GOPATH)/bin/golangci-lint
$(GOLANGCILINT):
	curl -fsSL https://raw.githubusercontent.com/golangci/golangci-lint/master/install.sh | sh -s -- -b $(GOPATH)/bin v$(GOLANGCILINTVERSION)

.PHONY: start
start: $(REFLEX)
	reflex --start-service \
		--decoration='none' \
		--regex='\.go$$' \
		--inverse-regex='^vendor/' \
		-- go run $(GO_LDFLAGS) cli/main.go --log-level=debug

.PHONY: build
build:
	go build $(GO_LDFLAGS) -o ./build/$(APPNAME) ./cli/...

.PHONY: clean
clean:
	rm -rf ./build

.PHONY: lint
lint: $(GOLANGCILINT)
	golangci-lint run
