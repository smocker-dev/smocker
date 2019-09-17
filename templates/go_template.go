package templates

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"text/template"

	"github.com/Thiht/smock/types"
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
	var result types.MockResponse
	err = json.Unmarshal(buffer.Bytes(), &result)
	if err != nil {
		log.WithError(err).Error("Failed to unmarshal response from dynamic template")
		return &types.MockResponse{
			Status: http.StatusInternalServerError,
			Body:   fmt.Sprintf("Failed to unmarshal response from dynamic template: %s", err.Error()),
		}
	}
	return &result
}
