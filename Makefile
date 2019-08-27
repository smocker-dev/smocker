APPNAME:=$(shell basename $(shell go list))
VERSION?=snapshot
COMMIT:=$(shell git rev-parse --verify HEAD)
DATE:=$(shell date +%FT%T%z)

GO_LDFLAGS+=-X main.appName=$(APPNAME)
GO_LDFLAGS+=-X main.buildVersion=$(VERSION)
GO_LDFLAGS+=-X main.buildCommit=$(COMMIT)
GO_LDFLAGS+=-X main.buildDate=$(DATE)
GO_LDFLAGS:=-ldflags="$(GO_LDFLAGS)"

REFLEX=$(GOPATH)/bin/reflex
$(REFLEX):
	go get github.com/cespare/reflex

.PHONY: start
start: $(REFLEX)
	reflex --start-service \
		--decoration='none' \
		--regex='\.go$$' \
		--inverse-regex='^vendor/' \
		-- go run $(GO_LDFLAGS) *.go

.PHONY: build
build:
	go build $(GO_LDFLAGS) -o build/$(APPNAME)

.PHONY: clean
clean:
	rm -rf ./build
