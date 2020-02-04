# Tooling

Smocker mocks are written using simple YAML files. To simplify the writing process, we provide a [JSON Schema](https://json-schema.org/) that you can integrate with your editor of choice to benefit from real time validation and completion.

## Visual Studio Code

To integrate with [Visual Studio Code](https://code.visualstudio.com/), download the [YAML extension](https://marketplace.visualstudio.com/items?itemName=redhat.vscode-yaml).

Then, in your project, create a `.vscode/settings.json` file containing the following configuration:

```json
{
  "yaml.schemas": {
    "https://smocker.dev/smocker.schema.json": "/**/*mock*.yml"
  }
}
```

Using this configuration, the schema will be applied on every YAML file containing the word `mock` in their name.
