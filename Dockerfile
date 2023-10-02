FROM golang:1.18-alpine AS build-backend
RUN apk add --no-cache make
ARG VERSION=snapshot
ARG COMMIT
WORKDIR /go/src/github.com/Thiht/smocker
COPY go.mod go.sum ./
RUN go mod download
COPY Makefile main.go ./
COPY server/ ./server/
RUN make VERSION=$VERSION COMMIT=$COMMIT RELEASE=1 build

FROM alpine
WORKDIR /opt
EXPOSE 8080 8081
COPY build/client client/
COPY --from=build-backend /go/src/github.com/Thiht/smocker/build/* /opt/
CMD ["/opt/smocker"]
