# Mock Definition

Mocks are written mainly using YAML.

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
  # string matcher
  method: PUT

  # string matcher
  path: /foo/bar

  # multi map matcher
  query_params:
    limit: 10
    offset: 0
    filter: [foo, bar]

  # multi map matcher
  headers:
    Content-Type: application/json

  # string matcher
  body:
    matcher: ShouldEqualJSON
    value: >
      {
        "hello": "world"
      }
```

The above request will match the following request:

```sh
curl -XPUT \
  --header 'Content-Type: application/json' \
  --data '{ "hello": "world" }'
  'localhost:8080/foo/bar?limit=10&offset=0&filter=foo&filter=bar'
```

As described above a `request` is an object composed of _matchers_ to apply on different fields of an HTTP request, such as the method, the path, the headers, etc.

Matchers are used to apply a predicate on a field. The most basic example of matcher is `ShouldEqual` which is used to compare a field to a text. Smocker defines two types of matchers: **string matchers** and **multi map matchers**.

---

**String Matchers** are used with the basic type `string`. With the example of a field `method`, a string matcher could be declared as follows:

```yaml
method:
  matcher: ShouldEqual
  value: GET
```

Note that for convenience purposes the `ShouldEqual` matcher can be simplified as just:

```yaml
method: GET
```

Another example using the `ShouldMatch` operator to match the methods `PUT` and `POST` could look like this:

```yaml
method:
  matcher: ShouldMatch
  value: (PUT|POST) # This is a regular expression
```

---

**Multi Map Matchers** are used with the complex type `map[string][]string` (map of strings). This complex type is used with query parameters and headers. This is because they can be declared multiple times. For example, the query string `?key=foo&key=bar&key=baz` is valid and would be represented as:

```yaml
query_params:
  key: [foo, bar, baz]
```

They have the following format:

```yaml
query_params:
  key1: foo
  key2: [foo, bar]
  key3:
    - matcher: ShouldMatch
      value: foo.*bar
  key4:
    - foo
    - matcher: ShouldMatch
      value: bar.*
    - matcher: ShouldContainSubstring
      value:  baz
```

---

The whole list of available matchers is:

| Matcher                                                | Description            |
| ------------------------------------------------------ | ---------------------- |
| `ShouldEqual` / `ShouldNotEqual`                       | Shallow equality check |
| `ShouldResemble` / `ShouldNotResemble`                 | Deep equality check    |
| `ShouldEqualJSON`                                      | JSON equality check    |
| `ShouldContainSubstring` / `ShouldNotContainSubstring` | Contains substring     |
| `ShouldStartWith` / `ShouldNotStartWith`               | Starts with substring  |
| `ShouldEndWith` / `ShouldNotEndWith`                   | Ends with substring    |
| `ShouldMatch` / `ShouldNotMatch`                       | Regexp match           |

---

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

`proxy` is a way to redirect calls to another destination. It's a key feature, when you want to use Smocker as an API gateway.
Basically, proxy mocks will be used to configure the way Smocker redirect calls between your services.

It has the following format:

```yaml
proxy:
  host: # destination host
```
