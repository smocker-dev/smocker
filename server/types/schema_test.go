package types

// Guards that docs/mock.schema.json stays accurate: every mock fixture under tests/data must
// validate against it, and clearly-invalid mocks must be rejected. If a type/field changes in
// server/types (and the fixtures/goldens follow), this fails until the published JSON Schema the
// docs reference is updated to match — keeping it in sync with the real mock format.

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"

	"github.com/santhosh-tekuri/jsonschema/v6"
	"gopkg.in/yaml.v3"
)

const mockSchemaPath = "../../docs/mock.schema.json"

func compileMockSchema(t *testing.T) *jsonschema.Schema {
	t.Helper()
	schemaData, err := os.ReadFile(mockSchemaPath)
	if err != nil {
		t.Fatal(err)
	}
	var schemaDoc any
	if err := json.Unmarshal(schemaData, &schemaDoc); err != nil {
		t.Fatalf("invalid JSON in %s: %v", mockSchemaPath, err)
	}
	compiler := jsonschema.NewCompiler()
	if err := compiler.AddResource("mock.schema.json", schemaDoc); err != nil {
		t.Fatal(err)
	}
	schema, err := compiler.Compile("mock.schema.json")
	if err != nil {
		t.Fatalf("compile schema: %v", err)
	}
	return schema
}

// asJSONValue parses a YAML document and re-encodes it through JSON so the instance uses
// JSON-native types (float64 numbers, map[string]any) the validator expects.
func asJSONValue(t *testing.T, raw []byte) any {
	t.Helper()
	var y any
	if err := yaml.Unmarshal(raw, &y); err != nil {
		t.Fatalf("unmarshal yaml: %v", err)
	}
	jsonBytes, err := json.Marshal(y)
	if err != nil {
		t.Fatal(err)
	}
	var instance any
	if err := json.Unmarshal(jsonBytes, &instance); err != nil {
		t.Fatal(err)
	}
	return instance
}

func TestMockFixturesMatchJSONSchema(t *testing.T) {
	schema := compileMockSchema(t)
	entries, err := os.ReadDir(dataDir) // dataDir defined in serialization_test.go
	if err != nil {
		t.Fatal(err)
	}
	for _, e := range entries {
		if e.IsDir() || filepath.Ext(e.Name()) != ".yml" {
			continue
		}
		name := e.Name()
		t.Run(name, func(t *testing.T) {
			raw, err := os.ReadFile(filepath.Join(dataDir, name))
			if err != nil {
				t.Fatal(err)
			}
			if err := schema.Validate(asJSONValue(t, raw)); err != nil {
				t.Fatalf("%s does not match docs/mock.schema.json:\n%v", name, err)
			}
		})
	}
}

func TestMockSchemaRejectsInvalidMocks(t *testing.T) {
	schema := compileMockSchema(t)
	cases := map[string]string{
		"unknown matcher":                    `[{request: {method: {matcher: DoesNotExist, value: GET}}, response: {status: 200}}]`,
		"no response/dynamic_response/proxy": `[{request: {path: /x}}]`,
		"both response and proxy":            `[{request: {path: /x}, response: {status: 200}, proxy: {host: http://x}}]`,
		"unknown top-level field":            `[{request: {path: /x}, response: {status: 200}, bogus: true}]`,
		"non-integer status":                 `[{request: {path: /x}, response: {status: "two hundred"}}]`,
		"invalid engine":                     `[{request: {path: /x}, dynamic_response: {engine: python, script: ""}}]`,
	}
	for name, doc := range cases {
		t.Run(name, func(t *testing.T) {
			if err := schema.Validate(asJSONValue(t, []byte(doc))); err == nil {
				t.Fatalf("expected the schema to reject an invalid mock (%s), but it passed", name)
			}
		})
	}
}
