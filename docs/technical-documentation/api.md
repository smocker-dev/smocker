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

| Name      | Values          | Description                                                                     |
| --------- | --------------- | ------------------------------------------------------------------------------- |
| `reset`   | `true`, `false` | _Optional_ (defaults to `false`), used to reset on Smocker before adding mocks. |
| `session` |                 | _Optional_, the name of the new session to start.                               |

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

Retrieves the mocks declared into Smocker for a session (by default the last one).

- **Endpoint**: `GET /mocks`
- **Query Parameters**:

| Name      | Description                                                                                   |
| --------- | --------------------------------------------------------------------------------------------- |
| `id`      | _Optional_, the ID of the mock to retrieve.                                                   |
| `session` | _Optional_, the ID of the session to which the mock(s) belong. (**default**: last session ID) |

- **Headers**:

| Name     | Values                                   | Description                                                                           |
| -------- | ---------------------------------------- | ------------------------------------------------------------------------------------- |
| `Accept` | `application/json`, `application/x-yaml` | _Optional_ (defaults to `application/json`), the preferred mime type of the response. |

- **Errors**:

  - `404 Not Found`, if no mock with the given ID could be found.
  - `404 Not Found`, if no session match the ID passed in parameter.

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

## Get History

Retrieves the history of calls made to Smocker for a session (by default the last one).
For each call, the history entry will contains the **request**, the **response**, and if a matching mock has been found, its **ID**.

- **Endpoint**: `GET /history`
- **Query Parameters**:

| Name      | Description                                                                                   |
| --------- | --------------------------------------------------------------------------------------------- |
| `filter`  | _Optional_, a regex used to filter on the **request path** of the history entries.            |
| `session` | _Optional_, the ID of the session to which the mock(s) belong. (**default**: last session ID) |

- **Headers**:

| Name     | Values                                   | Description                                                                           |
| -------- | ---------------------------------------- | ------------------------------------------------------------------------------------- |
| `Accept` | `application/json`, `application/x-yaml` | _Optional_ (defaults to `application/json`), the preferred mime type of the response. |

- **Errors**:

  - `400 Bad Request`, if the filter is an invalid regular expression.
  - `404 Not Found`, if no session match the ID passed in parameter.

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

## Get History Summary

Retrieves a summary of the history of calls made to Smocker for a session (by default the last one). \
For each call, it will contains:

```yaml
- type: request, response or processing
- message: the request method + path + query params or the response status
- from: the caller
- to: the receiver
- date: date of the call
```

- **Endpoint**: `GET /history/summary`
- **Query Parameters**:

| Name      | Description                                                                                   |
| --------- | --------------------------------------------------------------------------------------------- |
| `session` | _Optional_, the ID of the session to which the mock(s) belong. (**default**: last session ID) |
| `src`     | _Optional_, a HTTP header used to determine source of calls. (**default**: empty)             |
| `dest`    | _Optional_, a HTTP header used to determine destination of calls. (**default**: empty)        |

- **Headers**:

| Name     | Values                                   | Description                                                                           |
| -------- | ---------------------------------------- | ------------------------------------------------------------------------------------- |
| `Accept` | `application/json`, `application/x-yaml` | _Optional_ (defaults to `application/json`), the preferred mime type of the response. |

- **Errors**:

  - `404 Not Found`, if no session match the ID passed in parameter.

- **Sample Response**:

```json
[
  {
    "type": "request",
    "message": "GET /hello/world",
    "from": "Client",
    "to": "Smocker",
    "date": "2020-06-05T03:25:04.3300161+02:00"
  },
  {
    "type": "response",
    "message": "666",
    "from": "Smocker",
    "to": "Client",
    "date": "2020-06-05T03:25:04.3304084+02:00"
  },
  {
    "type": "request",
    "message": "POST /hello/world",
    "from": "Client",
    "to": "Smocker",
    "date": "2020-06-05T03:25:09.6026761+02:00"
  },
  {
    "type": "processing",
    "message": "use response mock",
    "from": "Smocker",
    "to": "Smocker",
    "date": "2020-06-05T03:25:09.603110099+02:00"
  },
  {
    "type": "response",
    "message": "500",
    "from": "Smocker",
    "to": "Client",
    "date": "2020-06-05T03:25:09.6031101+02:00"
  },
  {
    "type": "request",
    "message": "GET /hello/world",
    "from": "Client",
    "to": "Smocker",
    "date": "2020-06-05T03:25:09.6079179+02:00"
  },
  {
    "type": "processing",
    "message": "use response mock",
    "from": "Smocker",
    "to": "Smocker",
    "date": "2020-06-05T03:25:09.608433499+02:00"
  },
  {
    "type": "response",
    "message": "200",
    "from": "Smocker",
    "to": "Client",
    "date": "2020-06-05T03:25:09.6084335+02:00"
  }
]
```

## Get Sessions

Retrieves the sessions stored into Smocker.
For each session, it will contains its **ID**, its **name**, the **mocks** declared and the **history** of the calls made during this one.

- **Endpoint**: `GET /sessions`
- **Headers**:

| Name     | Values                                   | Description                                                                           |
| -------- | ---------------------------------------- | ------------------------------------------------------------------------------------- |
| `Accept` | `application/json`, `application/x-yaml` | _Optional_ (defaults to `application/json`), the preferred mime type of the response. |

- **Sample Response**:

```json
[
  {
    "id": "1d6d264b-4d13-4e0b-a51e-e44fc80eca9f",
    "name": "",
    "date": "2020-02-12T00:04:29.5940297+01:00",
    "history": [
      {
        "mock_id": "05519745-7648-46ed-a5b0-757534e077d0",
        "request": {
          "path": "/hello/world",
          "method": "GET",
          "body": "",
          "headers": {
            "Accept": ["application/json, text/plain, */*"],
            "Connection": ["close"],
            "Host": ["localhost:8080"],
            "User-Agent": ["axios/0.19.2"]
          },
          "date": "2020-02-12T00:04:46.1526269+01:00"
        },
        "response": {
          "status": 200,
          "body": {
            "message": "Hello, World!"
          },
          "headers": {
            "Content-Type": ["application/json"]
          },
          "date": "2020-02-12T00:04:46.1532019+01:00"
        }
      },
      {
        "mock_id": "f6634848-f32f-4b89-93eb-8a3a37809350",
        "request": {
          "path": "/hello/world",
          "method": "POST",
          "body": "",
          "headers": {
            "Accept": ["application/json, text/plain, */*"],
            "Connection": ["close"],
            "Content-Length": ["0"],
            "Content-Type": ["application/x-www-form-urlencoded"],
            "Host": ["localhost:8080"],
            "User-Agent": ["axios/0.19.2"]
          },
          "date": "2020-02-12T00:04:46.1552296+01:00"
        },
        "response": {
          "status": 500,
          "body": {
            "message": "error"
          },
          "headers": {
            "Content-Type": ["application/json"]
          },
          "date": "2020-02-12T00:04:46.155561+01:00"
        }
      },
      {
        "request": {
          "path": "/hello/world",
          "method": "DELETE",
          "body": "",
          "headers": {
            "Accept": ["application/json, text/plain, */*"],
            "Connection": ["close"],
            "Host": ["localhost:8080"],
            "User-Agent": ["axios/0.19.2"]
          },
          "date": "2020-02-12T00:04:48.3166388+01:00"
        },
        "response": {
          "status": 666,
          "body": {
            "message": "No mock found matching the request",
            "request": {
              "body": "",
              "date": "2020-02-12T00:04:48.3166459+01:00",
              "headers": {
                "Accept": ["application/json, text/plain, */*"],
                "Connection": ["close"],
                "Host": ["localhost:8080"],
                "User-Agent": ["axios/0.19.2"]
              },
              "method": "DELETE",
              "path": "/hello/world"
            }
          },
          "headers": {
            "Content-Type": ["application/json; charset=UTF-8"]
          },
          "date": "2020-02-12T00:04:48.3172842+01:00"
        }
      }
    ],
    "mocks": [
      {
        "request": {
          "path": "/hello/world",
          "method": "POST"
        },
        "response": {
          "body": "{\"message\": \"error\"}\n",
          "status": 500,
          "headers": {
            "Content-Type": ["application/json"]
          }
        },
        "context": {},
        "state": {
          "id": "f6634848-f32f-4b89-93eb-8a3a37809350",
          "times_count": 1,
          "creation_date": "2020-02-12T00:04:43.3337512+01:00"
        }
      },
      {
        "request": {
          "path": "/hello/world",
          "method": "GET"
        },
        "response": {
          "body": "{\"message\": \"Hello, World!\"}\n",
          "status": 200,
          "headers": {
            "Content-Type": ["application/json"]
          }
        },
        "context": {},
        "state": {
          "id": "05519745-7648-46ed-a5b0-757534e077d0",
          "times_count": 1,
          "creation_date": "2020-02-12T00:04:43.3337425+01:00"
        }
      }
    ]
  }
]
```

## Get Sessions Summary

Retrieves a summary of the sessions stored into Smocker.
For each session, it will only contains the **ID** and the **name** of this one.

- **Endpoint**: `GET /sessions/summary`
- **Headers**:

| Name     | Values                                   | Description                                                                           |
| -------- | ---------------------------------------- | ------------------------------------------------------------------------------------- |
| `Accept` | `application/json`, `application/x-yaml` | _Optional_ (defaults to `application/json`), the preferred mime type of the response. |

- **Sample Response**:

```json
[
  {
    "id": "1d6d264b-4d13-4e0b-a51e-e44fc80eca9f",
    "name": "test1",
    "date": "2020-02-12T00:04:43.3337425+01:00"
  },
  {
    "id": "c1ac51b0-2a66-4b26-bffe-fac019cd734f",
    "name": "test2",
    "date": "2020-02-12T00:14:43.3337425+01:00"
  }
]
```

## Start Session

Starts a new session into Smocker, and returns its summary.

- **Endpoint**: `POST /sessions`
- **Query Parameters**:

| Name   | Description                                       |
| ------ | ------------------------------------------------- |
| `name` | _Optional_, the name of the new session to start. |

- **Headers**:

| Name     | Values                                   | Description                                                                           |
| -------- | ---------------------------------------- | ------------------------------------------------------------------------------------- |
| `Accept` | `application/json`, `application/x-yaml` | _Optional_ (defaults to `application/json`), the preferred mime type of the response. |

- **Sample Response**:

```json
{
  "id": "1d6d264b-4d13-4e0b-a51e-e44fc80eca9f",
  "name": "test1"
}
```

## Update Session

Updates a session's name.

- **Endpoint**: `PUT /sessions`
- **Headers**:

| Name     | Values                                   | Description                                                                           |
| -------- | ---------------------------------------- | ------------------------------------------------------------------------------------- |
| `Accept` | `application/json`, `application/x-yaml` | _Optional_ (defaults to `application/json`), the preferred mime type of the response. |

- **Errors**:

  - `404 Not Found`, if no session match the ID passed in parameter.
  - `500 Internal Server Error`, if an error occurs during the session update.

- **Sample Body**:

```json
{
  "id": "1d6d264b-4d13-4e0b-a51e-e44fc80eca9f",
  "name": "test"
}
```

- **Sample Response**:

```json
{
  "id": "1d6d264b-4d13-4e0b-a51e-e44fc80eca9f",
  "name": "test",
  "date": "2020-02-12T00:04:43.3337425+01:00"
}
```

## Verify Session

Verifies that for a session (by default the last one) the mocks have been called the right number of times according their `context` and
that there is no Smocker error in history.

- **Endpoint**: `POST /sessions/verify`
- **Query Parameters**:

| Name      | Description                                                                                   |
| --------- | --------------------------------------------------------------------------------------------- |
| `session` | _Optional_, the ID of the session to which the mock(s) belong. (**default**: last session ID) |

- **Headers**:

| Name     | Values                                   | Description                                                                           |
| -------- | ---------------------------------------- | ------------------------------------------------------------------------------------- |
| `Accept` | `application/json`, `application/x-yaml` | _Optional_ (defaults to `application/json`), the preferred mime type of the response. |

- **Errors**:

  - `404 Not Found`, if no session match the ID passed in parameter.

- **Sample Response**:

```json
{
  "mocks": {
    "verified": true,
    "all_used": true,
    "message": "All mocks match expectations"
  },
  "history": {
    "verified": true,
    "message": "History is clean"
  }
}
```

- **Sample Response**:

```json
{
  "mocks": {
    "verified": false,
    "all_used": false,
    "message": "Some mocks don't match expectations",
    "failures": [
      {
        "request": {
          "path": "/test",
          "method": "GET"
        },
        "response": {
          "body": "{\"message\": \"test2\"}\n",
          "status": 200,
          "headers": {
            "Content-Type": ["application/json"]
          }
        },
        "context": {
          "times": 1
        },
        "state": {
          "id": "6ecbd8f8-e2a7-4119-9be6-ad5ec83c58b6",
          "times_count": 2,
          "creation_date": "2020-02-26T12:11:34.713399+01:00"
        }
      },
      {
        "request": {
          "path": "/test",
          "method": "GET"
        },
        "response": {
          "body": "{\"message\": \"test\"}\n",
          "status": 200,
          "headers": {
            "Content-Type": ["application/json"]
          }
        },
        "context": {
          "times": 1
        },
        "state": {
          "id": "30266b21-77c0-48e6-b27e-5aa02d7defd8",
          "times_count": 2,
          "creation_date": "2020-02-26T12:11:34.713396+01:00"
        }
      }
    ],
    "unused": [
      {
        "request": {
          "path": "/test",
          "method": "GET"
        },
        "response": {
          "status": 200
        },
        "context": {},
        "state": {
          "id": "d9ce47d4-86b7-4cb5-b7e9-829063704cec",
          "times_count": 0,
          "creation_date": "2020-02-26T12:11:34.747289+01:00"
        }
      }
    ]
  },
  "history": {
    "verified": false,
    "message": "There are errors in the history",
    "failures": [
      {
        "request": {
          "path": "/test",
          "method": "GET",
          "body": "",
          "headers": {
            "Accept-Encoding": ["gzip"],
            "Host": ["localhost:8080"],
            "User-Agent": ["Go-http-client/1.1"]
          },
          "date": "2020-02-26T12:11:34.737809+01:00"
        },
        "response": {
          "status": 666,
          "body": {
            "message": "Matching mock found but was exceeded",
            "nearest": [
              {
                "context": {
                  "times": 1
                },
                "request": {
                  "method": "GET",
                  "path": "/test"
                },
                "response": {
                  "body": "{\"message\": \"test2\"}\n",
                  "headers": {
                    "Content-Type": ["application/json"]
                  },
                  "status": 200
                },
                "state": {
                  "creation_date": "2020-02-26T12:11:34.713399+01:00",
                  "id": "6ecbd8f8-e2a7-4119-9be6-ad5ec83c58b6",
                  "times_count": 2
                }
              },
              {
                "context": {
                  "times": 1
                },
                "request": {
                  "method": "GET",
                  "path": "/test"
                },
                "response": {
                  "body": "{\"message\": \"test\"}\n",
                  "headers": {
                    "Content-Type": ["application/json"]
                  },
                  "status": 200
                },
                "state": {
                  "creation_date": "2020-02-26T12:11:34.713396+01:00",
                  "id": "30266b21-77c0-48e6-b27e-5aa02d7defd8",
                  "times_count": 2
                }
              }
            ],
            "request": {
              "body": "",
              "date": "2020-02-26T12:11:34.737814+01:00",
              "headers": {
                "Accept-Encoding": ["gzip"],
                "Host": ["localhost:8080"],
                "User-Agent": ["Go-http-client/1.1"]
              },
              "method": "GET",
              "path": "/test"
            }
          },
          "headers": {
            "Content-Type": ["application/json; charset=UTF-8"]
          },
          "date": "2020-02-26T12:11:34.738625+01:00"
        }
      }
    ]
  }
}
```

## Import Sessions

Allows you to import a list of sessions fetched from another Smocker instance.
It should be useful for analyzing into your local instance, the sessions generated during a CI execution.

- **Endpoint**: `POST /sessions/import`
- **Headers**:

| Name     | Values                                   | Description                                                                           |
| -------- | ---------------------------------------- | ------------------------------------------------------------------------------------- |
| `Accept` | `application/json`, `application/x-yaml` | _Optional_ (defaults to `application/json`), the preferred mime type of the response. |

- **Errors**:

  - `400 Bad Request`, if sessions are invalid.

- **Sample Body**:

```json
[
  {
    "id": "1d6d264b-4d13-4e0b-a51e-e44fc80eca9f",
    "name": "test",
    "date": "2020-02-12T00:04:29.5940297+01:00",
    "history": [
      {
        "mock_id": "05519745-7648-46ed-a5b0-757534e077d0",
        "request": {
          "path": "/hello/world",
          "method": "GET",
          "body": "",
          "headers": {
            "Accept": ["application/json, text/plain, */*"],
            "Connection": ["close"],
            "Host": ["localhost:8080"],
            "User-Agent": ["axios/0.19.2"]
          },
          "date": "2020-02-12T00:04:46.1526269+01:00"
        },
        "response": {
          "status": 200,
          "body": {
            "message": "Hello, World!"
          },
          "headers": {
            "Content-Type": ["application/json"]
          },
          "date": "2020-02-12T00:04:46.1532019+01:00"
        }
      },
      {
        "mock_id": "f6634848-f32f-4b89-93eb-8a3a37809350",
        "request": {
          "path": "/hello/world",
          "method": "POST",
          "body": "",
          "headers": {
            "Accept": ["application/json, text/plain, */*"],
            "Connection": ["close"],
            "Content-Length": ["0"],
            "Content-Type": ["application/x-www-form-urlencoded"],
            "Host": ["localhost:8080"],
            "User-Agent": ["axios/0.19.2"]
          },
          "date": "2020-02-12T00:04:46.1552296+01:00"
        },
        "response": {
          "status": 500,
          "body": {
            "message": "error"
          },
          "headers": {
            "Content-Type": ["application/json"]
          },
          "date": "2020-02-12T00:04:46.155561+01:00"
        }
      },
      {
        "request": {
          "path": "/hello/world",
          "method": "DELETE",
          "body": "",
          "headers": {
            "Accept": ["application/json, text/plain, */*"],
            "Connection": ["close"],
            "Host": ["localhost:8080"],
            "User-Agent": ["axios/0.19.2"]
          },
          "date": "2020-02-12T00:04:48.3166388+01:00"
        },
        "response": {
          "status": 666,
          "body": {
            "message": "No mock found matching the request",
            "request": {
              "body": "",
              "date": "2020-02-12T00:04:48.3166459+01:00",
              "headers": {
                "Accept": ["application/json, text/plain, */*"],
                "Connection": ["close"],
                "Host": ["localhost:8080"],
                "User-Agent": ["axios/0.19.2"]
              },
              "method": "DELETE",
              "path": "/hello/world"
            }
          },
          "headers": {
            "Content-Type": ["application/json; charset=UTF-8"]
          },
          "date": "2020-02-12T00:04:48.3172842+01:00"
        }
      }
    ],
    "mocks": [
      {
        "request": {
          "path": "/hello/world",
          "method": "POST"
        },
        "response": {
          "body": "{\"message\": \"error\"}\n",
          "status": 500,
          "headers": {
            "Content-Type": ["application/json"]
          }
        },
        "context": {},
        "state": {
          "id": "f6634848-f32f-4b89-93eb-8a3a37809350",
          "times_count": 1,
          "creation_date": "2020-02-12T00:04:43.3337512+01:00"
        }
      },
      {
        "request": {
          "path": "/hello/world",
          "method": "GET"
        },
        "response": {
          "body": "{\"message\": \"Hello, World!\"}\n",
          "status": 200,
          "headers": {
            "Content-Type": ["application/json"]
          }
        },
        "context": {},
        "state": {
          "id": "05519745-7648-46ed-a5b0-757534e077d0",
          "times_count": 1,
          "creation_date": "2020-02-12T00:04:43.3337425+01:00"
        }
      }
    ]
  }
]
```

- **Sample Response**:

```json
[
  {
    "id": "1d6d264b-4d13-4e0b-a51e-e44fc80eca9f",
    "name": "test",
    "date": "2020-02-12T00:04:29.5940297+01:00"
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
