# API

Smocker's API is started on the port `8081` by default. This page lists all the administration endpoints of the server.

## Reset Smocker

Clear the mocks and the history of calls.

- **Endpoint**: `POST /reset`
- **Sample Response**:

```json
{
  "message": "Reset successful"
}
```

## Add Mocks

- **Endpoint**: `POST /mocks`
- **Query Parameters**:

| Name    | Values          | Description                                                                     |
| ------- | --------------- | ------------------------------------------------------------------------------- |
| `reset` | `true`, `false` | _Optional_ (defaults to `false`), used to reset on Smocker before adding mocks. |

- **Headers**:

| Name           | Values                                   | Description                                                                  |
| -------------- | ---------------------------------------- | ---------------------------------------------------------------------------- |
| `Content-Type` | `application/json`, `application/x-yaml` | _Optional_ (defaults to `application/x-yaml`), the mime type of the payload. |

- **Errors**:
  - `400 Bad Request`, if the payload cannot be parsed accordingly to the declared `Content-Type`,
  - `400 Bad Request`, if the payload contains semantically invalid mocks,
  - `415 Unsupported Media Type`, if the declared `Content-Type` is not supported.
- **Sample Body**:

```yaml
- request:
    method: GET
    path: /hello/world
  response:
    status: 200
    headers:
      Content-Type: application/json
    body: >
      {
        "message": "Hello, World!"
      }

- request:
    method: POST
    path: /hello/world
  response:
    status: 500
    headers:
      Content-Type: application/json
    body: >
      {
        "message": "error"
      }
```

- **Sample Response**:

```json
{
  "message": "Mocks registered successfully"
}
```

::: tip Note
Mocks will be added one after the other. \
Smocker stores its mocks in a **stack** and when a call comes, it will unstack them one by one to find a matching mock. \
Therefore, the **last mock** in the list will be considered by Smocker as having the **highest priority**.
:::

## Get Mocks

- **Endpoint**: `GET /mocks`
- **Query Parameters**:

| Name | Description                                 |
| ---- | ------------------------------------------- |
| `id` | _Optional_, the ID of the mock to retrieve. |

- **Headers**:

| Name     | Values                                   | Description                                                                           |
| -------- | ---------------------------------------- | ------------------------------------------------------------------------------------- |
| `Accept` | `application/json`, `application/x-yaml` | _Optional_ (defaults to `application/json`), the preferred mime type of the response. |

- **Errors**:
  - `404 Not Found`, if no mock with the given ID could be found.
- **Sample Response**:

```json
[
  {
    "request": {
      "method": "POST",
      "path": "/hello/world"
    },
    "response": {
      "status": 500,
      "headers": {
        "Content-Type": "application/json"
      },
      "body": "{\"message\": \"error\"}"
    },
    "context": {},
    "state": {
      "id": "b26ec829-1989-4c98-bbf7-f64b70c1a583",
      "times_count": 2,
      "creation_date": "2020-02-01T03:47:48.911213+01:00"
    }
  },
  {
    "request": {
      "method": "GET",
      "path": "/hello/world"
    },
    "response": {
      "status": 200,
      "headers": {
        "Content-Type": "application/json"
      },
      "body": "{\"message\": \"Hello, World!\"}"
    },
    "context": {
      "times": 1
    },
    "state": {
      "id": "ffa3cd8d-779b-4814-9cb0-13b4717d987f",
      "times_count": 1,
      "creation_date": "2020-02-01T03:47:48.911211+01:00"
    }
  }
]
```

::: tip Note
The mocks will be ordered from highest to lowest priority.
:::

## Verify Mocks

Verify that the mocks have been called the right number of times according their `context`.

- **Endpoint**: `POST /mocks/verify`
- **Headers**:

| Name     | Values                                   | Description                                                                           |
| -------- | ---------------------------------------- | ------------------------------------------------------------------------------------- |
| `Accept` | `application/json`, `application/x-yaml` | _Optional_ (defaults to `application/json`), the preferred mime type of the response. |

- **Sample Response**:

```json
{
  "message": "All mocks match expectations"
}
```

- **Sample Response**:

```json
{
  "message": "Some mocks don't match expectations",
  "mocks": [
    {
      "request": {
        "path": "/test",
        "method": "GET"
      },
      "response": {
        "body": "{\"message\": \"test\"}",
        "status": 200,
        "headers": {
          "Content-Type": ["application/json"]
        }
      },
      "context": {
        "times": 1
      },
      "state": {
        "id": "9532f001-86d4-4962-ae3d-8e2786aca243",
        "times_count": 2,
        "creation_date": "2020-02-01T03:47:48.911207+01:00"
      }
    }
  ]
}
```

## Get History

Retrieve the history of calls made to smoker.
For each call, the history entry will contain the **request**, the **response**, and if a matching mock has been found, its **ID**.

- **Endpoint**: `GET /history`
- **Query Parameters**:

| Name     | Description                                                                        |
| -------- | ---------------------------------------------------------------------------------- |
| `filter` | _Optional_, a regex used to filter on the **request path** of the history entries. |

- **Headers**:

| Name     | Values                                   | Description                                                                           |
| -------- | ---------------------------------------- | ------------------------------------------------------------------------------------- |
| `Accept` | `application/json`, `application/x-yaml` | _Optional_ (defaults to `application/json`), the preferred mime type of the response. |

- **Errors**:
  - `400 Bad Request`, if the filter is an invalid regular expression.
- **Sample Response**:

```json
[
  {
    "mock_id": "b95e93a1-7eeb-41a9-8cc2-0ff7dae588a2",
    "request": {
      "path": "/test",
      "method": "GET",
      "body": "",
      "date": "2020-02-01T03:29:08.440521+01:00"
    },
    "response": {
      "status": 200,
      "body": {
        "message": "test1"
      },
      "headers": {
        "Content-Type": ["application/json"]
      },
      "date": "2020-02-01T03:29:08.440853+01:00"
    }
  },
  {
    "mock_id": "53a87695-6303-49ff-ae1c-b7b7591e3f3e",
    "request": {
      "path": "/test",
      "method": "POST",
      "body": "",
      "date": "2020-02-01T03:29:08.445801+01:00"
    },
    "response": {
      "status": 200,
      "body": {
        "message": "test2"
      },
      "headers": {
        "Content-Type": ["application/json"]
      },
      "date": "2020-02-01T03:29:08.446337+01:00"
    }
  }
]
```

## Healthcheck

Check that Smocker is up and running. The version data of the currently deployed instance are also returned.

- **Endpoint**: `GET /version`
- **Sample Response**:

```json
{
  "app_name": "smocker",
  "build_version": "0.4.0",
  "build_commit": "b12ba66b13b9719b29afc58e6f1953367b78ecfd",
  "build_date": "2019-11-27T10:38:53+0000"
}
```
