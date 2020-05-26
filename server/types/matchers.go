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
		log.Tracef("Value doesn't match:\n%s", res)
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

type StringSliceMatcher struct {
	Matcher string
	Value   StringSlice
}

func (ssm StringSliceMatcher) Match(values StringSlice) bool {
	matcher := asserts[ssm.Matcher]
	if matcher == nil {
		log.WithField("matcher", ssm.Matcher).Error("Invalid matcher")
		return false
	}

	if len(ssm.Value) > len(values) {
		return false
	}

	for _, value := range ssm.Value {
		matched := false
		for _, v := range values {
			if res := matcher(v, value); res == "" {
				matched = true
				break
			}
		}
		if !matched {
			log.Tracef("Value %s didn't match", value)
			return false
		}
	}

	return true
}

func (ssm StringSliceMatcher) MarshalJSON() ([]byte, error) {
	if ssm.Matcher == DefaultMatcher {
		return json.Marshal(ssm.Value)
	}
	return json.Marshal(&struct {
		Matcher string      `json:"matcher"`
		Value   StringSlice `json:"value"`
	}{
		Matcher: ssm.Matcher,
		Value:   ssm.Value,
	})
}

func (ssm *StringSliceMatcher) UnmarshalJSON(data []byte) error {
	var v StringSlice
	if err := json.Unmarshal(data, &v); err == nil {
		ssm.Matcher = DefaultMatcher
		ssm.Value = v
		return nil
	}

	var res struct {
		Matcher string      `json:"matcher"`
		Value   StringSlice `json:"value"`
	}
	if err := json.Unmarshal(data, &res); err != nil {
		return err
	}

	ssm.Matcher = res.Matcher
	ssm.Value = res.Value
	return nil
}

func (ssm StringSliceMatcher) MarshalYAML() (interface{}, error) {
	if ssm.Matcher == DefaultMatcher {
		value, err := yaml.Marshal(ssm.Value)
		return string(value), err
	}

	value, err := yaml.Marshal(&struct {
		Matcher string      `yaml:"matcher,flow"`
		Value   StringSlice `yaml:"value"`
	}{
		Matcher: ssm.Matcher,
		Value:   ssm.Value,
	})

	return string(value), err
}

func (ssm *StringSliceMatcher) UnmarshalYAML(unmarshal func(interface{}) error) error {
	var v StringSlice
	if err := unmarshal(&v); err == nil {
		ssm.Matcher = DefaultMatcher
		ssm.Value = v
		return nil
	}
	var res struct {
		Matcher string      `yaml:"matcher,flow"`
		Value   StringSlice `yaml:"value"`
	}
	if err := unmarshal(&res); err != nil {
		return err
	}
	ssm.Matcher = res.Matcher
	ssm.Value = res.Value
	return nil
}

type MultiMapMatcher map[string]StringSliceMatcher

func (mmm MultiMapMatcher) Match(values map[string][]string) bool {
	if len(mmm) > len(values) {
		return false
	}
	for key, matcherValue := range mmm {
		value, ok := values[key]
		if !ok || !matcherValue.Match(value) {
			return false
		}
	}
	return true
}
