package types

import (
	"database/sql"
	"database/sql/driver"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"time"

	"github.com/goccy/go-yaml"
	"github.com/google/uuid"
)

type Timeline struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type TimelineWithState struct {
	Timeline
	State TimelineState `json:"state"`
}

type TimelineState struct {
	IsCurrent bool `json:"is_current"`
}

var (
	_ driver.Valuer = Timeline{}
	_ sql.Scanner   = &Timeline{}
)

func (t Timeline) Value() (driver.Value, error) {
	return json.Marshal(t)
}

func (t *Timeline) Scan(src any) error {
	switch value := src.(type) {
	case []byte:
		if err := json.Unmarshal(value, t); err != nil {
			return fmt.Errorf("failed to unmarshal timeline: %w", err)
		}

		return nil

	default:
		return errors.New("invalid timeline")
	}
}

type Mock struct {
	ID              uuid.UUID            `json:"id" yaml:"id"`
	TimelineID      string               `json:"timeline_id" yaml:"timeline_id"`
	CreatedAt       time.Time            `json:"created_at" yaml:"created_at"`
	Options         MockOptions          `json:"options" yaml:"options"`
	Request         MockRequest          `json:"request" yaml:"request"`
	Response        *MockResponse        `json:"response,omitempty" yaml:"response,omitempty"`
	DynamicResponse *MockDynamicResponse `json:"dynamic_response,omitempty" yaml:"dynamic_response,omitempty"`
	Proxy           *MockProxy           `json:"proxy,omitempty" yaml:"proxy,omitempty"`
}

type MockWithState struct {
	Mock
	State MockState `json:"state" yaml:"state"`
}

type MockState struct {
	TimesCalled int `json:"times_called" yaml:"times_called"`
}

var (
	_ driver.Valuer = Mock{}
	_ sql.Scanner   = &Mock{}
)

func (m Mock) Value() (driver.Value, error) {
	return json.Marshal(m)
}

func (m *Mock) Scan(src any) error {
	switch value := src.(type) {
	case []byte:
		if err := json.Unmarshal(value, m); err != nil {
			return fmt.Errorf("failed to unmarshal mock: %w", err)
		}

		return nil

	default:
		return errors.New("invalid mock")
	}
}

type MockOptions struct {
	Times *int   `json:"times" yaml:"times"`
	Delay *Delay `json:"delay" yaml:"delay"`
}

type Duration time.Duration

var (
	_ json.Marshaler        = (*Duration)(nil)
	_ json.Unmarshaler      = (*Duration)(nil)
	_ yaml.BytesMarshaler   = (*Duration)(nil)
	_ yaml.BytesUnmarshaler = (*Duration)(nil)
)

func (d Duration) MarshalJSON() ([]byte, error) {
	return json.Marshal(time.Duration(d).String())
}

func (d *Duration) UnmarshalJSON(b []byte) error {
	var v any
	if err := json.Unmarshal(b, &v); err != nil {
		return fmt.Errorf("failed to unmarshal duration: %w", err)
	}

	switch value := v.(type) {
	case float64:
		*d = Duration(value)
		return nil

	case string:
		duration, err := time.ParseDuration(value)
		if err != nil {
			return fmt.Errorf("failed to parse duration: %w", err)
		}
		*d = Duration(duration)
		return nil

	default:
		return errors.New("invalid duration")
	}
}

func (d Duration) MarshalYAML() ([]byte, error) {
	return yaml.Marshal(time.Duration(d).String())
}

func (d *Duration) UnmarshalYAML(data []byte) error {
	var v any
	if err := yaml.Unmarshal(data, &v); err != nil {
		return fmt.Errorf("failed to unmarshal duration: %w", err)
	}

	switch value := v.(type) {
	case float64:
		*d = Duration(value)
		return nil

	case string:
		duration, err := time.ParseDuration(value)
		if err != nil {
			return fmt.Errorf("failed to parse duration: %w", err)
		}
		*d = Duration(duration)
		return nil

	default:
		return errors.New("invalid duration")
	}
}

type Delay struct {
	Min Duration `json:"min" yaml:"min"`
	Max Duration `json:"max" yaml:"max"`
}

var (
	_ json.Unmarshaler      = &Delay{}
	_ yaml.BytesUnmarshaler = &Delay{}
)

func (d *Delay) Validate() error {
	if d.Min < 0 || d.Max < d.Min {
		return errors.New("invalid delay")
	}

	return nil
}

func (d *Delay) UnmarshalJSON(data []byte) error {
	var delay Duration
	if err := json.Unmarshal(data, &delay); err == nil {
		d.Min = delay
		d.Max = delay
		return d.Validate()
	}

	var delayRange struct {
		Min Duration `json:"min"`
		Max Duration `json:"max"`
	}
	if err := json.Unmarshal(data, &delayRange); err != nil {
		return fmt.Errorf("failed to unmarshal delay: %w", err)
	}

	d.Min = delayRange.Min
	d.Max = delayRange.Max
	return d.Validate()
}

func (d *Delay) UnmarshalYAML(data []byte) error {
	var delay Duration
	if err := yaml.Unmarshal(data, &delay); err == nil {
		d.Min = delay
		d.Max = delay
		return d.Validate()
	}

	var delayRange struct {
		Min Duration `yaml:"min,flow"`
		Max Duration `yaml:"max,flow"`
	}
	if err := yaml.Unmarshal(data, &delayRange); err != nil {
		return fmt.Errorf("failed to unmarshal delay: %w", err)
	}

	d.Min = delayRange.Min
	d.Max = delayRange.Max
	return d.Validate()
}

type MockRequest struct {
	Host        *StringMatcher  `json:"host" yaml:"host"`
	Path        *StringMatcher  `json:"path" yaml:"path"`
	Method      *StringMatcher  `json:"method" yaml:"method"`
	QueryParams KeyValueMatcher `json:"query_params,omitempty" yaml:"query_params,omitempty"`
	Headers     KeyValueMatcher `json:"headers,omitempty" yaml:"headers,omitempty"`
	Body        *BodyMatcher    `json:"body,omitempty" yaml:"body,omitempty"`
}

func (m MockRequest) Match(request Request) bool {
	if !m.Host.Match(request.Host) {
		return false
	}

	if !m.Path.Match(request.Path) {
		return false
	}

	if !m.Method.Match(request.Method) {
		return false
	}

	if !m.QueryParams.Match(request.QueryParams) {
		return false
	}

	if !m.Headers.Match(request.Headers) {
		return false
	}

	if !m.Body.Match(request.BodyString, request.Body) {
		return false
	}

	return true
}

type MockResponse struct {
	Status  int              `json:"status" yaml:"status"`
	Body    string           `json:"body,omitempty" yaml:"body,omitempty"`
	Headers MapStringStrings `json:"headers" yaml:"headers"`
}

type MockDynamicResponse struct {
	Engine Engine `json:"engine" yaml:"engine"`
	Script string `json:"script" yaml:"script"`
}

type MockProxy struct {
	Host            string           `json:"host" yaml:"host"`
	FollowRedirects bool             `json:"follow_redirects" yaml:"follow_redirects"`
	SkipVerifyTLS   bool             `json:"skip_verify_tls" yaml:"skip_verify_tls"`
	KeepHost        bool             `json:"keep_host" yaml:"keep_host"`
	Headers         MapStringStrings `json:"headers" yaml:"headers"`
}

type HistoryEntry struct {
	ID         uuid.UUID            `json:"id"`
	TimelineID string               `json:"timeline_id" yaml:"timeline_id"`
	Metadata   HistoryEntryMetadata `json:"metadata"`
	Request    Request              `json:"request"`
	Response   Response             `json:"response"`
}

var (
	_ driver.Valuer = HistoryEntry{}
	_ sql.Scanner   = &HistoryEntry{}
)

func (h HistoryEntry) Value() (driver.Value, error) {
	return json.Marshal(h)
}

func (h *HistoryEntry) Scan(src any) error {
	switch value := src.(type) {
	case []byte:
		if err := json.Unmarshal(value, h); err != nil {
			return fmt.Errorf("failed to unmarshal history entry: %w", err)
		}

		return nil

	default:
		return errors.New("invalid history entry")
	}
}

type HistoryEntryMetadata struct {
	MatchedMockID *uuid.UUID `json:"matched_mock_id"`
}

type Request struct {
	Scheme      string      `json:"scheme" yaml:"scheme"`
	Host        string      `json:"host" yaml:"host"`
	Path        string      `json:"path" yaml:"path"`
	Method      string      `json:"method" yaml:"method"`
	Origin      string      `json:"origin" yaml:"origin"`
	BodyString  string      `json:"body_string" yaml:"body_string"`
	Body        any         `json:"body" yaml:"body"`
	QueryParams url.Values  `json:"query_params" yaml:"query_params"`
	Headers     http.Header `json:"headers" yaml:"headers"`
	Date        time.Time   `json:"date" yaml:"date"`
}

type Response struct {
	Status     int         `json:"status" yaml:"status"`
	BodyString string      `json:"body_string" yaml:"body_string"`
	Body       any         `json:"body" yaml:"body"`
	Headers    http.Header `json:"headers" yaml:"headers"`
	Date       time.Time   `json:"date" yaml:"date"`
}
