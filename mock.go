package main

import (
	"errors"
	"net/http"
	"net/url"
	"sort"
	"strings"
	"time"
)

type Mocks []Mock

type Mock struct {
	Request         MockRequest          `json:"request,omitempty" yaml:"request"`
	Response        *MockResponse        `json:"response,omitempty" yaml:"response"`
	DynamicResponse *DynamicMockResponse `json:"dynamic_response,omitempty" yaml:"dynamic_response"`
}

func (m *Mock) Validate() error {
	if m.Response == nil && m.DynamicResponse == nil {
		return errors.New("The route must define at least a response or a dynamic response")
	}

	if m.Response != nil && m.DynamicResponse != nil {
		return errors.New("The route must define either a response or a dynamic response, not both")
	}

	m.Request.Path = strings.TrimSpace(m.Request.Path)
	m.Request.Method = strings.TrimSpace(m.Request.Method)
	if m.Request.Path == "" || m.Request.Method == "" {
		return errors.New("The request must define at least a path and a method")
	}

	if m.Response != nil {
		if m.Response.Status == 0 {
			return errors.New("The response must define at least a status")
		}
	}

	return nil
}

type MockRequest struct {
	Path        string      `json:"path" yaml:"path"`
	Method      string      `json:"method" yaml:"method"`
	Body        string      `json:"body,omitempty" yaml:"body"`
	QueryParams QueryParams `json:"query_params,omitempty" yaml:"query_params"`
}

type MockResponse struct {
	Body    string        `json:"body,omitempty" yaml:"body"`
	Status  int           `json:"status" yaml:"status"`
	Delay   time.Duration `json:"delay,omitempty" yaml:"delay"`
	Headers http.Header   `json:"headers,omitempty" yaml:"headers"`
}

type DynamicMockResponse struct {
	Script string `json:"script" yaml:"script"`
}

func (d DynamicMockResponse) ToMockResponse(request Request) *MockResponse {

	engine := NewLuaEngine()
	return engine.Execute(request, d.Script)
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
