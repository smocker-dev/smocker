package templates

import (
	"bytes"
	"encoding/json"
	"fmt"
	"text/template"

	"github.com/Masterminds/sprig"
	"github.com/Thiht/smocker/server/types"
	log "github.com/sirupsen/logrus"
	"gopkg.in/yaml.v3"
)

type goTemplateYamlEngine struct{}

func NewGoTemplateYamlEngine() TemplateEngine {
	return &goTemplateYamlEngine{}
}

func (*goTemplateYamlEngine) Execute(request types.Request, script string) (*types.MockResponse, error) {
	tmpl, err := template.New("engine").Funcs(sprig.TxtFuncMap()).Parse(script)
	if err != nil {
		log.WithError(err).Error("Failed to parse dynamic template")
		return nil, fmt.Errorf("failed to parse dynamic template: %w", err)
	}

	buffer := new(bytes.Buffer)
	if err = tmpl.Execute(buffer, map[string]interface{}{"Request": request}); err != nil {
		log.WithError(err).Error("Failed to execute dynamic template")
		return nil, fmt.Errorf("failed to execute dynamic template: %w", err)
	}

	var result types.MockResponse
	if err = yaml.Unmarshal(buffer.Bytes(), &result); err != nil {
		log.WithError(err).Error("Failed to unmarshal response as mock response")
	}

	return &result, nil
}

type goTemplateJsonEngine struct{}

func NewGoTemplateJsonEngine() TemplateEngine {
	return &goTemplateJsonEngine{}
}

func (*goTemplateJsonEngine) Execute(request types.Request, script string) (*types.MockResponse, error) {
	tmpl, err := template.New("engine").Funcs(sprig.TxtFuncMap()).Parse(script)
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
	if err = json.Unmarshal(buffer.Bytes(), &tmplResult); err != nil {
		log.WithError(err).Error("Failed to unmarshal response from dynamic template")
		return nil, fmt.Errorf("failed to unmarshal response from dynamic template: %w", err)
	}

	body := tmplResult["body"]
	if _, ok := body.(string); !ok {
		b, err := json.Marshal(body)
		if err != nil {
			log.WithError(err).Error("Failed to marshal response body as JSON")
			return nil, fmt.Errorf("failed to marshal response body as JSON: %w", err)
		}
		tmplResult["body"] = string(b)
	}

	b, err := json.Marshal(tmplResult)
	if err != nil {
		log.WithError(err).Error("Failed to marshal template result as JSON")
	}

	var result types.MockResponse
	if err = json.Unmarshal(b, &result); err != nil {
		log.WithError(err).Error("Failed to unmarshal response as mock response")
	}

	return &result, nil
}
