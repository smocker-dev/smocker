ARG GO_VERSION=1.22
FROM golang:${GO_VERSION}-alpine AS build-backend
RUN apk add --no-cache make
ARG VERSION=snapshot
ARG COMMIT
WORKDIR /go/src/smocker
COPY go.mod go.sum ./
RUN go mod download
COPY Makefile main.go ./
COPY server/ ./server/
RUN make VERSION=$VERSION COMMIT=$COMMIT RELEASE=1 build

FROM alpine
LABEL org.opencontainers.image.source="https://github.com/smocker-dev/smocker"
WORKDIR /opt
EXPOSE 8080 8081
COPY build/client client/
COPY --from=build-backend /go/src/smocker/build/* /opt/
CMD ["/opt/smocker"]
