package types

import (
	"errors"
	"net/http"
	"net/url"
	"sort"
	"strings"
	"time"

	log "github.com/sirupsen/logrus"
)

const (
	GoTemplateEngineKey = "go_template"
	LuaEngineKey        = "lua"
)

type Mocks []*Mock

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

	m.Request.Path.Value = strings.TrimSpace(m.Request.Path.Value)
	m.Request.Method.Value = strings.TrimSpace(m.Request.Method.Value)
	if m.Request.Path.Value == "" || m.Request.Method.Value == "" {
		return errors.New("The request must define at least a path and a method")
	}

	if m.Response != nil && m.Response.Status == 0 {
		return errors.New("The response must define at least a status")
	} else if m.DynamicResponse.Engine != GoTemplateEngineKey && m.DynamicResponse.Engine != LuaEngineKey {
		return errors.New("The dynamic response engine must be equal to either '" + GoTemplateEngineKey + "' or '" + LuaEngineKey + "'")
	}
	return nil
}

func (m *Mock) MatchRequest(req Request) bool {
	return m.Request.Match(req)
}

type MockRequest struct {
	Path        StringMatcher    `json:"path" yaml:"path"`
	Method      StringMatcher    `json:"method" yaml:"method"`
	Body        *StringMatcher   `json:"body,omitempty" yaml:"body,omitempty"`
	QueryParams *MultiMapMatcher `json:"query_params,omitempty" yaml:"query_params,omitempty"`
	Headers     *MultiMapMatcher `json:"headers,omitempty" yaml:"headers,omitempty"`
}

func (mr MockRequest) Match(req Request) bool {
	matchPath := mr.Path.Match(req.Path)
	log.WithField("match", matchPath).Debug("is matching request path")
	matchMethod := mr.Method.Match(req.Method)
	log.WithField("match", matchMethod).Debug("is matching request method")
	matchBody := true
	if mr.Body != nil {
		matchBody = mr.Body.Match(req.Body)
		log.WithField("match", matchBody).Debug("is matching request body")
	}
	matchQueryParams := true
	if mr.QueryParams != nil {
		matchQueryParams = mr.QueryParams.Match(req.QueryParams)
		log.WithField("match", matchQueryParams).Debug("is matching request query parameters")
	}
	matchHeaders := true
	if mr.Headers != nil {
		matchHeaders = mr.Headers.Match(req.Headers)
		log.WithField("match", matchHeaders).Debug("is matching request headers")
	}
	return matchPath && matchMethod && matchBody && matchQueryParams && matchHeaders
}

type MockResponse struct {
	Body    string        `json:"body,omitempty" yaml:"body"`
	Status  int           `json:"status" yaml:"status"`
	Delay   time.Duration `json:"delay,omitempty" yaml:"delay"`
	Headers http.Header   `json:"headers,omitempty" yaml:"headers"`
}

type DynamicMockResponse struct {
	Engine string `json:"engine" yaml:"engine"`
	Script string `json:"script" yaml:"script"`
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
