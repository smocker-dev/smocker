package assert

import (
	"errors"
	"reflect"
	"strings"
	"testing"
)

func Err(tb testing.TB, got error, want any) {
	tb.Helper()

	switch w := want.(type) {
	case nil:
		if got != nil {
			tb.Fatalf("unexpected error: %v", got)
		}

	case bool:
		if w && got == nil {
			tb.Fatalf("expected error, got nil")
		}
		if !w && got != nil {
			tb.Fatalf("unexpected error: %v", got)
		}

	case string:
		if w == "" {
			if got != nil {
				tb.Fatalf("unexpected error: %v", got)
			}
			return
		}

		if !strings.Contains(got.Error(), w) {
			tb.Fatalf("expected error %q to contain %q", got.Error(), w)
		}

	case error:
		if !errors.Is(got, w) {
			tb.Fatalf("expected error %T(%v) to be %T(%v)", got, got, w, w)
		}

	case reflect.Type:
		target := reflect.New(w).Interface()
		if !errors.As(got, target) {
			tb.Fatalf("expected error %T to be %s", got, w)
		}

	default:
		if got == nil {
			tb.Fatal("expected error, got nil")
		}

		tb.Fatalf("unsupported error assertion: %T", want)
	}
}

func Equal(tb testing.TB, want, got any) {
	tb.Helper()

	if !reflect.DeepEqual(got, want) {
		tb.Fatalf("got %v, want %v", got, want)
	}
}

func True(tb testing.TB, got bool) {
	tb.Helper()

	if !got {
		tb.Fatalf("expected value to be true, got false")
	}
}
