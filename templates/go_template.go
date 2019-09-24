package templates

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"text/template"

	"github.com/Thiht/smocker/types"
	log "github.com/sirupsen/logrus"
)

type GoTemplateEngine struct{}

type bindings struct {
	Request types.Request
}

func NewGoTemplateEngine() TemplateEngine {
	return &GoTemplateEngine{}
}

func (*GoTemplateEngine) Execute(request types.Request, script string) *types.MockResponse {
	tmpl, err := template.New("engine").Parse(script)
	if err != nil {
		log.WithError(err).Error("Failed to parse dynamic template")
		return &types.MockResponse{
			Status: http.StatusInternalServerError,
			Body:   fmt.Sprintf("Failed to parse dynamic template: %s", err.Error()),
		}
	}
	buffer := new(bytes.Buffer)
	err = tmpl.Execute(buffer, bindings{Request: request})
	if err != nil {
		log.WithError(err).Error("Failed to execute dynamic template")
		return &types.MockResponse{
			Status: http.StatusInternalServerError,
			Body:   fmt.Sprintf("Failed to execute dynamic template: %s", err.Error()),
		}
	}
	var tmp map[string]interface{}
	err = json.Unmarshal(buffer.Bytes(), &tmp)
	if err != nil {
		log.WithError(err).Error("Failed to unmarshal response from dynamic template")
		return &types.MockResponse{
			Status: http.StatusInternalServerError,
			Body:   fmt.Sprintf("Failed to unmarshal response from dynamic template: %s", err.Error()),
		}
	}
	body := tmp["body"]
	if _, ok := body.(string); !ok {
		b, err := json.Marshal(body)
		if err != nil {
			log.WithError(err).Error("Failed to unmarshal response as json")
		}
		tmp["body"] = string(b)
	}
	b, err := json.Marshal(tmp)
	if err != nil {
		log.WithError(err).Error("Failed to escape json")
	}

	var result types.MockResponse
	err = json.Unmarshal(b, &result)
	if err != nil {
		log.WithError(err).Error("Failed to unmarshal response as mock response")
	}
	return &result
}
