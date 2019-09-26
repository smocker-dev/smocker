package templates

import (
	"bytes"
	"encoding/json"
	"fmt"
	"text/template"

	"github.com/Thiht/smocker/types"
	log "github.com/sirupsen/logrus"
	"gopkg.in/yaml.v3"
)

type goTemplateEngine struct{}

func NewGoTemplateEngine() TemplateEngine {
	return &goTemplateEngine{}
}

func (*goTemplateEngine) Execute(request types.Request, script string) (*types.MockResponse, error) {
	tmpl, err := template.New("engine").Parse(script)
	if err != nil {
		log.WithError(err).Error("Failed to parse dynamic template")
		return nil, fmt.Errorf("failed to parse dynamic template: %w", err)
	}

	buffer := new(bytes.Buffer)
	if err = tmpl.Execute(buffer, map[string]interface{}{"Request": request}); err != nil {
		log.WithError(err).Error("Failed to execute dynamic template")
		return nil, fmt.Errorf("failed to execute dynamic template: %w", err)
	}

	var tmplResult map[string]interface{}
	if err = yaml.Unmarshal(buffer.Bytes(), &tmplResult); err != nil {
		log.WithError(err).Error("Failed to unmarshal response from dynamic template")
		return nil, fmt.Errorf("failed to unmarshal response from dynamic template: %w", err)
	}

	body := tmplResult["body"]
	if _, ok := body.(string); !ok {
		// FIXME: this should depend on the Content-Type of the tmplResult
		b, err := json.Marshal(body)
		if err != nil {
			log.WithError(err).Error("Failed to marshal response body as JSON")
			return nil, fmt.Errorf("failed to marshal response body as JSON: %w", err)
		}
		tmplResult["body"] = string(b)
	}

	b, err := yaml.Marshal(tmplResult)
	if err != nil {
		log.WithError(err).Error("Failed to marshal template result as YAML")
	}

	var result types.MockResponse
	if err = yaml.Unmarshal(b, &result); err != nil {
		log.WithError(err).Error("Failed to unmarshal response as mock response")
	}

	return &result, nil
}
