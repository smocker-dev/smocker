package types

import (
	"bytes"
	"encoding/json"
	"io"
	"net"
	"net/http"
	"net/url"
	"strings"
	"time"

	log "github.com/sirupsen/logrus"
)

const ContextKey = "Context"

type History []*Entry

func (h History) Clone() History {
	return append(make(History, 0, len(h)), h...)
}

type Entry struct {
	Context  Context  `json:"context"`
	Request  Request  `json:"request"`
	Response Response `json:"response"`
}

type Context struct {
	MockID   string `json:"mock_id,omitempty"`
	MockType string `json:"mock_type,omitempty"`
	Delay    string `json:"delay,omitempty"`
}

type Request struct {
	Path        string      `json:"path"`
	Method      string      `json:"method"`
	Origin      string      `json:"origin"`
	BodyString  string      `json:"body_string" yaml:"body_string"`
	Body        any         `json:"body,omitempty" yaml:"body,omitempty"`
	QueryParams url.Values  `json:"query_params,omitempty" yaml:"query_params,omitempty"`
	Headers     http.Header `json:"headers,omitempty" yaml:"headers,omitempty"`
	Date        time.Time   `json:"date" yaml:"date"`
}

type Response struct {
	Status  int         `json:"status"`
	Body    any         `json:"body,omitempty" yaml:"body,omitempty"`
	Headers http.Header `json:"headers,omitempty" yaml:"headers,omitempty"`
	Date    time.Time   `json:"date" yaml:"date"`
}

func HTTPRequestToRequest(req *http.Request) Request {
	bodyBytes := []byte{}
	if req.Body != nil {
		var err error
		bodyBytes, err = io.ReadAll(req.Body)
		if err != nil {
			log.WithError(err).Error("Failed to read request body")
		}
	}
	req.Body = io.NopCloser(bytes.NewBuffer(bodyBytes))
	var body any
	var tmp map[string]any
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
		Path:        req.URL.EscapedPath(),
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
