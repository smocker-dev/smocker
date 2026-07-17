package templates

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log/slog"
	"text/template"

	"github.com/Masterminds/sprig/v3"
	"github.com/smocker-dev/smocker/server/types"
	"gopkg.in/yaml.v3"
)

type goTemplateYamlEngine struct{}

func NewGoTemplateYamlEngine() TemplateEngine {
	return &goTemplateYamlEngine{}
}

func (*goTemplateYamlEngine) Execute(request types.Request, script string) (*types.MockResponse, error) {
	tmpl, err := template.New("engine").Funcs(sprig.TxtFuncMap()).Parse(script)
	if err != nil {
		slog.Error("Failed to parse dynamic template", "error", err)
		return nil, fmt.Errorf("failed to parse dynamic template: %w", err)
	}

	buffer := new(bytes.Buffer)
	if err = tmpl.Execute(buffer, map[string]interface{}{"Request": request}); err != nil {
		slog.Error("Failed to execute dynamic template", "error", err)
		return nil, fmt.Errorf("failed to execute dynamic template: %w", err)
	}

	var result types.MockResponse
	if err = yaml.Unmarshal(buffer.Bytes(), &result); err != nil {
		slog.Error("Failed to unmarshal response as mock response", "error", err)
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
		slog.Error("Failed to parse dynamic template", "error", err)
		return nil, fmt.Errorf("failed to parse dynamic template: %w", err)
	}

	buffer := new(bytes.Buffer)
	if err = tmpl.Execute(buffer, map[string]interface{}{"Request": request}); err != nil {
		slog.Error("Failed to execute dynamic template", "error", err)
		return nil, fmt.Errorf("failed to execute dynamic template: %w", err)
	}

	var tmplResult map[string]interface{}
	if err = json.Unmarshal(buffer.Bytes(), &tmplResult); err != nil {
		slog.Error("Failed to unmarshal response from dynamic template", "error", err)
		return nil, fmt.Errorf("failed to unmarshal response from dynamic template: %w", err)
	}

	body := tmplResult["body"]
	if _, ok := body.(string); !ok {
		b, err := json.Marshal(body)
		if err != nil {
			slog.Error("Failed to marshal response body as JSON", "error", err)
			return nil, fmt.Errorf("failed to marshal response body as JSON: %w", err)
		}
		tmplResult["body"] = string(b)
	}

	b, err := json.Marshal(tmplResult)
	if err != nil {
		slog.Error("Failed to marshal template result as JSON", "error", err)
	}

	var result types.MockResponse
	if err = json.Unmarshal(b, &result); err != nil {
		slog.Error("Failed to unmarshal response as mock response", "error", err)
	}

	return &result, nil
}
