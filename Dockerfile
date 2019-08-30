FROM golang:buster AS build
ARG VERSION=snapshot
WORKDIR /go/src/github.com/Thiht/smock
COPY . .
RUN make version=$VERSION build

FROM debian:buster
RUN apt-get update && \
  apt-get install -y ca-certificates && \
  rm -rf /var/lib/apt/lists/*
COPY --from=build /go/src/github.com/Thiht/smock/build/smock /opt/smock
WORKDIR /opt
EXPOSE 8080 8081
CMD ["/opt/smock"]
