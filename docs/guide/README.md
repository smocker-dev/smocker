# What is Smocker?

**Smocker** (server mock) is a simple and efficient HTTP mock server.

The goal of Smocker is to help you **mock the HTTP dependencies of your application**. It's a great tool for **integration tests automation**.

Smocker really shines in a **microservice environment with an API gateway**. On your development or test infrastructure, you just need to deploy Smocker instead of your API gateway and have your application use it as the gateway.

<div class="row wrap around-justified">
<div class="text-center figure">

**Production environment, with an API gateway**

```mermaid
graph LR
  App[Your Application] --> GW[API Gateway]
  GW --> M1[Microservice 1]
  GW --> M2[Microservice 2]
  GW --> M3[Microservice 3]
```

</div>
<div class="text-center figure">

**Test environment, with Smocker**

```mermaid
graph LR
  App[Your Application] --> S

  subgraph Smocker
  S[Smocker] --> M1[Mock Microservice 1]
  S --> M2[Mock Microservice 2]
  end

  S -- Proxy --> M3[Microservice 3]

  style S stroke:#b51629,stroke-width:4px
```

</div>
</div>

Smocker provides several powerful ways to setup your testing environment:

- **Static mocks** return a static response for a given request. It's the most basic behavior of Smocker,
- **Dynamic mocks** return a response with variable parts. Dynamic mocks can be declared using [Go templates](https://golang.org/pkg/html/template/) or [Lua](https://www.lua.org/),
- **Proxies** just forward the request to an actual server, because mocking is not always suitable for testing.

Smocker also has a great **user interface** which we use extensively to write tests iteratively.

![Smocker's user interface - Mocks](/screenshot-mocks.png)

![Smocker's user interface - History](/screenshot-history.png)
