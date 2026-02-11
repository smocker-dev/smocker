ARG GO_VERSION=1

FROM --platform=$BUILDPLATFORM golang:${GO_VERSION}-alpine AS builder

ARG TARGETOS
ARG TARGETARCH

ARG VERSION=snapshot
ARG COMMIT
ARG DATE

WORKDIR /go/src

ENV CGO_ENABLED=0

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN GOOS=$TARGETOS GOARCH=$TARGETARCH \
    go build -trimpath -ldflags "-s -w \
    -X main.appName=smocker \
    -X main.buildVersion=${VERSION} \
    -X main.buildCommit=${COMMIT} \
    -X main.buildDate=${DATE}" \
    -o /go/bin/smocker ./internal

FROM scratch

COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
COPY --from=builder /go/bin/smocker /usr/local/bin/smocker

EXPOSE 8080 8081
USER 1000

ENTRYPOINT ["/usr/local/bin/smocker"]
