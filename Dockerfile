FROM golang:1.13-alpine AS build
ARG VERSION=snapshot
WORKDIR /go/src/github.com/Thiht/smocker
COPY . .
RUN apk add git make && \
  make VERSION=$VERSION build

FROM alpine
COPY --from=build /go/src/github.com/Thiht/smocker/build/smocker /opt/smocker
WORKDIR /opt
EXPOSE 8080 8081
CMD ["/opt/smocker"]
