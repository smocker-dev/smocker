# Errors

Smocker uses `6XX` errors to clearly split errors due to its own execution from those returned by defined mocks.

Theses errors will only occurs on mock's endpoint started on the port `8080` by default. \
It doesn't concern the [Smocker's API](/technical-documentation/api.md) which will always return standard HTTP errors.

The list of existing Smocker errors is:

| Error                                          | Description                                                                              |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `600 - Smocker internal error`                 | Error returned if a problem is encountered during the processing of requests or history  |
| `601 - Error during template engine execution` | Error returned if a problem is encountered during template engine execution              |
| `602 - Error during request redirection`       | Error returned if a problem is encountered during proxy mock redirection                 |
| `666 - No mock found`                          | Error returned if no matching mock is found among those defined in Smocker for a request |
