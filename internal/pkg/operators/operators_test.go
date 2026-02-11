package operators_test

import (
	"testing"

	"github.com/smocker-dev/smocker/internal/pkg/assert"
	"github.com/smocker-dev/smocker/internal/pkg/operators"
)

func TestEquals(t *testing.T) {
	t.Parallel()

	type args struct {
		value   any
		operand any
	}
	tests := map[string]struct {
		args    args
		wantErr bool
	}{
		// Happy path
		"with an int value": {
			args{
				value:   int(1),
				operand: 1,
			},
			false,
		},
		"with an int8 value": {
			args{
				value:   int8(1),
				operand: 1,
			},
			false,
		},
		"with an int16 value": {
			args{
				value:   int16(1),
				operand: 1,
			},
			false,
		},
		"with an int32 value": {
			args{
				value:   int32(1),
				operand: 1,
			},
			false,
		},
		"with an int64 value": {
			args{
				value:   int64(1),
				operand: 1,
			},
			false,
		},
		"with a uint value": {
			args{
				value:   uint(1),
				operand: uint(1),
			},
			false,
		},
		"with a uint8 value": {
			args{
				value:   uint8(1),
				operand: 1,
			},
			false,
		},
		"with a uint16 value": {
			args{
				value:   uint16(1),
				operand: 1,
			},
			false,
		},
		"with a uint32 value": {
			args{
				value:   uint32(1),
				operand: 1,
			},
			false,
		},
		"with a uint64 value": {
			args{
				value:   uint64(1),
				operand: 1,
			},
			false,
		},
		"with a float32 value": {
			args{
				value:   float32(1.0),
				operand: 1.0,
			},
			false,
		},
		"with a float64 value": {
			args{
				value:   float64(1.0),
				operand: 1.0,
			},
			false,
		},
		"with a string value": {
			args{
				value:   "hello",
				operand: "hello",
			},
			false,
		},
		"with a bool value": {
			args{
				value:   true,
				operand: true,
			},
			false,
		},
		"with a slice and a json array": {
			args{
				value:   []any{1, 2, 3},
				operand: []any{1, 2, 3},
			},
			false,
		},
		"with a map and a json object": {
			args{
				value:   map[string]any{"a": 1, "b": 2, "c": 3},
				operand: map[string]any{"a": 1, "b": 2, "c": 3},
			},
			false,
		},

		// Error cases
		"with a different int value": {
			args{
				value:   int(2),
				operand: 1,
			},
			true,
		},
		"with a different uint value": {
			args{
				value:   uint(2),
				operand: 1,
			},
			true,
		},
		"with a different float value": {
			args{
				value:   float64(2.0),
				operand: 1.0,
			},
			true,
		},
		"with an int value and a float operand": {
			args{
				value:   int(1),
				operand: 1.0,
			},
			true,
		},
		"with a uint value and a float operand": {
			args{
				value:   uint(1),
				operand: 1.0,
			},
			true,
		},
		"with a uint value and a negative int operand": {
			args{
				value:   uint(1),
				operand: -1,
			},
			true,
		},
		"with a float value and an int operand": {
			args{
				value:   float64(1.0),
				operand: 1,
			},
			false, // ints can be parsed as floats
		},
		"with a float value and a string operand": {
			args{
				value:   float64(1.0),
				operand: "hello",
			},
			true,
		},
		"with a string value and a different string operand": {
			args{
				value:   "hello",
				operand: "bye",
			},
			true,
		},
		"with a string value and an int operand": {
			args{
				value:   "1",
				operand: 1,
			},
			true,
		},
		"with a bool value and a different bool operand": {
			args{
				value:   true,
				operand: false,
			},
			true,
		},
		"with a bool value and a string operand": {
			args{
				value:   true,
				operand: "hello",
			},
			true,
		},
		"with a slice and a map": {
			args{
				value:   []any{1, 2, 3},
				operand: map[string]any{"a": 1, "b": 2, "c": 3},
			},
			true,
		},
		"with an untyped value": {
			args{
				value: nil,
			},
			true,
		},
	}
	for name, tt := range tests {
		t.Run(name, func(t *testing.T) {
			assert.Err(t, operators.Equals(tt.args.value, tt.args.operand), tt.wantErr)
		})
	}
}

func TestMatchesRegexp(t *testing.T) {
	t.Parallel()

	type args struct {
		actual  any
		operand any
	}
	tests := map[string]struct {
		name    string
		args    args
		wantErr bool
	}{
		"actual matches regexp": {
			args: args{
				actual:  "hello world",
				operand: "hello.*",
			},
			wantErr: false,
		},
		"actual does not match regexp": {
			args: args{
				actual:  "goodbye",
				operand: "^hello",
			},
			wantErr: true,
		},
		"actual is not a string": {
			args: args{
				actual:  123,
				operand: "^123$",
			},
			wantErr: true,
		},
		"operand is not a string": {
			args: args{
				actual:  "hello",
				operand: 123,
			},
			wantErr: true,
		},
		"operand is not a valid regexp": {
			args: args{
				actual:  "hello",
				operand: "[unclosed",
			},
			wantErr: true,
		},
	}
	for name, tt := range tests {
		t.Run(name, func(t *testing.T) {
			assert.Err(t, operators.MatchesRegexp(tt.args.actual, tt.args.operand), tt.wantErr)
		})
	}
}

func TestNotMatchesRegexp(t *testing.T) {
	t.Parallel()

	type args struct {
		actual  any
		operand any
	}
	tests := map[string]struct {
		args    args
		wantErr bool
	}{
		"actual does not match regexp": {
			args: args{
				actual:  "hello world",
				operand: "^goodbye",
			},
			wantErr: false,
		},
		"actual matches regexp": {
			args: args{
				actual:  "hello world",
				operand: "^hello",
			},
			wantErr: true,
		},
		"actual is not a string": {
			args: args{
				actual:  123,
				operand: "^123$",
			},
			wantErr: true,
		},
		"operand is not a string": {
			args: args{
				actual:  "hello",
				operand: 123,
			},
			wantErr: true,
		},
		"operand is not a valid regexp": {
			args: args{
				actual:  "hello",
				operand: "[unclosed",
			},
			wantErr: true,
		},
	}
	for name, tt := range tests {
		t.Run(name, func(t *testing.T) {
			assert.Err(t, operators.NotMatchesRegexp(tt.args.actual, tt.args.operand), tt.wantErr)
		})
	}
}
