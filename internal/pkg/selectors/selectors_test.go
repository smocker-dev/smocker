package selectors_test

import (
	"testing"

	"github.com/smocker-dev/smocker/internal/pkg/assert"
	"github.com/smocker-dev/smocker/internal/pkg/selectors"
)

func TestMap_Get(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name     string
		in       any
		selector string
		want     any
		wantErr  bool
	}{
		{
			name:     "simple",
			in:       map[string]any{"foo": "bar"},
			selector: "foo",
			want:     "bar",
		},
		{
			name:     "not found",
			in:       map[string]any{"foo": "bar"},
			selector: "fofo",
			wantErr:  true,
		},
		{
			name:     "slice",
			in:       []any{"foo", "bar"},
			selector: "[0]",
			want:     "foo",
		},
		{
			name:     "nested",
			in:       map[string]any{"foo": map[string]any{"bar": "baz"}},
			selector: "foo.bar",
			want:     "baz",
		},
		{
			name:     "nested slice",
			in:       map[string]any{"foo": []any{"bar", "baz"}},
			selector: "foo[1]",
			want:     "baz",
		},
		{
			name:     "nested slice nested",
			in:       map[string]any{"foo": []any{"bar", map[string]any{"baz": "qux"}}},
			selector: "foo[1].baz",
			want:     "qux",
		},
		{
			name:     "nested slice nested slice",
			in:       map[string]any{"foo": []any{"bar", []any{"baz", "qux"}}},
			selector: "foo[1][0]",
			want:     "baz",
		},
		{
			name:     "nested slice nested slice nested",
			in:       map[string]any{"foo": []any{"bar", []any{"baz", map[string]any{"qux": "quux"}}}},
			selector: "foo[1][1].qux",
			want:     "quux",
		},
		{
			name:     "out of range",
			in:       map[string]any{"foo": []any{"bar"}},
			selector: "foo[1]",
			wantErr:  true,
		},
		{
			name: "path exists in the result, with array",
			in: map[string]any{
				"foo": []string{"bar"},
			},
			selector: "foo[0]",
			want:     "bar",
		},
		{
			name:     "empty selector",
			in:       map[string]any{"foo": "bar"},
			selector: "",
			want:     map[string]any{"foo": "bar"},
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			got, err := selectors.Get(tt.in, selectors.MustParse(tt.selector))
			assert.Err(t, err, tt.wantErr)
			assert.Equal(t, tt.want, got)
		})
	}
}

func Test_Parse(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name     string
		selector string
		want     selectors.Selector
		wantErr  bool
	}{
		{
			name:     "empty selector",
			selector: "",
			want:     selectors.Selector{},
		},
		{
			name:     "foo",
			selector: "foo",
			want:     selectors.Selector{"foo"},
		},
		{
			name:     "[0]",
			selector: "[0]",
			want:     selectors.Selector{0},
		},
		{
			name:     "foo.bar",
			selector: "foo.bar",
			want:     selectors.Selector{"foo", "bar"},
		},
		{
			name:     "foo.bar.baz",
			selector: "foo.bar.baz",
			want:     selectors.Selector{"foo", "bar", "baz"},
		},
		{
			name:     "foo[0]",
			selector: "foo[0]",
			want:     selectors.Selector{"foo", 0},
		},
		{
			name:     "foo[0].bar",
			selector: "foo[0].bar",
			want:     selectors.Selector{"foo", 0, "bar"},
		},
		{
			name:     "foo[0].bar[1]",
			selector: "foo[0].bar[1]",
			want:     selectors.Selector{"foo", 0, "bar", 1},
		},
		{
			name:     "foo[0][0]",
			selector: "foo[0][0]",
			want:     selectors.Selector{"foo", 0, 0},
		},
		{
			name:     "foo[0][0].bar",
			selector: "foo[0][0].bar",
			want:     selectors.Selector{"foo", 0, 0, "bar"},
		},

		{
			name:     "[1].foo",
			selector: "[1].foo",
			want:     selectors.Selector{1, "foo"},
		},
		{
			name:     "[1].foo[0]",
			selector: "[1].foo[0]",
			want:     selectors.Selector{1, "foo", 0},
		},
		{
			name:     ".foo",
			selector: ".foo",
			want:     selectors.Selector{"foo"},
		},
		{
			name:     "foo.1",
			selector: "foo.1",
			want:     selectors.Selector{"foo", "1"},
		},

		// Error cases
		{
			name:     "foo[1",
			selector: "foo[1",
			wantErr:  true,
		},
		{
			name:     "d",
			selector: "foo[1.",
			wantErr:  true,
		},
		{
			name:     "foo[1]..bar",
			selector: "foo[1]..bar",
			wantErr:  true,
		},
		{
			name:     "foo[foo]",
			selector: "foo[foo]",
			wantErr:  true,
		},
		{
			name:     "[2]]",
			selector: "[2]]",
			wantErr:  true,
		},
		{
			name:     "foo.[2]",
			selector: "foo.[2]",
			wantErr:  true,
		},
		{
			name:     "fo!o",
			selector: "fo!o",
			wantErr:  true,
		},
		{
			name:     "[]",
			selector: "[]",
			wantErr:  true,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			got, err := selectors.Parse(tt.selector)
			assert.Err(t, err, tt.wantErr)
			assert.Equal(t, tt.want, got)
		})
	}
}
