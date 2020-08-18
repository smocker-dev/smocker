package types

import (
	"crypto/tls"
	"encoding/json"
	"errors"
	"fmt"
	"io/ioutil"
	"net/http"
	"net/url"
	"strings"
	"time"

	log "github.com/sirupsen/logrus"
	"github.com/teris-io/shortid"
)

const MockIDKey = "MockID"

var MockNotFound = fmt.Errorf("mock not found")

type Mocks []*Mock

func (m Mocks) Clone() Mocks {
	return append(make(Mocks, 0, len(m)), m...)
}

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
		m.Request.Path.Matcher = "ShouldMatch"
		m.Request.Path.Value = ".*"

	}

	m.Request.Method.Value = strings.TrimSpace(m.Request.Method.Value)
	if m.Request.Method.Value == "" {
		m.Request.Method.Matcher = "ShouldMatch"
		m.Request.Method.Value = ".*"
	}

	if m.DynamicResponse != nil && !m.DynamicResponse.Engine.IsValid() {
		return fmt.Errorf("The dynamic response engine must be one of the following: %v", TemplateEngines)
	}

	if m.Context != nil && m.Context.Times < 0 {
		return fmt.Errorf("The times field in mock context must be greater than or equal to 0")
	}

	return nil
}

func (m *Mock) Init() {
	m.State = &MockState{
		CreationDate: time.Now(),
		ID:           shortid.MustGenerate(),
	}

	if m.Context == nil {
		m.Context = &MockContext{}
	}
}

func (m *Mock) Verify() bool {
	isTimesDefined := m.Context.Times > 0
	hasBeenCalledRightNumberOfTimes := m.State.TimesCount == m.Context.Times
	return !isTimesDefined || hasBeenCalledRightNumberOfTimes
}

func (m *Mock) CloneAndReset() *Mock {
	return &Mock{
		Request: m.Request,
		Context: m.Context,
		State: &MockState{
			ID:           m.State.ID,
			CreationDate: time.Now(),
			Locked:       m.State.Locked,
			TimesCount:   0,
		},
		DynamicResponse: m.DynamicResponse,
		Proxy:           m.Proxy,
		Response:        m.Response,
	}
}

type MockRequest struct {
	Path        StringMatcher   `json:"path" yaml:"path"`
	Method      StringMatcher   `json:"method" yaml:"method"`
	Body        *BodyMatcher    `json:"body,omitempty" yaml:"body,omitempty"`
	QueryParams MultiMapMatcher `json:"query_params,omitempty" yaml:"query_params,omitempty"`
	Headers     MultiMapMatcher `json:"headers,omitempty" yaml:"headers,omitempty"`
}

func (mr MockRequest) Match(req Request) bool {
	matchMethod := mr.Method.Match(req.Method)
	if !matchMethod {
		log.Trace("Method did not match")
		return false
	}
	matchPath := mr.Path.Match(req.Path)
	if !matchPath {
		log.Trace("Path did not match")
		return false
	}
	matchHeaders := mr.Headers == nil || mr.Headers.Match(req.Headers)
	if !matchHeaders {
		log.Trace("Headers did not match")
		return false
	}
	matchQueryParams := mr.QueryParams == nil || mr.QueryParams.Match(req.QueryParams)
	if !matchQueryParams {
		log.Trace("Query params did not match")
		return false
	}
	matchBody := mr.Body == nil || mr.Body.Match(req.BodyString)
	if !matchBody {
		log.Trace("Body did not match")
		return false
	}
	return true
}

type MockResponse struct {
	Body    string         `json:"body,omitempty" yaml:"body,omitempty"`
	Status  int            `json:"status" yaml:"status"`
	Delay   Delay          `json:"delay,omitempty" yaml:"delay,omitempty"`
	Headers MapStringSlice `json:"headers,omitempty" yaml:"headers,omitempty"`
}

type DynamicMockResponse struct {
	Engine Engine `json:"engine" yaml:"engine"`
	Script string `json:"script" yaml:"script"`
}

type MockProxy struct {
	Host           string         `json:"host" yaml:"host"`
	Delay          Delay          `json:"delay,omitempty" yaml:"delay,omitempty"`
	FollowRedirect bool           `json:"follow_redirect,omitempty" yaml:"follow_redirect,omitempty"`
	SkipVerifyTLS  bool           `json:"skip_verify_tls,omitempty" yaml:"skip_verify_tls,omitempty"`
	KeepHost       bool           `json:"keep_host,omitempty" yaml:"keep_host,omitempty"`
	Headers        MapStringSlice `json:"headers,omitempty" yaml:"headers,omitempty"`
}

type Delay struct {
	Value time.Duration `json:"value,omitempty" yaml:"value,omitempty"`
	Min   time.Duration `json:"min,omitempty" yaml:"min,omitempty"`
	Max   time.Duration `json:"max,omitempty" yaml:"max,omitempty"`
}

func (d *Delay) UnmarshalJSON(data []byte) error {
	var s time.Duration
	if err := json.Unmarshal(data, &s); err == nil {
		d.Value = s
		return nil
	}

	var res struct {
		Value time.Duration `json:"value"`
		Min   time.Duration `json:"min"`
		Max   time.Duration `json:"max"`
	}

	if err := json.Unmarshal(data, &res); err != nil {
		return err
	}

	d.Value = res.Value
	d.Min = res.Min
	d.Max = res.Max
	return nil
}

func (d *Delay) UnmarshalYAML(unmarshal func(interface{}) error) error {
	var s time.Duration
	if err := unmarshal(&s); err == nil {
		d.Value = s
		return nil
	}

	var res struct {
		Value time.Duration `yaml:"value,flow"`
		Min   time.Duration `yaml:"min,flow"`
		Max   time.Duration `yaml:"max,flow"`
	}

	if err := unmarshal(&res); err != nil {
		return err
	}

	d.Value = res.Value
	d.Min = res.Min
	d.Max = res.Max
	return nil
}

func noFollow(req *http.Request, via []*http.Request) error {
	return http.ErrUseLastResponse
}

func (mp MockProxy) Redirect(req Request) (*MockResponse, error) {
	proxyReq, err := http.NewRequest(req.Method, mp.Host+req.Path, strings.NewReader(req.BodyString))
	if err != nil {
		return nil, err
	}
	proxyReq.Header = req.Headers.Clone()
	if mp.KeepHost {
		proxyReq.Host = req.Headers.Get("Host")
	}
	for key, values := range mp.Headers {
		proxyReq.Header.Del(key)
		for _, value := range values {
			proxyReq.Header.Add(key, value)
		}
	}
	query := url.Values{}
	for key, values := range req.QueryParams {
		query[key] = values
	}
	proxyReq.URL.RawQuery = query.Encode()
	log.Debugf("Redirecting to %s", proxyReq.URL.String())
	client := &http.Client{}
	if !mp.FollowRedirect {
		client.CheckRedirect = noFollow
	}
	if mp.SkipVerifyTLS {
		// we clone to avoid overwriting the default transport configuration
		customTransport := http.DefaultTransport.(*http.Transport).Clone()
		customTransport.TLSClientConfig = &tls.Config{InsecureSkipVerify: true}
		client.Transport = customTransport
	}
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
	ID           string    `json:"id" yaml:"id"`
	TimesCount   int       `json:"times_count" yaml:"times_count"`
	Locked       bool      `json:"locked" yaml:"locked"`
	CreationDate time.Time `json:"creation_date" yaml:"creation_date"`
}
