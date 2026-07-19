package types

import (
	"encoding/json"
	"net/http"
	"reflect"
	"testing"

	"gopkg.in/yaml.v3"
)

func mapMatcher(t *testing.T, y string) MultiMapMatcher {
	t.Helper()
	var mmm MultiMapMatcher
	if err := yaml.Unmarshal([]byte(y), &mmm); err != nil {
		t.Fatalf("invalid matcher yaml: %v", err)
	}
	return mmm
}

// TestMatchHeadersCaseInsensitive covers #281: header *names* match case-insensitively (RFC 7230),
// while header *values* — and query-parameter names via Match — stay case-sensitive.
func TestMatchHeadersCaseInsensitive(t *testing.T) {
	// A mock declaring a lowercase name matches the canonical request header, and vice versa.
	req := http.Header{}
	req.Set("Content-Type", "application/json") // net/http canonicalizes incoming names

	if !mapMatcher(t, "content-type: application/json").MatchHeaders(req) {
		t.Error(`"content-type" should match request header "Content-Type"`)
	}
	if !mapMatcher(t, "Content-Type: application/json").MatchHeaders(req) {
		t.Error(`"Content-Type" should match request header "Content-Type"`)
	}

	// Header values remain case-sensitive.
	if mapMatcher(t, "Content-Type: application/json").MatchHeaders(http.Header{"Content-Type": {"Application/JSON"}}) {
		t.Error("header values must stay case-sensitive")
	}

	// A missing header still fails to match.
	if mapMatcher(t, "X-Absent: x").MatchHeaders(req) {
		t.Error("a header absent from the request must not match")
	}

	// Query-parameter matching (Match) stays case-sensitive on names.
	if mapMatcher(t, "Token: abc").Match(map[string][]string{"token": {"abc"}}) {
		t.Error("query-parameter names must stay case-sensitive")
	}
}

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

	test = `{"matcher":"ShouldEqual","value":"test2"}`
	serialized = test
	res = StringMatcher{}
	if err = json.Unmarshal([]byte(test), &res); err != nil {
		t.Fatal(err)
	}

	if res.Matcher != "ShouldEqual" {
		t.Fatalf("matcher %s should be equal to %s", res.Matcher, "ShouldEqual")
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

	test = `{"matcher":"ShouldEqual","value":"test2"}`
	res = StringMatcher{}
	if err := yaml.Unmarshal([]byte(test), &res); err != nil {
		t.Fatal(err)
	}

	if res.Matcher != "ShouldEqual" {
		t.Fatalf("matcher %s should be equal to %s", res.Matcher, "ShouldEqual")
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

	test = `{"test":{"matcher":"ShouldEqual","value":"test3"}}`
	serialized = `{"test":[{"matcher":"ShouldEqual","value":"test3"}]}`
	res = MultiMapMatcher{}
	if err = json.Unmarshal([]byte(test), &res); err != nil {
		t.Fatal(err)
	}

	if res["test"][0].Matcher != "ShouldEqual" {
		t.Fatalf("matcher %s should be equal to %s", res["test"][0].Matcher, "ShouldEqual")
	}

	expected = MultiMapMatcher{
		"test": {
			{Matcher: "ShouldEqual", Value: "test3"},
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
