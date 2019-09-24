FROM golang:buster AS build
ARG VERSION=snapshot
WORKDIR /go/src/github.com/Thiht/smocker
COPY . .
RUN make version=$VERSION build

FROM debian:buster
RUN apt-get update && \
  apt-get install -y ca-certificates && \
  rm -rf /var/lib/apt/lists/*
COPY --from=build /go/src/github.com/Thiht/smocker/build/smocker /opt/smocker
WORKDIR /opt
EXPOSE 8080 8081
CMD ["/opt/smocker"]
