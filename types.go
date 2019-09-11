package main

import (
	"bytes"
	"errors"
	"io/ioutil"
	"net/http"
	"net/url"
	"sort"
	"strings"
	"time"

	log "github.com/sirupsen/logrus"
	"github.com/yuin/gluamapper"
	lua "github.com/yuin/gopher-lua"
	luar "layeh.com/gopher-luar"
)

type Mock struct {
	Request         Request          `json:"request,omitempty" yaml:"request"`
	Response        *Response        `json:"response,omitempty" yaml:"response"`
	DynamicResponse *DynamicResponse `json:"dynamic_response,omitempty" yaml:"dynamic_response"`
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

type Mocks []Mock

func HTTPRequestToRequest(req *http.Request) Request {
	body := []byte{}
	var err error
	if req.Body != nil {
		body, err = ioutil.ReadAll(req.Body)
	}
	if err != nil {
		log.WithError(err).Error("Failed to read request body")
	}
	req.Body = ioutil.NopCloser(bytes.NewBuffer(body))
	return Request{
		Path:        req.URL.Path,
		Method:      req.Method,
		Body:        string(body),
		QueryParams: QueryParams(req.URL.Query()),
	}
}

type Request struct {
	Path        string      `json:"path" yaml:"path"`
	Method      string      `json:"method" yaml:"method"`
	Body        string      `json:"body,omitempty" yaml:"body"`
	QueryParams QueryParams `json:"query_params,omitempty" yaml:"query_params"`
}

type Response struct {
	Body    string        `json:"body,omitempty" yaml:"body"`
	Status  int           `json:"status" yaml:"status"`
	Delay   time.Duration `json:"delay,omitempty" yaml:"delay"`
	Headers http.Header   `json:"headers,omitempty" yaml:"headers"`
}

type DynamicResponse struct {
	Script string `json:"script" yaml:"script"`
}

func (r *DynamicResponse) ToMockResponse(request Request) *Response {
	luaState := lua.NewState(lua.Options{
		SkipOpenLibs: true,
	})
	defer luaState.Close()

	for _, pair := range []struct {
		n string
		f lua.LGFunction
	}{
		{lua.LoadLibName, lua.OpenPackage},
		{lua.BaseLibName, lua.OpenBase},
		{lua.MathLibName, lua.OpenMath},
		{lua.StringLibName, lua.OpenString},
		{lua.TabLibName, lua.OpenTable},
	} {
		if err := luaState.CallByParam(
			lua.P{
				Fn:      luaState.NewFunction(pair.f),
				NRet:    0,
				Protect: true,
			},
			lua.LString(pair.n),
		); err != nil {
			log.WithError(err).Error("Failed to load Lua libraries")
			return &Response{
				Status: http.StatusInternalServerError,
				Body:   "Failed to load Lua libraries: " + err.Error(),
			}
		}
	}
	if err := luaState.DoString("coroutine=nil;debug=nil;io=nil;open=nil;os=nil"); err != nil {
		log.WithError(err).Error("Failed to sandbox Lua environment")
		return &Response{
			Status: http.StatusInternalServerError,
			Body:   "Failed to sandbox Lua environment: " + err.Error(),
		}
	}

	luaState.SetGlobal("request", luar.New(luaState, request))
	if err := luaState.DoString(r.Script); err != nil {
		log.WithError(err).Error("Failed to execute dynamic template")
		return &Response{
			Status: http.StatusInternalServerError,
			Body:   "Failed to execute dynamic template: " + err.Error(),
		}
	}

	var response Response
	if err := gluamapper.Map(luaState.Get(-1).(*lua.LTable), &response); err != nil {
		log.WithError(err).Error("Invalid result from Lua script")
		return &Response{
			Status: http.StatusInternalServerError,
			Body:   "Invalid result from Lua script: " + err.Error(),
		}
	}

	return &response
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

type Entry struct {
	Request  Request                `json:"request"`
	Response map[string]interface{} `json:"response"`
}

type History []Entry
