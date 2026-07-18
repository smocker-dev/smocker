ARG GO_VERSION=1.26
FROM golang:${GO_VERSION}-alpine AS build-backend
RUN apk add --no-cache make
ARG VERSION=snapshot
ARG COMMIT
WORKDIR /go/src/smocker
COPY go.mod go.sum ./
RUN go mod download
COPY Makefile main.go ./
COPY server/ ./server/
# The client is built on the host (make release); bake it into the binary via go:embed.
COPY build/client ./server/frontend/dist/
RUN make VERSION=$VERSION COMMIT=$COMMIT RELEASE=1 build

FROM alpine
LABEL org.opencontainers.image.source="https://github.com/smocker-dev/smocker"
WORKDIR /opt
EXPOSE 8080 8081
# The UI is embedded in the binary, so no client directory is copied here.
COPY --from=build-backend /go/src/smocker/build/* /opt/
CMD ["/opt/smocker"]
