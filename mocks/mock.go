package mocks

import (
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"regexp"
	"sort"
	"strings"
	"time"

	"github.com/Thiht/smock/history"
	"github.com/Thiht/smock/templates"
	log "github.com/sirupsen/logrus"
)

type Mocks []*Mock

type Mock struct {
	Request         MockRequest          `json:"request,omitempty" yaml:"request"`
	Response        *MockResponse        `json:"response,omitempty" yaml:"response"`
	DynamicResponse *DynamicMockResponse `json:"dynamic_response,omitempty" yaml:"dynamic_response"`
	compiledRequest *CompiledMockRequest
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

	if m.Response != nil && m.Response.Status == 0 {
		return errors.New("The response must define at least a status")
	} else if m.DynamicResponse.Engine != templates.GoTemplateEngineKey && m.DynamicResponse.Engine != templates.LuaEngineKey {
		return errors.New("The dynamic response engine must be equal to either '" + templates.GoTemplateEngineKey + "' or '" + templates.LuaEngineKey + "'")
	}

	var err error
	m.compiledRequest, err = m.Request.Compile()
	if err != nil {
		return err
	}
	return nil
}

func (m *Mock) MatchRequest(req history.Request) bool {
	return m.compiledRequest.Match(req)
}

type MockRequest struct {
	Path        string      `json:"path" yaml:"path"`
	Method      string      `json:"method" yaml:"method"`
	Body        string      `json:"body,omitempty" yaml:"body"`
	QueryParams QueryParams `json:"query_params,omitempty" yaml:"query_params"`
	Headers     http.Header `json:"headers,omitempty" yaml:"headers"`
}

func (mr MockRequest) Compile() (*CompiledMockRequest, error) {
	compiledPath, err := regexp.Compile(mr.Path)
	if err != nil {
		return nil, fmt.Errorf("invalid request path %v: %w", mr.Path, err)
	}
	compiledMethod, err := regexp.Compile(mr.Method)
	if err != nil {
		return nil, fmt.Errorf("invalid request method %v: %w", mr.Method, err)
	}
	compiledBody, err := regexp.Compile(mr.Body)
	if err != nil {

		return nil, fmt.Errorf("invalid request body %v: %w", mr.Method, err)
	}
	compiledQueryParams, err := CompileMultiMap(mr.QueryParams)
	if err != nil {
		return nil, fmt.Errorf("invalid request query parameters: %w", err)
	}
	compiledHeaders, err := CompileMultiMap(mr.Headers)
	if err != nil {
		return nil, fmt.Errorf("invalid request headers: %w", err)
	}
	return &CompiledMockRequest{
		Path:        compiledPath,
		Method:      compiledMethod,
		Body:        compiledBody,
		QueryParams: compiledQueryParams,
		Headers:     compiledHeaders,
	}, nil
}

type CompiledMockRequest struct {
	Path        *regexp.Regexp
	Method      *regexp.Regexp
	Body        *regexp.Regexp
	QueryParams map[*regexp.Regexp][]*regexp.Regexp
	Headers     map[*regexp.Regexp][]*regexp.Regexp
}

func (cmr CompiledMockRequest) Match(req history.Request) bool {
	matchPath := cmr.Path.MatchString(req.Path)
	log.WithField("match", matchPath).Debug("is matching request path")
	matchMethod := cmr.Method.MatchString(req.Method)
	log.WithField("match", matchMethod).Debug("is matching request method")
	matchBody := cmr.Body.MatchString(req.Body)
	log.WithField("match", matchBody).Debug("is matching request body")
	matchQueryParams := MatchMultiMap(cmr.QueryParams, req.QueryParams)
	log.WithField("match", matchQueryParams).Debug("is matching request query parameters")
	matchHeaders := MatchMultiMap(cmr.Headers, req.Headers)
	log.WithField("match", matchHeaders).Debug("is matching request headers")
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

func (d DynamicMockResponse) ToMockResponse(request history.Request) *MockResponse {
	var engine templates.TemplateEngine
	if d.Engine == templates.GoTemplateEngineKey {
		engine = templates.NewGoTemplateEngine()
	} else if d.Engine == templates.LuaEngineKey {
		engine = templates.NewLuaEngine()
	}
	var res MockResponse
	if err := engine.Execute(request, d.Script, &res); err != nil {
		res = MockResponse{
			Status: http.StatusInternalServerError,
			Body:   err.Error(),
		}
	}
	return &res
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
