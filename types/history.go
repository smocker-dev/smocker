package types

import (
	"bytes"
	"encoding/json"
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
	Body        interface{}    `json:"body,omitempty" yaml:"body,omitempty"`
	BodyString  string         `json:"-" yaml:"-"`
	QueryParams MapStringSlice `json:"query_params,omitempty" yaml:"query_params,omitempty"`
	Headers     MapStringSlice `json:"headers,omitempty" yaml:"headers,omitempty"`
}

type Response struct {
	Status  int            `json:"status"`
	Body    interface{}    `json:"body,omitempty" yaml:"body,omitempty"`
	Headers MapStringSlice `json:"headers,omitempty" yaml:"headers,omitempty"`
}

func HTTPRequestToRequest(req *http.Request) Request {
	bodyBytes := []byte{}
	var err error
	if req.Body != nil {
		bodyBytes, err = ioutil.ReadAll(req.Body)
	}
	if err != nil {
		log.WithError(err).Error("Failed to read request body")
	}
	req.Body = ioutil.NopCloser(bytes.NewBuffer(bodyBytes))
	var body interface{}
	var tmp map[string]interface{}
	if err := json.Unmarshal(bodyBytes, &tmp); err != nil {
		body = string(bodyBytes)
	} else {
		body = tmp
	}
	return Request{
		Path:        req.URL.Path,
		Method:      req.Method,
		Body:        body,
		BodyString:  string(bodyBytes),
		QueryParams: URLValuesToMapStringSlice(req.URL.Query()),
		Headers:     HTTPHeaderToMapStringSlice(req.Header),
	}
}
