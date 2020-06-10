package types

import (
	"bytes"
	"encoding/json"
	"io/ioutil"
	"net"
	"net/http"
	"net/url"
	"strings"
	"time"

	log "github.com/sirupsen/logrus"
)

type History []*Entry

type Sessions []*Session

type Session struct {
	ID      string    `json:"id"`
	Name    string    `json:"name"`
	Date    time.Time `json:"date"`
	History History   `json:"history"`
	Mocks   Mocks     `json:"mocks"`
}

type Entry struct {
	MockID   string   `json:"mock_id,omitempty"`
	Request  Request  `json:"request"`
	Response Response `json:"response"`
}

type Request struct {
	Path        string      `json:"path"`
	Method      string      `json:"method"`
	Origin      string      `json:"origin"`
	BodyString  string      `json:"body_string" yaml:"body_string"`
	Body        interface{} `json:"body,omitempty" yaml:"body,omitempty"`
	QueryParams url.Values  `json:"query_params,omitempty" yaml:"query_params,omitempty"`
	Headers     http.Header `json:"headers,omitempty" yaml:"headers,omitempty"`
	Date        time.Time   `json:"date" yaml:"date"`
}

type Response struct {
	Status  int         `json:"status"`
	Body    interface{} `json:"body,omitempty" yaml:"body,omitempty"`
	Headers http.Header `json:"headers,omitempty" yaml:"headers,omitempty"`
	Date    time.Time   `json:"date" yaml:"date"`
}

func HTTPRequestToRequest(req *http.Request) Request {
	bodyBytes := []byte{}
	if req.Body != nil {
		var err error
		bodyBytes, err = ioutil.ReadAll(req.Body)
		if err != nil {
			log.WithError(err).Error("Failed to read request body")
		}
	}
	req.Body = ioutil.NopCloser(bytes.NewBuffer(bodyBytes))
	var body interface{}
	var tmp map[string]interface{}
	if err := json.Unmarshal(bodyBytes, &tmp); err != nil {
		body = string(bodyBytes)
	} else {
		body = tmp
	}

	headers := http.Header{}
	for key, values := range req.Header {
		headers[key] = make([]string, 0, len(values))
		for _, value := range values {
			headers.Add(key, value)
		}
	}
	headers.Add("Host", req.Host)
	return Request{
		Path:        req.URL.Path,
		Method:      req.Method,
		Origin:      getOrigin(req),
		Body:        body,
		BodyString:  string(bodyBytes),
		QueryParams: req.URL.Query(),
		Headers:     headers,
		Date:        time.Now(),
	}
}

func getOrigin(r *http.Request) string {
	for _, h := range []string{"X-Forwarded-For", "X-Real-Ip"} {
		addresses := strings.Split(r.Header.Get(h), ",")
		// march from right to left until we get a public address
		// that will be the address right before our proxy.
		for i := len(addresses) - 1; i >= 0; i-- {
			// header can contain spaces too, strip those out.
			ip := strings.TrimSpace(addresses[i])
			if ip != "" {
				return ip
			}
		}
	}

	// port declared in RemoteAddr is inconsistent so we can't use it
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return host
}
