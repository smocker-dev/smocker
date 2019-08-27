FROM golang:buster AS build
ARG VERSION=snapshot
WORKDIR /go/src/github.com/Thiht/go-mock-server
COPY . .
RUN make version=$VERSION build

FROM debian:buster
RUN apt-get update && \
  apt-get install -y ca-certificates && \
  rm -rf /var/lib/apt/lists/*
COPY --from=build /go/src/github.com/Thiht/go-mock-server/build/go-mock-server /opt/go-mock-server
WORKDIR /opt
EXPOSE 8080 8081
CMD ["/opt/go-mock-server"]
