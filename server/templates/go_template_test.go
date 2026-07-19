package templates

import (
	"testing"
	"time"

	"github.com/smocker-dev/smocker/server/types"
)

// TestGoTemplateJsonDelay reproduces #305: a delay written as duration strings ("10ms") in a
// go_template_json dynamic response must be applied — it was previously silently dropped because
// Delay.UnmarshalJSON only accepted numeric nanoseconds.
func TestGoTemplateJsonDelay(t *testing.T) {
	script := `{
  "body": {"message": "request path {{.Request.Path}}"},
  "headers": {"Content-Type": ["application/json"]},
  "delay": {"min": "0", "max": "10ms"}
}`
	res, err := NewGoTemplateJsonEngine().Execute(types.Request{Path: "/test"}, script)
	if err != nil {
		t.Fatalf("Execute: %v", err)
	}
	if res.Delay.Min != 0 {
		t.Errorf("delay.min = %v, want 0", res.Delay.Min)
	}
	if res.Delay.Max != 10*time.Millisecond {
		t.Errorf("delay.max = %v, want 10ms", res.Delay.Max)
	}
}

// TestGoTemplateJsonDelayScalar covers the single-value shorthand ("delay": "5ms").
func TestGoTemplateJsonDelayScalar(t *testing.T) {
	res, err := NewGoTemplateJsonEngine().Execute(types.Request{Path: "/test"},
		`{"body": "hi", "delay": "5ms"}`)
	if err != nil {
		t.Fatalf("Execute: %v", err)
	}
	if res.Delay.Min != 5*time.Millisecond || res.Delay.Max != 5*time.Millisecond {
		t.Errorf("delay = {%v, %v}, want {5ms, 5ms}", res.Delay.Min, res.Delay.Max)
	}
}
