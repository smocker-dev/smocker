package types

import (
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	log "github.com/sirupsen/logrus"
)

type Mocks []*Mock

type Mock struct {
	Request         MockRequest          `json:"request,omitempty" yaml:"request"`
	Response        *MockResponse        `json:"response,omitempty" yaml:"response,omitempty"`
	Context         *MockContext         `json:"context,omitempty" yaml:"context,omitempty"`
	State           *MockState           `json:"state,omitempty" yaml:"state,omitempty"`
	DynamicResponse *DynamicMockResponse `json:"dynamic_response,omitempty" yaml:"dynamic_response,omitempty"`
}

func (m *Mock) Validate() error {
	if m.Response == nil && m.DynamicResponse == nil {
		return errors.New("The route must define at least a response or a dynamic response")
	}

	if m.Response != nil && m.DynamicResponse != nil {
		return errors.New("The route must define either a response or a dynamic response, not both")
	}

	m.Request.Path.Value = strings.TrimSpace(m.Request.Path.Value)
	if m.Request.Path.Value == "" {
		return errors.New("The request must define at least a path")
	}

	m.Request.Method.Value = strings.TrimSpace(m.Request.Method.Value)
	if m.Request.Method.Value == "" {
		// Fallback to GET
		m.Request.Method = StringMatcher{
			Matcher: DefaultMatcher,
			Value:   http.MethodGet,
		}
	}

	if m.DynamicResponse != nil && !m.DynamicResponse.Engine.IsValid() {
		return fmt.Errorf("The dynamic response engine must be equal to one of the followings: %v", TemplateEngines)
	}

	if m.Context != nil && m.Context.Times < 0 {
		return fmt.Errorf("The times field in mock context must be greater or equal to 0")
	}

	return nil
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
	log.WithField("match", matchPath).Debug("Is matching request path")
	matchMethod := mr.Method.Match(req.Method)
	log.WithField("match", matchMethod).Debug("Is matching request method")
	matchBody := true
	if mr.Body != nil {
		matchBody = mr.Body.Match(req.Body)
		log.WithField("match", matchBody).Debug("Is matching request body")
	}
	matchQueryParams := true
	if mr.QueryParams != nil {
		matchQueryParams = mr.QueryParams.Match(req.QueryParams)
		log.WithField("match", matchQueryParams).Debug("Is matching request query parameters")
	}
	matchHeaders := true
	if mr.Headers != nil {
		matchHeaders = mr.Headers.Match(req.Headers)
		log.WithField("match", matchHeaders).Debug("Is matching request headers")
	}
	return matchPath && matchMethod && matchBody && matchQueryParams && matchHeaders
}

type MockResponse struct {
	Body    string        `json:"body,omitempty" yaml:"body,omitempty"`
	Status  int           `json:"status" yaml:"status"`
	Delay   time.Duration `json:"delay,omitempty" yaml:"delay,omitempty"`
	Headers http.Header   `json:"headers,omitempty" yaml:"headers,omitempty"`
}

type DynamicMockResponse struct {
	Engine Engine `json:"engine" yaml:"engine"`
	Script string `json:"script" yaml:"script"`
}

type MockContext struct {
	Times int `json:"times,omitempty" yaml:"times,omitempty"`
}
type MockState struct {
	TimesCount int `json:"times_count" yaml:"times_count"`
}
