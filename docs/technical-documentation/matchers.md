# Matchers

Matchers are a way to make the matching of requests dynamic.

The following matchers are available:

| Matcher                                                | Description            |
| ------------------------------------------------------ | ---------------------- |
| `ShouldEqual` / `ShouldNotEqual`                       | Shallow equality check |
| `ShouldResemble` / `ShouldNotResemble`                 | Deep equality check    |
| `ShouldEqualJSON`                                      | JSON equality check    |
| `ShouldContainSubstring` / `ShouldNotContainSubstring` | Contains substring     |
| `ShouldStartWith` / `ShouldNotStartWith`               | Starts with substring  |
| `ShouldEndWith` / `ShouldNotEndWith`                   | Ends with substring    |
| `ShouldMatch` / `ShouldNotMatch`                       | Regexp match           |
