# Mock Definition

::: warning Work in Progress
This page is not terminated yet.
:::

A mock must respect this format:

- Common parts

```yaml
- request:
  # A "request" defines characteristics (method, path, query parameters...)
  # that must be matched in order to return the associated response
  context:
    # A "context" (optional) defines particularities about the current mock,
    # for instance it could help you define a mock that can only be called 3 times
```

- Static response:

```yaml
- ... # common parts
  response:
    # A "response" will be returned as is when the client request matches
    # the "request" declaration
```

- Dynamic response:

```yaml
- ... # common parts
  dynamic_response:
    # A "dynamic_response" will be computed from the request made by the client
    # when it matches the "request" declaration
```

- Proxy:

```yaml
- ... # common parts
  proxy:
    # A "proxy" will redirect the call to another destination
```

## Format of `request` section

`request` has the following format:

```yaml
request:
  method: GET # optional string (HTTP verb), defaults to "GET"
  path: /foo/bar # mandatory
  query_params: # optional map of string lists
    limit: 10 # in the case of a single element array, you can omit the array!
    offset: 0
    filter: [foo, bar]
  headers: # optional map of string lists
    Content-Type: application/json # in the case of a single element array, you can omit the array!
  body: null # optional string
```

The above request will match the following request:

```sh
curl -XGET \
  --header 'Content-Type: application/json' \
  'localhost:8080/foo/bar?limit=10&offset=0&filter=foo&filter=bar'
```

Each of the fields of the request can also be defined as a matcher, in order to do dynamic matching. For example, the following request will match all the `GET` requests on the subroutes of `/foo` (`/foo/bar`, `/foo/baz`, ...):

```yaml
request:
  method: GET
  path:
    matcher: ShouldMatch
    value: /foo/.*
```

The list of the available matchers is available [Matchers page](https://github.com/Thiht/smocker/wiki/Matchers).

## Format of `context` section

`context` is optional in a mock. It has the following format:

```yaml
context:
  times: 5 # optional number, defines how many times the mock can be called
```

## Format of `response` section

`response` has the following format:

```yaml
response:
  status: 200 # optional number (HTTP status code), defaults to 200
  delay: 10s # optional duration (https://golang.org/pkg/time/#ParseDuration), defaults to 0
  headers: # optional map of string lists
    Content-Type: application/json
  body: > # optional string
    {
      "data": ["foo", "bar"]
    }
```

The response is returned as is when the request matches. Note that [YAML allows multi-line strings](https://stackoverflow.com/a/3790497), which is very useful for writing JSON bodies.

## Format of `dynamic_response` section

`dynamic_response` is a way to generate a response depending on data from the request. This is a powerful feature when used with the request matchers. Dynamic responses can be generated in two different ways:

- [Go templates](https://golang.org/pkg/text/template/)
- [Lua](https://devhints.io/lua) scripts

It has the following format:

```yaml
dynamic_response:
  engine: # mandatory string, the engine to use to generate the response
  script: # mandatory string, the script generating the response
```

### Dynamic responses using Go templates

A dynamic response using Go templates must generate a YAML string representing a `response` object. Some parts of the response can be generated dynamically. In Go templates, the [`Request`](https://godoc.org/github.com/Thiht/smocker/types#Request) variable is available, containing the values of the current request. The utility library [Masterminds/sprig](https://masterminds.github.io/sprig/) is also fully available.

The easiest way to write a dynamic response using Go templates is to first write the static response you want:

```yaml
response:
  headers:
    Content-Type: [application/json]
  body: >
    {
      "message": "request path: /foo/bar"
    }
```

and to copy it in the `script` field of a `dynamic_response`:

```yaml
dynamic_response:
  engine: go_template # mandatory string, indicates that the dynamic response must use the Go template engine
  script: > # mandatory string
    headers:
      Content-Type: [application/json]
    body: >
      {
        "message": "request path: {{.Request.Path}}"
      }
```

::: v-pre
We also replaced the static `/foo/bar` with `{{.Request.Path}}` in order to make the generated response dynamic depending on the called path.
:::

Note that the `script` is a string which must be written in YAML.

### Dynamic responses using Lua scripts

A dynamic response using Lua must generate a [Lua table](https://devhints.io/lua#lookups) representing a `response` object. In Lua scripts, the [`request`](https://godoc.org/github.com/Thiht/smocker/types#Request) variable is available, containing the values of the current request. The [`math`](http://lua-users.org/wiki/MathLibraryTutorial), [`string`](http://lua-users.org/wiki/StringLibraryTutorial), and [`table`](http://lua-users.org/wiki/TableLibraryTutorial) libraries are available.

A dynamic response using Lua scripts has the following format:

```yaml
dynamic_response:
  engine: lua
  script: >
    require "math"
    return {
      body = {
        message = "request path: "..request.path
      },
      delay = math.random(10),
      headers = {
        ["Content-Type"] = {"application/json"}
      }
    }
```

Tips:

- In associative tables, keys containing a `-` (such as `Content-Type`) must be wrapped: `{ ["Content-Type"] = ... }`
- You can write multi-line strings (for the `body` for instance) using double square braces instead of quotes: `[[ ... ]]`

## Format of `proxy` section

`proxy` is a way to redirect calls to another destination. It's a key feature, when you want to use smocker as an API gateway.
Basically, proxy mocks will be used to configure the way smocker redirect calls between your services.

It has the following format:

```yaml
proxy:
  host: # destination URL
  follow: # usefull when using smocker as an http proxy, a follow proxy will pass requests to their original destination

  # A proxy mock is either a "host" or a "follow" but cannot be both
```
