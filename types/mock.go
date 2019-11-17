package types

import (
	"errors"
	"fmt"
	"io/ioutil"
	"net/http"
	"net/url"
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
	Proxy           *MockProxy           `json:"proxy,omitempty" yaml:"proxy,omitempty"`
}

func (m *Mock) Validate() error {
	if m.Response == nil && m.DynamicResponse == nil && m.Proxy == nil {
		return errors.New("The route must define at least a response, a dynamic response or a proxy")
	}

	if m.Response != nil && m.DynamicResponse != nil && m.Proxy != nil {
		return errors.New("The route must define either a response, a dynamic response or a proxy, not multiple of them")
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
		return fmt.Errorf("The dynamic response engine must be one of the following: %v", TemplateEngines)
	}

	if m.Context != nil && m.Context.Times < 0 {
		return fmt.Errorf("The times field in mock context must be greater than or equal to 0")
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
	matchMethod := mr.Method.Match(req.Method)
	matchBody := mr.Body == nil || mr.Body.Match(req.BodyString)
	matchQueryParams := mr.QueryParams == nil || mr.QueryParams.Match(req.QueryParams)
	matchHeaders := mr.Headers == nil || mr.Headers.Match(req.Headers)

	log.WithFields(log.Fields{
		"matchPath":        matchPath,
		"matchMethod":      matchMethod,
		"matchBody":        matchBody,
		"matchQueryParams": matchQueryParams,
		"matchHeaders":     matchHeaders,
	}).Debug("Match results")

	return matchPath && matchMethod && matchBody && matchQueryParams && matchHeaders
}

type MockResponse struct {
	Body    string         `json:"body,omitempty" yaml:"body,omitempty"`
	Status  int            `json:"status" yaml:"status"`
	Delay   time.Duration  `json:"delay,omitempty" yaml:"delay,omitempty"`
	Headers MapStringSlice `json:"headers,omitempty" yaml:"headers,omitempty"`
}

type DynamicMockResponse struct {
	Engine Engine `json:"engine" yaml:"engine"`
	Script string `json:"script" yaml:"script"`
}

type MockProxy struct {
	Host  string        `json:"host" yaml:"host"`
	Delay time.Duration `json:"delay,omitempty" yaml:"delay,omitempty"`
}

func (mp MockProxy) Redirect(req Request) (*MockResponse, error) {
	proxyReq, err := http.NewRequest(req.Method, mp.Host+req.Path, strings.NewReader(req.BodyString))
	if err != nil {
		return nil, err
	}
	proxyReq.Header = req.Headers
	query := url.Values{}
	for key, values := range req.QueryParams {
		query[key] = values
	}
	proxyReq.URL.RawQuery = query.Encode()
	client := &http.Client{}
	resp, err := client.Do(proxyReq)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	body, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}
	respHeader := MapStringSlice{}
	for key, values := range resp.Header {
		respHeader[key] = values
	}
	return &MockResponse{
		Status:  resp.StatusCode,
		Body:    string(body),
		Headers: respHeader,
		Delay:   mp.Delay,
	}, nil
}

type MockContext struct {
	Times int `json:"times,omitempty" yaml:"times,omitempty"`
}

type MockState struct {
	TimesCount   int       `json:"times_count" yaml:"times_count"`
	CreationDate time.Time `json:"creation_date" yaml:"creation_date"`
}
