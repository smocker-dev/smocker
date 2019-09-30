package types

import (
	"encoding/json"
	"fmt"
	"regexp"

	log "github.com/sirupsen/logrus"
	"github.com/smartystreets/assertions"
	"gopkg.in/yaml.v3"
)

const (
	DefaultMatcher = "ShouldEqual"
)

type Assertion func(actual interface{}, expected ...interface{}) string

var asserts = map[string]Assertion{
	"ShouldResemble":         assertions.ShouldResemble,
	"ShouldAlmostEqual":      assertions.ShouldAlmostEqual,
	"ShouldContainSubstring": assertions.ShouldContainSubstring,
	"ShouldEndWith":          assertions.ShouldEndWith,
	"ShouldEqual":            assertions.ShouldEqual,
	"ShouldEqualJSON":        assertions.ShouldEqualJSON,
	"ShouldStartWith":        assertions.ShouldStartWith,
	"ShouldMatch":            ShouldMatch,

	"ShouldNotResemble":         assertions.ShouldNotResemble,
	"ShouldNotAlmostEqual":      assertions.ShouldNotAlmostEqual,
	"ShouldNotContainSubstring": assertions.ShouldNotContainSubstring,
	"ShouldNotEndWith":          assertions.ShouldNotEndWith,
	"ShouldNotEqual":            assertions.ShouldNotEqual,
	"ShouldNotStartWith":        assertions.ShouldNotStartWith,
	"ShouldNotMatch":            ShouldNotMatch,
}

func ShouldMatch(value interface{}, patterns ...interface{}) string {
	valueString, ok := value.(string)
	if !ok {
		return "ShouldMatch works only with strings"
	}

	for _, pattern := range patterns {
		patternString, ok := pattern.(string)
		if !ok {
			return "ShouldMatch works only with strings"
		}

		if match, err := regexp.MatchString(patternString, valueString); !match || err != nil {
			return fmt.Sprintf("Expected %q to match %q (but it didn't)!", valueString, patternString)
		}
	}

	return ""
}

func ShouldNotMatch(value interface{}, patterns ...interface{}) string {
	valueString, ok := value.(string)
	if !ok {
		return "ShouldNotMatch works only with strings"
	}

	for _, pattern := range patterns {
		patternString, ok := pattern.(string)
		if !ok {
			return "ShouldNotMatch works only with strings"
		}

		if match, err := regexp.MatchString(patternString, valueString); match && err == nil {
			return fmt.Sprintf("Expected %q to not match %q (but it did)!", valueString, patternString)
		}
	}

	return ""
}

type StringMatcher struct {
	Matcher string
	Value   string
}

func (sm StringMatcher) Match(value string) bool {
	matcher := asserts[sm.Matcher]
	if matcher == nil {
		log.WithField("matcher", sm.Matcher).Error("Invalid matcher")
		return false
	}

	if res := matcher(value, sm.Value); res != "" {
		log.Debugf("Value does not match:\n%s", res)
		return false
	}

	return true
}

func (sm StringMatcher) MarshalJSON() ([]byte, error) {
	if sm.Matcher == DefaultMatcher {
		return json.Marshal(sm.Value)
	}

	return json.Marshal(&struct {
		Matcher string `json:"matcher"`
		Value   string `json:"value"`
	}{
		Matcher: sm.Matcher,
		Value:   sm.Value,
	})
}

func (sm *StringMatcher) UnmarshalJSON(data []byte) error {
	var s string
	if err := json.Unmarshal(data, &s); err == nil {
		sm.Matcher = DefaultMatcher
		sm.Value = s
		return nil
	}

	var res struct {
		Matcher string `json:"matcher"`
		Value   string `json:"value"`
	}

	if err := json.Unmarshal(data, &res); err != nil {
		return err
	}

	sm.Matcher = res.Matcher
	sm.Value = res.Value
	return nil
}

func (sm StringMatcher) MarshalYAML() (interface{}, error) {
	if sm.Matcher == DefaultMatcher {
		return sm.Value, nil
	}

	value, err := yaml.Marshal(&struct {
		Matcher string `yaml:"matcher,flow"`
		Value   string `yaml:"value,flow"`
	}{
		Matcher: sm.Matcher,
		Value:   sm.Value,
	})

	return string(value), err
}

func (sm *StringMatcher) UnmarshalYAML(unmarshal func(interface{}) error) error {
	var s string
	if err := unmarshal(&s); err == nil {
		sm.Matcher = DefaultMatcher
		sm.Value = s
		return nil
	}

	var res struct {
		Matcher string `yaml:"matcher,flow"`
		Value   string `yaml:"value,flow"`
	}

	if err := unmarshal(&res); err != nil {
		return err
	}

	sm.Matcher = res.Matcher
	sm.Value = res.Value
	return nil
}

type MultiMapMatcher struct {
	Matcher string
	Values  MapStringSlice
}

func (mm MultiMapMatcher) Match(values MapStringSlice) bool {
	matcher := asserts[mm.Matcher]
	if matcher == nil {
		log.WithField("matcher", mm.Matcher).Error("Invalid matcher")
		return false
	}

	for key, matchingValues := range mm.Values {
		expectedValues, ok := values[key]
		if !ok || len(matchingValues) > len(expectedValues) {
			return false
		}

		for i, value := range matchingValues {
			if res := matcher(expectedValues[i], value); res != "" {
				log.Debugf("Value of key '%s' does not match:\n%s", key, res)
				return false
			}
		}
	}

	return true
}

func (mm MultiMapMatcher) MarshalJSON() ([]byte, error) {
	if mm.Matcher == DefaultMatcher {
		return json.Marshal(mm.Values)
	}
	return json.Marshal(&struct {
		Matcher string         `json:"matcher"`
		Values  MapStringSlice `json:"values"`
	}{
		Matcher: mm.Matcher,
		Values:  mm.Values,
	})
}

func (mm *MultiMapMatcher) UnmarshalJSON(data []byte) error {
	var v MapStringSlice
	if err := json.Unmarshal(data, &v); err == nil {
		mm.Matcher = DefaultMatcher
		mm.Values = v
		return nil
	}

	var res struct {
		Matcher string         `json:"matcher"`
		Values  MapStringSlice `json:"values"`
	}
	if err := json.Unmarshal(data, &res); err != nil {
		return err
	}

	mm.Matcher = res.Matcher
	mm.Values = res.Values
	return nil
}

func (mm MultiMapMatcher) MarshalYAML() (interface{}, error) {
	if mm.Matcher == DefaultMatcher {
		value, err := yaml.Marshal(mm.Values)
		return string(value), err
	}

	value, err := yaml.Marshal(&struct {
		Matcher string         `yaml:"matcher,flow"`
		Values  MapStringSlice `yaml:"values"`
	}{
		Matcher: mm.Matcher,
		Values:  mm.Values,
	})

	return string(value), err
}

func (mm *MultiMapMatcher) UnmarshalYAML(unmarshal func(interface{}) error) error {
	var v MapStringSlice
	if err := unmarshal(&v); err == nil {
		mm.Matcher = DefaultMatcher
		mm.Values = v
		return nil
	}
	var res struct {
		Matcher string         `yaml:"matcher,flow"`
		Values  MapStringSlice `yaml:"values"`
	}
	if err := unmarshal(&res); err != nil {
		return err
	}
	mm.Matcher = res.Matcher
	mm.Values = res.Values
	return nil
}
