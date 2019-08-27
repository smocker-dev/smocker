package main

import (
	"net/http"
	"net/url"
	"sort"
)

type MockRoute struct {
	Request  MockRequest  `json:"request" yaml:"request"`
	Response MockResponse `json:"response" yaml:"response"`
}

type MockRoutes []MockRoute

type MockRequest struct {
	Path        string      `json:"path" yaml:"path"`
	Method      string      `json:"method" yaml:"method"`
	QueryParams QueryParams `json:"query_params" yaml:"query_params"`
}

func (m *MockRequest) Hash() string {
	return m.Method + " " + m.Path
}

type MockResponse struct {
	Body    string        `json:"body" yaml:"body"`
	Status  int           `json:"status" yaml:"status"`
	Headers http.Header   `json:"headers" yaml:"headers"`
	Cookies []http.Cookie `json:"cookies" yaml:"cookies"`
}

type QueryParams url.Values

func (q1 QueryParams) Equals(q2 QueryParams) bool {
	if len(q1) != len(q2) {
		return false
	}

	for k1, v1 := range q1 {
		v2, ok := q2[k1]
		if !ok {
			return false
		}

		if len(v1) != len(v2) {
			return false
		}

		sort.Strings(v1)
		sort.Strings(v2)
		for i := 0; i < len(v1); i++ {
			if v1[i] != v2[i] {
				return false
			}
		}
	}
	return true
}
