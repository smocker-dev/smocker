package bind

import (
	"bytes"
	"testing"

	"github.com/smocker-dev/smocker/internal/pkg/assert"
)

func TestJSON(t *testing.T) {
	t.Parallel()

	tests := map[string]struct {
		body    []byte
		want    any
		wantErr bool
	}{
		"valid JSON": {
			body: []byte(`{
				"name": "John",
				"age": 30
			}`),
			want: map[string]any{
				"name": "John",
				"age":  float64(30),
			},
		},
		"invalid JSON": {
			body: []byte(`{
				"name": "John",
				"age": 30`,
			), // Missing closing brace
			wantErr: true,
		},
	}
	for name, tt := range tests {
		t.Run(name, func(t *testing.T) {
			var got any
			assert.Err(t, JSON(bytes.NewReader(tt.body), &got), tt.wantErr)
			assert.Equal(t, tt.want, got)
		})
	}
}

func TestYAML(t *testing.T) {
	t.Parallel()

	tests := map[string]struct {
		body    []byte
		want    any
		wantErr bool
	}{
		"valid YAML": {
			body: []byte(`
name: John
age: 30
`),
			want: map[string]any{
				"name": "John",
				"age":  30,
			},
		},
		"invalid YAML": {
			body: []byte(`
name: John
	age: 30
`), // Invalid indent
			wantErr: true,
		},
	}
	for name, tt := range tests {
		t.Run(name, func(t *testing.T) {
			var got any
			assert.Err(t, YAML(bytes.NewReader(tt.body), &got), tt.wantErr)
			assert.Equal(t, tt.want, got)
		})
	}
}

func TestXML(t *testing.T) {
	t.Parallel()

	tests := map[string]struct {
		body    []byte
		want    any
		wantErr bool
	}{
		"valid XML": {
			body: []byte(`<person>
                <name>John</name>
                <age birthday="2000-01-01">30</age>
            </person>`),
			want: map[string]any{
				"person": map[string]any{
					"name": "John",
					"age": map[string]any{
						"#text":     "30",
						"@birthday": "2000-01-01",
					},
				},
			},
		},
		"invalid XML": {
			body: []byte(`<person>
                <name>John</name>
                <age>30</age>`), // Missing closing tag
			wantErr: true,
		},
	}
	for name, tt := range tests {
		t.Run(name, func(t *testing.T) {
			var got any
			assert.Err(t, XML(bytes.NewReader(tt.body), &got), tt.wantErr)
			assert.Equal(t, tt.want, got)
		})
	}
}
