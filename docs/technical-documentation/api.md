# API

::: warning Work in Progress
This page is not terminated yet.
:::

## Reset Smocker

This method clear Smocker's mocks and history of calls.

- **Method:** `POST`
- **Route:** `:8081/reset`
- **Response:**

```json
{ "message": "Reset successful" }
```

## Add Mocks

This method add a list of mocks into Smocker.

- **Method:** `POST`
- **Route:** `:8081/mocks`
- **Query Params:**
  - `reset` => `true/false` \
    Optional param used to apply a reset on Smocker before adding mocks
- **Body Example:**

```yaml
- request:
    method: GET
    path: /hello/world
    response:
    status: 200
    headers:
      Content-Type: application/json
    body: >
      {"message": "Hello, World!"}
- request:
    method: POST
    path: /hello/world
    response:
    status: 500
    headers:
      Content-Type: application/json
    body: >
      {"message": "error"}
...
```

- **Response:**

```json
{ "message": "Mocks registered successfully" }
```

::: tip
Mocks will be added one after the other. \
Smocker stores its mocks in a **stack** and when a call comes, it will unstack them one by one to find a matching mock. \
Therefore, the **last mock** in the list will be considered by Smocker as having the **highest priority**.
:::

## Get Mocks

This method add a list of mocks into Smocker.

- **Method:** `GET`
- **Route:** `:8081/mocks`
- **Response:**

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

::: tip
The mocks will be ordered from highest to the lowest priority.
:::

## Verify Mocks

This method will that the mocks has been called the right number of times according their `context`.

- **Method:** `POST`
- **Route:** `:8081/mocks/verify`
- **Response:**

```json
{ "message": "All mocks match expectations" }
```
**or**
```json
{
    "message": "Some mocks doesn't match expectations",
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
                    "Content-Type": [
                        "application/json"
                    ]
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

This method will find the history of calls made to smoker.
For each call, the entry in history will contains: the **request**, the **response**
and if a matching mock has been found, its **ID**.

- **Method:** `GET`
- **Route:** `:8081/history`
- **Response:**

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
                "Content-Type": [
                    "application/json"
                ]
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
                "Content-Type": [
                    "application/json"
                ]
            },
            "date": "2020-02-01T03:29:08.446337+01:00"
        }
    }
]
```
