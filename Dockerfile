ARG GO_VERSION=1.26
FROM golang:${GO_VERSION}-alpine AS build-backend
RUN apk add --no-cache make ca-certificates
ARG VERSION=snapshot
ARG COMMIT
WORKDIR /go/src/smocker
COPY go.mod go.sum ./
RUN go mod download
COPY Makefile main.go ./
COPY server/ ./server/
# The client is built on the host (make release); bake it into the binary via go:embed.
COPY build/client ./server/frontend/dist/
# CGO_ENABLED=0 produces a fully static binary (pure-Go net/tls), required for a scratch image.
RUN CGO_ENABLED=0 make VERSION=$VERSION COMMIT=$COMMIT RELEASE=1 build

FROM scratch
LABEL org.opencontainers.image.source="https://github.com/smocker-dev/smocker"
EXPOSE 8080 8081
# CA roots so the proxy mock type can reach HTTPS backends (scratch ships none).
COPY --from=build-backend /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/ca-certificates.crt
# The UI is embedded in the binary, so nothing else is needed — just the static binary.
COPY --from=build-backend /go/src/smocker/build/smocker /smocker
ENTRYPOINT ["/smocker"]
