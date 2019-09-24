# smocker

[![Build Status](https://travis-ci.org/Thiht/smocker.svg?branch=master)](https://travis-ci.org/Thiht/smocker)
[![GoDoc](https://godoc.org/github.com/Thiht/smocker?status.svg)](https://godoc.org/github.com/Thiht/smocker)
[![Go Report Card](https://goreportcard.com/badge/github.com/Thiht/smocker)](https://goreportcard.com/report/github.com/Thiht/smocker)
[![License](https://img.shields.io/github/license/Thiht/smocker)](./LICENSE)

smocker (server mock) is a simple and efficient HTTP mock server.

## Installation

### With Docker

```sh
docker run -d \
  --restart=always \
  -p 8080:8080 \
  -p 8081:8081 \
  --name smocker \
  thiht/smocker
```

### Healthcheck

```sh
curl localhost:8081/version
```

## Usage

smocker exposes two ports:

- `8080` is the mock server port. It will expose the routes you register through the configuration port
- `8081` is the configuration port. It's the port you will use to register new mocks

To register a mock, you can use the YAML and the JSON formats. A basic mock might look like this:

```yaml
# helloworld.yml
- request:
    path: /hello/world
    method: GET
  response:
    status: 200
    headers:
      Content-Type: [application/json]
    body: >
      {
        "hello": "Hello, World!"
      }
```

You can then register it to the configuration server with the following command:

```sh
curl -XPOST \
  --header "Content-Type: application/x-yaml" \
  --data-binary "@helloworld.yml" \
  localhost:8081/mocks
```

After your mock is registered, you can query the mock server on the specified route, so that it returns the expected response to you:

```sh
$ curl -i localhost:8080/hello/world
HTTP/1.1 200 OK
Content-Type: application/json
Date: Thu, 05 Sep 2019 15:49:32 GMT
Content-Length: 31

{
  "hello": "Hello, World!"
}
```

## Development

### Integration Test

In order to launch integrations tests, you need to open a terminal and launch smocker:

```sh
make start
```

and then open an other terminal an launch venom tests:

```sh
make test
```
