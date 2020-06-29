# Arguments

Smoker can be parameterized through several arguments.

The list of existing Smocker errors is:

| Flag                      | Environment Variable              | Default  | Description                                                                                      |
| ------------------------- | --------------------------------- | :------: | ------------------------------------------------------------------------------------------------ |
| `config-listen-port`      | `SMOCKER_CONFIG_LISTEN_PORT`      | **8081** | Port exposed by Smocker's API which is used to administrate Smocker                              |
| `mock-server-listen-port` | `SMOCKER_MOCK_SERVER_LISTEN_PORT` | **8080** | Port exposed by Smocker's mock server where should be redirected your HTTP calls                 |
| `static-files`            | `SMOCKER_STATIC_FILES`            |  **.**   | The location of the static files to serve for the UI (index.html, etc.)                          |
| `log-level`               | `SMOCKER_LOG_LEVEL`               | **info** | The log level of Smocker, Values: `panic`, `fatal`, `error`, `warning`, `info`, `debug`, `trace` |
| `history-retention`       | `SMOCKER_HISTORY_RETENTION`       |  **0**   | The maximum number of calls to keep in the history by sessions (0 = infinity)                    |
| `persistence-directory`   | `SMOCKER_PERSISTENCE_DIRECTORY`   |  **""**  | If defined, the directory where the sessions will be synchronized                                |
