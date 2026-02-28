package types_test

import (
	"encoding/json"
	"testing"

	"github.com/goccy/go-yaml"
	"github.com/smocker-dev/smocker/internal/pkg/assert"
	"github.com/smocker-dev/smocker/internal/pkg/operators"
	"github.com/smocker-dev/smocker/internal/types"
)

func TestStringMatcher_Match(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name    string
		matcher types.StringMatcher
		value   string
		want    bool
	}{
		{
			name: "eq - success",
			matcher: types.StringMatcher{
				Matcher: operators.OperatorEquals,
				Value:   "foo",
			},
			value: "foo",
			want:  true,
		},
		{
			name: "eq - failure",
			matcher: types.StringMatcher{
				Matcher: operators.OperatorEquals,
				Value:   "foo",
			},
			value: "bar",
			want:  false,
		},
		{
			name: "invalid matcher",
			matcher: types.StringMatcher{
				Matcher: operators.Operator("InvalidMatcher"),
				Value:   "foo",
			},
			value: "foo",
			want:  false,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := tt.matcher.Match(tt.value)
			assert.Equal(t, tt.want, got)
		})
	}
}

func TestStringMatcher_UnmarshalJSON(t *testing.T) {
	t.Parallel()

	tests := map[string]struct {
		input   string
		want    types.StringMatcher
		wantErr string
	}{
		"simple string value": {
			input: `"foo"`,
			want: types.StringMatcher{
				Matcher: operators.OperatorEquals,
				Value:   "foo",
			},
		},
		"object with matcher and value": {
			input: `{
				"matcher": "match",
				"value": "bar"
			}`,
			want: types.StringMatcher{
				Matcher: operators.OperatorMatchesRegexp,
				Value:   "bar",
			},
		},
		"object with invalid matcher": {
			input: `{
				"matcher": "InvalidMatcher",
				"value": "baz"
			}`,
			wantErr: "invalid matcher",
		},
		"malformed matcher object": {
			input: `{
				"matcher": true
			}`,
			wantErr: "failed to unmarshal string matcher",
		},
	}
	for name, tt := range tests {
		t.Run(name, func(t *testing.T) {
			var m types.StringMatcher
			assert.Err(t, json.Unmarshal([]byte(tt.input), &m), tt.wantErr)
			if tt.wantErr == "" {
				assert.Equal(t, tt.want, m)
			}
		})
	}
}

func TestStringMatcher_UnmarshalYAML(t *testing.T) {
	t.Parallel()

	tests := map[string]struct {
		input   string
		want    types.StringMatcher
		wantErr string
	}{
		"simple string value": {
			input: "foo",
			want: types.StringMatcher{
				Matcher: operators.OperatorEquals,
				Value:   "foo",
			},
		},
		"object with matcher and value": {
			input: `
matcher: match
value: bar
`,
			want: types.StringMatcher{
				Matcher: operators.OperatorMatchesRegexp,
				Value:   "bar",
			},
		},
		"object with invalid matcher": {
			input: `
matcher: InvalidMatcher
value: baz
`,
			wantErr: "invalid matcher",
		},
		"malformed matcher object": {
			input: `
matcher:
  foo: bar
`,
			wantErr: "failed to unmarshal string matcher",
		},
	}
	for name, tt := range tests {
		t.Run(name, func(t *testing.T) {
			var m types.StringMatcher
			assert.Err(t, yaml.Unmarshal([]byte(tt.input), &m), tt.wantErr)
			if tt.wantErr == "" {
				assert.Equal(t, tt.want.Matcher, m.Matcher)
				assert.Equal(t, tt.want.Value, m.Value)
			}
		})
	}
}

func TestStringMatchers_Match(t *testing.T) {
	t.Parallel()

	tests := map[string]struct {
		matchers types.StringMatchers
		values   []string
		want     bool
	}{
		"single matcher - success": {
			matchers: types.StringMatchers{
				{
					Matcher: operators.OperatorEquals,
					Value:   "foo",
				},
			},
			values: []string{"foo", "bar"},
			want:   true,
		},
		"single matcher - failure": {
			matchers: types.StringMatchers{
				{
					Matcher: operators.OperatorEquals,
					Value:   "foo",
				},
			},
			values: []string{"bar"},
			want:   false,
		},
		"multiple matchers - all match different values": {
			matchers: types.StringMatchers{
				{
					Matcher: operators.OperatorEquals,
					Value:   "foo",
				},
				{
					Matcher: operators.OperatorMatchesRegexp,
					Value:   "^b.*r$",
				},
			},
			values: []string{"bar", "foo"},
			want:   true,
		},
		"multiple matchers - all match the same value": {
			matchers: types.StringMatchers{
				{
					Matcher: operators.OperatorEquals,
					Value:   "foo",
				},
				{
					Matcher: operators.OperatorMatchesRegexp,
					Value:   "^fo+$",
				},
			},
			values: []string{"bar", "foo"},
			want:   true,
		},
	}
	for name, tt := range tests {
		t.Run(name, func(t *testing.T) {
			got := tt.matchers.Match(tt.values)
			assert.Equal(t, tt.want, got)
		})
	}
}

func TestStringMatchers_UnmarshalJSON(t *testing.T) {
	t.Parallel()

	tests := map[string]struct {
		input   string
		want    types.StringMatchers
		wantErr string
	}{
		"simple string value": {
			input: `"foo"`,
			want: types.StringMatchers{
				{
					Matcher: operators.OperatorEquals,
					Value:   "foo",
				},
			},
		},
		"single matcher object": {
			input: `{
				"matcher": "match",
				"value": "bar"
			}`,
			want: types.StringMatchers{
				{
					Matcher: operators.OperatorMatchesRegexp,
					Value:   "bar",
				},
			},
		},
		"array of matcher objects": {
			input: `[
				{
					"matcher": "eq",
					"value": "foo"
				},
				{
					"matcher": "eq",
					"value": "bar"
				}
			]`,
			want: types.StringMatchers{
				{
					Matcher: operators.OperatorEquals,
					Value:   "foo",
				},
				{
					Matcher: operators.OperatorEquals,
					Value:   "bar",
				},
			},
		},
		"invalid matcher in object": {
			input: `{
				"matcher": "InvalidMatcher",
				"value": "baz"
			}`,
			wantErr: "invalid matcher",
		},
		"invalid matcher in array": {
			input: `[
				{
					"matcher": "eq",
					"value": "foo"
				},
				{
					"matcher": "InvalidMatcher",
					"value": "baz"
				}
			]`,
			wantErr: "invalid matcher",
		},
	}

	for name, tt := range tests {
		t.Run(name, func(t *testing.T) {
			var m types.StringMatchers
			assert.Err(t, json.Unmarshal([]byte(tt.input), &m), tt.wantErr)
			if tt.wantErr == "" {
				assert.Equal(t, tt.want, m)
			}
		})
	}
}

func TestStringMatchers_UnmarshalYAML(t *testing.T) {
	t.Parallel()

	tests := map[string]struct {
		input   string
		want    types.StringMatchers
		wantErr string
	}{
		"simple string value": {
			input: "foo",
			want: types.StringMatchers{
				{
					Matcher: operators.OperatorEquals,
					Value:   "foo",
				},
			},
		},
		"single matcher object": {
			input: `
matcher: match
value: bar
`,
			want: types.StringMatchers{
				{
					Matcher: operators.OperatorMatchesRegexp,
					Value:   "bar",
				},
			},
		},
		"array of matcher objects": {
			input: `
- matcher: eq
  value: foo
- matcher: eq
  value: bar
`,
			want: types.StringMatchers{
				{
					Matcher: operators.OperatorEquals,
					Value:   "foo",
				},
				{
					Matcher: operators.OperatorEquals,
					Value:   "bar",
				},
			},
		},
		"invalid matcher in object": {
			input: `
matcher: InvalidMatcher
value: baz
`,
			wantErr: "invalid matcher",
		},
		"invalid matcher in array": {
			input: `
- matcher: eq
  value: foo
- matcher: InvalidMatcher
  value: baz
`,
			wantErr: "invalid matcher",
		},
		"malformed matcher object": {
			input: `
matcher:
  foo: bar
`,
			wantErr: "failed to unmarshal string matcher",
		},
	}
	for name, tt := range tests {
		t.Run(name, func(t *testing.T) {
			var m types.StringMatchers
			assert.Err(t, yaml.Unmarshal([]byte(tt.input), &m), tt.wantErr)
			if tt.wantErr == "" {
				assert.Equal(t, tt.want, m)
			}
		})
	}
}

func TestKeyValueMatcher_Match(t *testing.T) {
	t.Parallel()

	tests := map[string]struct {
		matcher types.KeyValueMatcher
		values  map[string][]string
		want    bool
	}{
		"single key-value match": {
			matcher: types.KeyValueMatcher{
				"foo": types.StringMatchers{
					{
						Matcher: operators.OperatorEquals,
						Value:   "bar",
					},
				},
			},
			values: map[string][]string{"foo": {"bar"}},
			want:   true,
		},
		"multiple keys match": {
			matcher: types.KeyValueMatcher{
				"foo": types.StringMatchers{
					{
						Matcher: operators.OperatorEquals,
						Value:   "bar",
					},
					{
						Matcher: operators.OperatorMatchesRegexp,
						Value:   "^b.*$",
					},
				},
				"baz": types.StringMatchers{
					{
						Matcher: operators.OperatorEquals,
						Value:   "qux",
					},
				},
			},
			values: map[string][]string{"foo": {"bar"}, "baz": {"qux"}},
			want:   true,
		},
		"key mismatch": {
			matcher: types.KeyValueMatcher{
				"foo": types.StringMatchers{
					{
						Matcher: operators.OperatorEquals,
						Value:   "bar",
					},
				},
			},
			values: map[string][]string{"foo": {"qux"}},
			want:   false,
		},
		"nonexistent key": {
			matcher: types.KeyValueMatcher{
				"foo": types.StringMatchers{
					{
						Matcher: operators.OperatorEquals,
						Value:   "bar",
					},
				},
			},
			values: map[string][]string{"baz": {"qux"}},
			want:   false,
		},
		"more matchers than keys": {
			matcher: types.KeyValueMatcher{
				"foo": types.StringMatchers{
					{
						Matcher: operators.OperatorEquals,
						Value:   "bar",
					},
				},
				"baz": types.StringMatchers{
					{
						Matcher: operators.OperatorEquals,
						Value:   "qux",
					},
				},
			},
			values: map[string][]string{"foo": {"bar"}},
			want:   false,
		},
	}
	for name, tt := range tests {
		t.Run(name, func(t *testing.T) {
			got := tt.matcher.Match(tt.values)
			assert.Equal(t, tt.want, got)
		})
	}
}

func TestBodyMatcher_Match(t *testing.T) {
	t.Parallel()

	tests := map[string]struct {
		matcher    types.BodyMatcher
		rawBody    string
		parsedBody any
		want       bool
	}{
		"match raw body": {
			matcher: types.BodyMatcher{
				Body: &types.StringMatcher{
					Matcher: operators.OperatorEquals,
					Value:   "hello",
				},
			},
			rawBody: "hello",
			want:    true,
		},
		"does not match raw body": {
			matcher: types.BodyMatcher{
				Body: &types.StringMatcher{
					Matcher: operators.OperatorEquals,
					Value:   "hello",
				},
			},
			rawBody: "world",
			want:    false,
		},
		"match simple field": {
			matcher: types.BodyMatcher{
				BodyFields: types.KeyValueMatcher{
					"foo.bar": types.StringMatchers{
						{Matcher: operators.OperatorEquals, Value: "baz"},
					},
				},
			},
			parsedBody: map[string]any{"foo": map[string]any{"bar": "baz"}},
			want:       true,
		},
		"does not match field": {
			matcher: types.BodyMatcher{
				BodyFields: types.KeyValueMatcher{
					"foo.bar": types.StringMatchers{
						{Matcher: operators.OperatorEquals, Value: "baz"},
					},
				},
			},
			parsedBody: map[string]any{"foo": map[string]any{"bar": "qux"}},
			want:       false,
		},
		"missing field": {
			matcher: types.BodyMatcher{
				BodyFields: types.KeyValueMatcher{
					"foo.bar": types.StringMatchers{
						{Matcher: operators.OperatorEquals, Value: "baz"},
					},
				},
			},
			parsedBody: map[string]any{"foo": "baz"},
			want:       false,
		},
		"multiple fields all match": {
			matcher: types.BodyMatcher{
				BodyFields: types.KeyValueMatcher{
					"foo": types.StringMatchers{
						{Matcher: operators.OperatorEquals, Value: "bar"},
					},
					"baz": types.StringMatchers{
						{Matcher: operators.OperatorEquals, Value: "qux"},
					},
				},
			},
			parsedBody: map[string]any{"foo": "bar", "baz": "qux"},
			want:       true,
		},
		"one field does not match": {
			matcher: types.BodyMatcher{
				BodyFields: types.KeyValueMatcher{
					"foo": types.StringMatchers{
						{Matcher: operators.OperatorEquals, Value: "bar"},
					},
					"baz": types.StringMatchers{
						{Matcher: operators.OperatorEquals, Value: "qux"},
					},
				},
			},
			parsedBody: map[string]any{"foo": "bar", "baz": "nope"},
			want:       false,
		},
		"selector parse error": {
			matcher: types.BodyMatcher{
				BodyFields: types.KeyValueMatcher{
					"field[0": types.StringMatchers{
						{Matcher: operators.OperatorEquals, Value: "bar"},
					},
				},
			},
			parsedBody: map[string]any{"field": []string{"bar"}},
			want:       false,
		},
		"non-string value": {
			matcher: types.BodyMatcher{
				BodyFields: types.KeyValueMatcher{
					"foo": types.StringMatchers{
						{Matcher: operators.OperatorEquals, Value: "42"},
					},
				},
			},
			parsedBody: map[string]any{"foo": 42},
			want:       true,
		},
	}
	for name, tt := range tests {
		t.Run(name, func(t *testing.T) {
			got := tt.matcher.Match(tt.rawBody, tt.parsedBody)
			assert.Equal(t, tt.want, got)
		})
	}
}

func TestBodyMatcher_UnmarshalJSON(t *testing.T) {
	t.Parallel()

	tests := map[string]struct {
		input   string
		want    types.BodyMatcher
		wantErr string
	}{
		"simple string matcher": {
			input: `"foo"`,
			want: types.BodyMatcher{
				Body: &types.StringMatcher{
					Matcher: operators.OperatorEquals,
					Value:   "foo",
				},
			},
		},
		"object string matcher": {
			input: `{
				"matcher": "match",
				"value": "bar"
			}`,
			want: types.BodyMatcher{
				Body: &types.StringMatcher{
					Matcher: operators.OperatorMatchesRegexp,
					Value:   "bar",
				},
			},
		},
		"key-value matcher": {
			input: `{
				"field1": "foo",
				"field2": {
					"matcher": "eq",
					"value": "bar"
				}
			}`,
			want: types.BodyMatcher{
				BodyFields: types.KeyValueMatcher{
					"field1": types.StringMatchers{
						{
							Matcher: operators.OperatorEquals,
							Value:   "foo",
						},
					},
					"field2": types.StringMatchers{
						{
							Matcher: operators.OperatorEquals,
							Value:   "bar",
						},
					},
				},
			},
		},
		"key-value matcher with array": {
			input: `{
				"field": [
					{
						"matcher": "eq",
						"value": "foo"
					},
					{
						"matcher": "eq",
						"value": "bar"
					}
				]
			}`,
			want: types.BodyMatcher{
				BodyFields: types.KeyValueMatcher{
					"field": types.StringMatchers{
						{
							Matcher: operators.OperatorEquals,
							Value:   "foo",
						},
						{
							Matcher: operators.OperatorEquals,
							Value:   "bar",
						},
					},
				},
			},
		},
		"invalid key format": {
			input: `{
				"field[0": "foo"
			}`,
			wantErr: "invalid body path selector",
		},
		"invalid string matcher": {
			// Not recognized as a valid StringMatcher so fallack to KeyValueMatcher
			input: `{
				"matcher": "InvalidMatcher",
				"value": "baz"
			}`,
			want: types.BodyMatcher{
				BodyFields: types.KeyValueMatcher{
					"matcher": types.StringMatchers{
						{
							Matcher: operators.OperatorEquals,
							Value:   "InvalidMatcher",
						},
					},
					"value": types.StringMatchers{
						{
							Matcher: operators.OperatorEquals,
							Value:   "baz",
						},
					},
				},
			},
		},
		"invalid key-value matcher": {
			input: `{
				"field": {
					"matcher": "InvalidMatcher",
					"value": "baz"
				}
			}`,
			wantErr: "invalid matcher",
		},
		"malformed json": {
			input: `{
				"matcher": true
			}`,
			wantErr: "failed to unmarshal string matcher",
		},
		"malformed key-value": {
			input: `{
				"field": {
					"matcher": true
				}
			}`,
			wantErr: "failed to unmarshal string matcher",
		},
	}
	for name, tt := range tests {
		t.Run(name, func(t *testing.T) {
			var m types.BodyMatcher
			assert.Err(t, json.Unmarshal([]byte(tt.input), &m), tt.wantErr)
			if tt.wantErr == "" {
				if tt.want.Body != nil {
					if m.Body == nil || *m.Body != *tt.want.Body {
						t.Errorf("UnmarshalJSON() got Body = %+v, want %+v", m.Body, tt.want.Body)
					}
				} else {
					assert.Equal(t, tt.want.BodyFields, m.BodyFields)
				}
			}
		})
	}
}

func TestBodyMatcher_UnmarshalYAML(t *testing.T) {
	t.Parallel()

	tests := map[string]struct {
		input   string
		want    types.BodyMatcher
		wantErr string
	}{
		"simple string matcher": {
			input: "foo",
			want: types.BodyMatcher{
				Body: &types.StringMatcher{
					Matcher: operators.OperatorEquals,
					Value:   "foo",
				},
			},
		},
		"object string matcher": {
			input: `
matcher: match
value: bar
`,
			want: types.BodyMatcher{
				Body: &types.StringMatcher{
					Matcher: operators.OperatorMatchesRegexp,
					Value:   "bar",
				},
			},
		},
		"key-value matcher": {
			input: `
field1: foo
field2:
  matcher: eq
  value: bar
`,
			want: types.BodyMatcher{
				BodyFields: types.KeyValueMatcher{
					"field1": types.StringMatchers{
						{
							Matcher: operators.OperatorEquals,
							Value:   "foo",
						},
					},
					"field2": types.StringMatchers{
						{
							Matcher: operators.OperatorEquals,
							Value:   "bar",
						},
					},
				},
			},
		},
		"key-value matcher with array": {
			input: `
field:
  - matcher: eq
    value: foo
  - matcher: eq
    value: bar
`,
			want: types.BodyMatcher{
				BodyFields: types.KeyValueMatcher{
					"field": types.StringMatchers{
						{
							Matcher: operators.OperatorEquals,
							Value:   "foo",
						},
						{
							Matcher: operators.OperatorEquals,
							Value:   "bar",
						},
					},
				},
			},
		},
		"invalid string matcher": {
			// Not recognized as a valid StringMatcher so fallback to KeyValueMatcher
			input: `
matcher: InvalidMatcher
value: baz
`,
			want: types.BodyMatcher{
				BodyFields: types.KeyValueMatcher{
					"matcher": types.StringMatchers{
						{
							Matcher: operators.OperatorEquals,
							Value:   "InvalidMatcher",
						},
					},
					"value": types.StringMatchers{
						{
							Matcher: operators.OperatorEquals,
							Value:   "baz",
						},
					},
				},
			},
		},
		"invalid key-value matcher": {
			input: `
field:
  matcher: InvalidMatcher
  value: baz
`,
			wantErr: "invalid matcher",
		},
		"malformed matcher object": {
			input: `
matcher:
  foo: bar
`,
			wantErr: "failed to unmarshal string matcher",
		},
		"malformed key-value": {
			input: `
field:
  matcher:
    foo: bar
`,
			wantErr: "failed to unmarshal string matcher",
		},
	}
	for name, tt := range tests {
		t.Run(name, func(t *testing.T) {
			var m types.BodyMatcher
			assert.Err(t, yaml.Unmarshal([]byte(tt.input), &m), tt.wantErr)
			if tt.wantErr == "" {
				if tt.want.Body != nil {
					if m.Body == nil || *m.Body != *tt.want.Body {
						t.Errorf("UnmarshalYAML() got Body = %+v, want %+v", m.Body, tt.want.Body)
					}
				} else {
					assert.Equal(t, tt.want.BodyFields, m.BodyFields)
				}
			}
		})
	}
}
