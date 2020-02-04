# What is Smocker?

**Smocker** (server mock) is a simple and efficient HTTP mock server.

The goal of Smocker is to help you **mock the HTTP dependencies of your application**. It's a great tool for **integration tests automation**.

Smocker really shines in a **microservice environment with an API gateway**. On your development or test infrastructure, you just need to deploy it instead of your API gateway and have your application use it as the gateway.

<div class="row wrap around-justified">
<div class="text-center figure">

**Production environment, with an API gateway**

```mermaid
graph LR
  App([Your Application])
  M1([Microservice 1])
  M2([Microservice 2])
  M3([Microservice 3])
  GW(API Gateway)
  E[External Service]

  App --> E
  App --> GW
  GW --> M1
  GW --> M2
  GW --> M3
```

</div>
<div class="text-center figure">

**Test environment, with Smocker**

```mermaid
graph LR
  E[External Service]
  App([Your Application])
  M1([Mocked Microservice 1])
  M2([Mocked Microservice 2])
  M3([Microservice 3])
  S(Smocker)

  App --> E
  App --> S

  subgraph " "
    S --> M1
    S --> M2
  end

  S --forward request--> M3

  style S stroke:#b51629,stroke-width:3px
```

</div>
</div>

Smocker can also be used as an **HTTP proxy** through the commonly used `http_proxy` environment variable.

<div class="row wrap around-justified">
<div class="text-center figure">

**Production environment**

```mermaid
graph LR
  E[External Service]
  App([Your Application])
  M1([Microservice 1])
  M2([Microservice 2])
  M3([Microservice 3])

  App --> E
  App --> M1
  App --> M2
  App --> M3
```

</div>
<div class="text-center figure">

**Test environment, with Smocker using `http_proxy`**

```mermaid
graph LR
  App([Your Application])

  subgraph " "
    S(Smocker)
    M1([Mocked Microservice 1])
    M2([Mocked Microservice 2])
    S --> M1
    S --> M2
  end

  subgraph transparent-1
    M3([Microservice 3])
    S --forward request--> M3
  end

  subgraph transparent-2
    E[External Service]
    S --forward request--> E
  end

  App ==http_proxy==> S

  style S stroke:#b51629,stroke-width:3px
```

</div>
</div>

Smocker provides several powerful ways to setup your testing environment:

- [**Static mocks**](/technical-documentation/mock-definition.html#format-of-response-section) return a static response for a given request. It's the most basic behavior of Smocker,
- [**Dynamic mocks**](/technical-documentation/mock-definition.html#format-of-dynamic-response-section) return a response with variable parts. Dynamic mocks can be declared using [Go templates](https://golang.org/pkg/html/template/) or [Lua](https://www.lua.org/),
- [**Proxies**](/technical-documentation/mock-definition.html#format-of-proxy-section) just forward the request to an actual server, because mocking is not always suitable for testing.

Smocker also has a great **user interface** which we use extensively to write tests iteratively.

![Smocker's user interface - Mocks](/screenshots/screenshot-mocks.png)

![Smocker's user interface - History](/screenshots/screenshot-history.png)
