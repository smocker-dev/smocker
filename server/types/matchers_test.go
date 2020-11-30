package types

import (
	"encoding/json"
	"reflect"
	"testing"

	"gopkg.in/yaml.v3"
)

func TestStringMatcherJSON(t *testing.T) {
	test := `"test"`
	serialized := `{"matcher":"ShouldEqual","value":"test"}`

	var res StringMatcher
	if err := json.Unmarshal([]byte(test), &res); err != nil {
		t.Fatal(err)
	}

	if res.Matcher != DefaultMatcher {
		t.Fatalf("matcher %s should be equal to %s", res.Matcher, DefaultMatcher)
	}
	if res.Value != "test" {
		t.Fatalf("value %s should be equal to %s", res.Value, "test")
	}

	b, err := json.Marshal(&res)
	if err != nil {
		t.Fatal(err)
	}
	if string(b) != serialized {
		t.Fatalf("serialized value %s should be equal to %s", string(b), test)
	}

	test = `{"matcher":"test","value":"test2"}`
	serialized = test
	res = StringMatcher{}
	if err = json.Unmarshal([]byte(test), &res); err != nil {
		t.Fatal(err)
	}

	if res.Matcher != "test" {
		t.Fatalf("matcher %s should be equal to %s", res.Matcher, "test")
	}
	if res.Value != "test2" {
		t.Fatalf("value %s should be equal to %s", res.Value, "test2")
	}

	b, err = json.Marshal(&res)
	if err != nil {
		t.Fatal(err)
	}

	if string(b) != serialized {
		t.Fatalf("serialized value %s should be equal to %s", string(b), test)
	}
}

func TestStringMatcherYAML(t *testing.T) {
	test := `test`
	var res StringMatcher
	if err := yaml.Unmarshal([]byte(test), &res); err != nil {
		t.Fatal(err)
	}

	if res.Matcher != DefaultMatcher {
		t.Fatalf("matcher %s should be equal to %s", res.Matcher, DefaultMatcher)
	}
	if res.Value != "test" {
		t.Fatalf("value %s should be equal to %s", res.Value, "test")
	}

	if _, err := yaml.Marshal(&res); err != nil {
		t.Fatal(err)
	}

	test = `{"matcher":"test","value":"test2"}`
	res = StringMatcher{}
	if err := yaml.Unmarshal([]byte(test), &res); err != nil {
		t.Fatal(err)
	}

	if res.Matcher != "test" {
		t.Fatalf("matcher %s should be equal to %s", res.Matcher, "test")
	}
	if res.Value != "test2" {
		t.Fatalf("value %s should be equal to %s", res.Value, "test2")
	}

	if _, err := yaml.Marshal(&res); err != nil {
		t.Fatal(err)
	}
}

func TestMultiMapMatcherJSON(t *testing.T) {
	test := `{"test":"test"}`
	serialized := `{"test":[{"matcher":"ShouldEqual","value":"test"}]}`
	var res MultiMapMatcher
	if err := json.Unmarshal([]byte(test), &res); err != nil {
		t.Fatal(err)
	}

	if res == nil {
		t.Fatal("multimap matcher should not be nil")
	}

	for _, value := range res {
		if value[0].Matcher != DefaultMatcher {
			t.Fatalf("matcher %s should be equal to %s", value[0].Matcher, DefaultMatcher)
		}
	}

	expected := MultiMapMatcher{
		"test": {
			{Matcher: "ShouldEqual", Value: "test"},
		},
	}
	if !reflect.DeepEqual(res, expected) {
		t.Fatalf("values %v should be equal to %v", res, expected)
	}

	b, err := json.Marshal(&res)
	if err != nil {
		t.Fatal(err)
	}

	if string(b) != serialized {
		t.Fatalf("serialized value %s should be equal to %s", string(b), test)
	}

	test = `{"test":{"matcher":"test2","value":"test3"}}`
	serialized = `{"test":[{"matcher":"test2","value":"test3"}]}`
	res = MultiMapMatcher{}
	if err = json.Unmarshal([]byte(test), &res); err != nil {
		t.Fatal(err)
	}

	if res["test"][0].Matcher != "test2" {
		t.Fatalf("matcher %s should be equal to %s", res["test"][0].Matcher, "test")
	}

	expected = MultiMapMatcher{
		"test": {
			{Matcher: "test2", Value: "test3"},
		},
	}

	if !reflect.DeepEqual(res, expected) {
		t.Fatalf("values %v should be equal to %v", res, expected)
	}

	b, err = json.Marshal(&res)
	if err != nil {
		t.Fatal(err)
	}

	if string(b) != serialized {
		t.Fatalf("serialized value %s should be equal to %s", string(b), test)
	}
}
