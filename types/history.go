package types

import (
	"bytes"
	"io/ioutil"
	"net/http"

	log "github.com/sirupsen/logrus"
)

type History []Entry

type Entry struct {
	Request  Request  `json:"request"`
	Response Response `json:"response"`
}

type Request struct {
	Path        string         `json:"path"`
	Method      string         `json:"method"`
	Body        string         `json:"body,omitempty" yaml:"body,omitempty"`
	QueryParams MapStringSlice `json:"query_params,omitempty" yaml:"query_params,omitempty"`
	Headers     MapStringSlice `json:"headers,omitempty" yaml:"headers,omitempty"`
}

type Response struct {
	Status  int            `json:"status"`
	Body    interface{}    `json:"body,omitempty" yaml:"body,omitempty"`
	Headers MapStringSlice `json:"headers,omitempty" yaml:"headers,omitempty"`
}

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
		QueryParams: URLValuesToMapStringSlice(req.URL.Query()),
		Headers:     HTTPHeaderToMapStringSlice(req.Header),
	}
}
