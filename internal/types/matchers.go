package types

import (
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"

	"github.com/smocker-dev/smocker/internal/pkg/operators"
	"github.com/smocker-dev/smocker/internal/pkg/selectors"
	"gopkg.in/yaml.v3"
)

var ErrInvalidMatcher = errors.New("invalid matcher")

type StringMatcher struct {
	Matcher operators.Operator `json:"matcher" yaml:"matcher"`
	Value   string             `json:"value" yaml:"value"`
}

var (
	_ json.Unmarshaler = &StringMatcher{}
	_ yaml.Unmarshaler = &StringMatcher{}
)

func (m StringMatcher) Validate() error {
	if !m.Matcher.IsValid() {
		return fmt.Errorf("%w: %q", ErrInvalidMatcher, m.Matcher)
	}

	return nil
}

func (m *StringMatcher) Match(value string) bool {
	if m == nil {
		return true
	}

	matcher, ok := operators.Operators[m.Matcher]
	if !ok {
		slog.Error("invalid matcher", slog.String("matcher", string(m.Matcher)))
		return false
	}

	if err := matcher(value, m.Value); err != nil {
		slog.Debug("value doesn't match", slog.String("value", value), slog.Any("error", err))
		return false
	}

	return true
}

// UnmarshalJSON unmarshals `Foo StringMatcher` as one of these formats:
//
//	{
//	  "foo": "example value"
//	}
//
//	{
//	  "foo": {
//	    "matcher": "eq",
//	    "value": "example value"
//	   }
//	}
func (m *StringMatcher) UnmarshalJSON(data []byte) error {
	var str string
	if err := json.Unmarshal(data, &str); err == nil {
		m.Matcher = operators.OperatorEquals
		m.Value = str
		return nil
	}

	var strMatcher struct {
		Matcher operators.Operator `json:"matcher"`
		Value   string             `json:"value"`
	}
	if err := json.Unmarshal(data, &strMatcher); err != nil {
		return fmt.Errorf("failed to unmarshal string matcher: %w", err)
	}

	m.Matcher = strMatcher.Matcher
	m.Value = strMatcher.Value
	return m.Validate()
}

// UnmarshalYAML unmarshals `Foo StringMatcher` as one of these formats:
//
//	foo: example value
//
//	foo:
//	  matcher: eq
//	  value: example value
func (m *StringMatcher) UnmarshalYAML(value *yaml.Node) error {
	var str string
	if err := value.Decode(&str); err == nil {
		m.Matcher = operators.OperatorEquals
		m.Value = str
		return nil
	}

	var strMatcher struct {
		Matcher operators.Operator `yaml:"matcher"`
		Value   string             `yaml:"value"`
	}
	if err := value.Decode(&strMatcher); err != nil {
		return fmt.Errorf("failed to unmarshal string matcher: %w", err)
	}

	m.Matcher = strMatcher.Matcher
	m.Value = strMatcher.Value
	return m.Validate()
}

type StringMatchers []StringMatcher

var (
	_ json.Unmarshaler = &StringMatchers{}
	_ yaml.Unmarshaler = &StringMatchers{}
)

// Match ensures that all matchers in the slice match at least one of the values.
func (m StringMatchers) Match(values []string) bool {
	for _, matcher := range m {
		matched := false
		for _, v := range values { //nolint:modernize
			if matcher.Match(v) {
				matched = true
				break
			}
		}
		if !matched {
			return false
		}
	}

	return true
}

// UnmarshalJSON unmarshals `Foo StringMatchers` as one of these formats:
//
//	{
//	  "foo": "example value"
//	}
//
//	{
//	  "foo": {
//	    "matcher": "eq",
//	    "value": "example value"
//	  }
//	}
//
//	{
//	  "foo": [
//	    {
//	      "matcher": "eq",
//	      "value": "example value 1"
//	    },
//	    {
//	      "matcher": "eq",
//	      "value": "example value 2"
//	    }
//	  ]
//	}
func (m *StringMatchers) UnmarshalJSON(data []byte) error {
	var strMarcher StringMatcher
	if err := json.Unmarshal(data, &strMarcher); err == nil {
		*m = []StringMatcher{strMarcher}
		return nil
	} else if errors.Is(err, ErrInvalidMatcher) {
		return fmt.Errorf("failed to unmarshal string matchers: %w", err)
	}

	var strMatchers []StringMatcher
	if err := json.Unmarshal(data, &strMatchers); err == nil {
		*m = strMatchers
		return nil
	} else {
		return fmt.Errorf("failed to unmarshal string matchers: %w", err)
	}
}

// UnmarshalYAML unmarshals `Foo StringMatchers` as one of these formats:
//
//	foo: example value
//
//	foo:
//	  matcher: eq
//	  value: example value
//
//	foo:
//	  - matcher: eq
//	    value: example value 1
//	  - matcher: eq
//	    value: example value 2
func (m *StringMatchers) UnmarshalYAML(value *yaml.Node) error {
	var strMatcher StringMatcher
	if err := value.Decode(&strMatcher); err == nil {
		*m = []StringMatcher{strMatcher}
		return nil
	} else if errors.Is(err, ErrInvalidMatcher) {
		return fmt.Errorf("failed to unmarshal string matchers: %w", err)
	}

	var strMatchers []StringMatcher
	if err := value.Decode(&strMatchers); err == nil {
		*m = strMatchers
		return nil
	} else {
		return fmt.Errorf("failed to unmarshal string matchers: %w", err)
	}
}

type KeyValueMatcher map[string]StringMatchers

func (m KeyValueMatcher) Match(values map[string][]string) bool {
	if len(m) > len(values) {
		return false
	}

	for key, matcherValue := range m {
		value, ok := values[key]
		if !ok {
			return false
		}

		if !matcherValue.Match(value) {
			return false
		}
	}

	return true
}

type BodyMatcher struct {
	Body       *StringMatcher
	BodyFields KeyValueMatcher
}

var (
	_ json.Unmarshaler = &BodyMatcher{}
	_ json.Marshaler   = &BodyMatcher{}
	_ yaml.Unmarshaler = &BodyMatcher{}
	_ yaml.Marshaler   = &BodyMatcher{}
)

func (m *BodyMatcher) Match(rawBody string, parsedBody any) bool {
	if m == nil {
		return true
	}

	if m.Body != nil {
		return m.Body.Match(rawBody)
	}

	for path, matcher := range m.BodyFields {
		selector, err := selectors.Parse(path)
		if err != nil {
			slog.Error("failed to parse body field selector", slog.String("path", path), slog.Any("error", err))
			return false
		}

		value, err := selectors.Get(parsedBody, selector)
		if err != nil {
			return false
		}

		// TODO: this should be a more generic matcher
		valueString := fmt.Sprintf("%v", value)
		if ok := matcher.Match([]string{valueString}); !ok {
			return false
		}
	}

	return true
}

func (m BodyMatcher) MarshalJSON() ([]byte, error) {
	if m.Body != nil {
		return json.Marshal(m.Body)
	}

	return json.Marshal(m.BodyFields)
}

func (m *BodyMatcher) UnmarshalJSON(data []byte) error {
	var strMatcher StringMatcher
	if err := json.Unmarshal(data, &strMatcher); err == nil {
		m.Body = &strMatcher
		return nil
	}

	var kvMatcher KeyValueMatcher
	if err := json.Unmarshal(data, &kvMatcher); err != nil {
		return fmt.Errorf("failed to unmarshal body matcher: %w", err)
	}

	for path := range kvMatcher {
		if _, err := selectors.Parse(path); err != nil {
			return fmt.Errorf("invalid body path selector %q: %w", path, err)
		}
	}

	m.BodyFields = kvMatcher
	return nil
}

func (m BodyMatcher) MarshalYAML() (any, error) {
	if m.Body != nil {
		return m.Body, nil
	}

	return m.BodyFields, nil
}

func (m *BodyMatcher) UnmarshalYAML(value *yaml.Node) error {
	var strMatcher StringMatcher
	if err := value.Decode(&strMatcher); err == nil {
		m.Body = &strMatcher
		return nil
	}

	var kvMatcher KeyValueMatcher
	if err := value.Decode(&kvMatcher); err != nil {
		return fmt.Errorf("failed to unmarshal body matcher: %w", err)
	}

	m.BodyFields = kvMatcher
	return nil
}
