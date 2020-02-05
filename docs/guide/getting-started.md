# Getting Started

::: warning Work in Progress
This page is not terminated yet.
:::

Smocker exposes two ports:

- `8080` is the mock server port. It will expose the routes you register through the configuration port.
- `8081` is the configuration port. It's the port you will use to register new mocks. This port also exposes a user interface.

To get a better understanding of how Smocker works, let's open its user interface on the browser. With the default configuration, it will be available on [localhost:8081](http://localhost:8081/)

![Smocker's user interface - Empty History](/screenshots/screenshot-empty-history.png)

By default, Smocker shows the history of the calls made to the mock server. As we just started it, nothing is displayed yet.

Let's see how Smocker reacts when we try to call a non existing route. Run the following command in a terminal:

<details>
<summary><code>curl -i localhost:8080/hello/world</code></summary>

```
HTTP/1.1 666 status code 666
Content-Type: application/json; charset=UTF-8
Date: Wed, 29 Jan 2020 17:25:31 GMT
Content-Length: 206

{"message":"No mock found matching the request","request":{"path":"/hello/world","method":"GET","body":"","headers":{"Accept":["*/*"],"User-Agent":["curl/7.54.0"]},"date":"2020-01-29T17:25:31.956225978Z"}}
```

</details>

If you refresh Smocker's user interface, you will see:

- on the left, the request you made: method `GET`, path `/hello/world`, and curl headers,
- on the right, the response of Smocker: error code `666`, and informations on the error.

![Smocker's user interface - History with an undeclared mock response](/screenshots/screenshot-hello-world-666.png)

::: tip Note
Smocker reserves the non HTTP status codes from `600` to `699`. This is because we need an out of protocol way to report Smocker errors, which are different from the standard protocol errors.
:::

To register our first mock, we will use the user interface. Switch to the "Mocks" page and click on the "Add Mock" button.

![Smocker's user interface - Empty mocks page](/screenshots/screenshot-empty-mocks.png)

![Smocker's user interface - Add mocks](/screenshots/screenshot-add-mocks.png)

Mocks are defined using the YAML format. Register the following mock:

```yml
- request:
    method: GET
    path: /hello/world
  response:
    headers:
      Content-Type: application/json
    body: >
      {
        "hello": "Hello, World!"
      }
```

This mock simply states that when an HTTP `GET` call is made on the `/hello/world` path, the mock server must return a basic JSON document.

Now, execute the previous call one more time:

<details>
<summary><code>curl -i localhost:8080/hello/world</code></summary>

```
HTTP/1.1 200 OK
Content-Type: application/json
Date: Wed, 29 Jan 2020 17:40:52 GMT
Content-Length: 30

{
  "hello": "Hello, World!"
}
```

</details>

Once you refresh the user interface, you should notice that this last call is present in the history and that Smocker replied with the response we declared instead of an error!

![Smocker's user interface - History with an valid mock response](/screenshots/screenshot-hello-world-200.png)

This covers the basic usage of Smocker, but was just the beginning! The [Real Life Usage](./real-life.md) covers many more topics:

- Advanced filters,
- Automation,
- Dynamic calls,
- Proxies,
- Contexts,
- and everything you might need to mock your whole environment!
