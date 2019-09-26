# smocker

[![Build Status](https://img.shields.io/travis/Thiht/smocker/master?logo=travis)](https://travis-ci.org/Thiht/smocker)
[![Docker Repository](https://img.shields.io/badge/docker-thiht%2Fsmocker-blue?logo=docker)](https://hub.docker.com/r/thiht/smocker)
[![Github Tag](https://img.shields.io/github/tag/Thiht/smocker.svg?logo=github)](https://github.com/Thiht/smocker/tags/)
[![Go Report Card](https://goreportcard.com/badge/github.com/Thiht/smocker)](https://goreportcard.com/report/github.com/Thiht/smocker)
[![License](https://img.shields.io/github/license/Thiht/smocker?logo=open-source-initiative)](https://github.com/Thiht/smocker/blob/master/LICENSE)

smocker (server mock) is a simple and efficient HTTP mock server.

The documentation is available on the [project's wiki](https://github.com/Thiht/smocker/wiki).

## Table of contents

- [Installation](#installation)
  - [With Docker](#with-docker)
  - [Healthcheck](#healthcheck)
- [Usage](#usage)
  - [Hello, World!](#hello-world)
- [Development](#development)
  - [Integration Tests](#integration-tests)

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

### Hello, World!

To register a mock, you can use the YAML and the JSON formats. A basic mock might look like this:

```yaml
# helloworld.yml
# This mock register two routes: GET /hello/world and GET /foo/bar
- request:
    # Note: the method could be omitted because GET is the default
    method: GET
    path: /hello/world
  response:
    # Note: the status could be omitted because 200 is the default
    status: 200
    headers:
      Content-Type: [application/json]
    body: >
      {
        "hello": "Hello, World!"
      }

- request:
    method: GET
    path: /foo/bar
  response:
    status: 204
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

To cleanup the mock server without restarting it, you can execute the following command:

```sh
curl -XPOST localhost:8081/reset
```

For more advanced usage, please read the [project's documentation](https://github.com/Thiht/smocker/wiki).

## Development

### Integration Tests

In order to launch integrations tests, you must first launch smocker:

```sh
make start
```

Then, open another terminal and launch the integration tests:

```sh
make test-integration
```
