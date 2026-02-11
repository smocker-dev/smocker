package engines

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"text/template"

	"github.com/Masterminds/sprig/v3"
	"github.com/smocker-dev/smocker/internal/types"
	"gopkg.in/yaml.v3"
)

type goTemplateYAMLEngine struct{}

var _ Engine = (*goTemplateYAMLEngine)(nil)

func NewGoTemplateYAMLEngine() *goTemplateYAMLEngine {
	return &goTemplateYAMLEngine{}
}

func (*goTemplateYAMLEngine) Execute(ctx context.Context, request types.Request, script string) (types.MockResponse, error) {
	tmpl, err := template.New(string(types.EngineGoTemplateYAML)).Funcs(sprig.TxtFuncMap()).Parse(script)
	if err != nil {
		return types.MockResponse{}, fmt.Errorf("failed to parse dynamic template: %w", err)
	}

	var buffer bytes.Buffer
	if err := tmpl.Execute(&buffer, map[string]any{
		"Request": request,
	}); err != nil {
		return types.MockResponse{}, fmt.Errorf("failed to execute dynamic template: %w", err)
	}

	var result types.MockResponse
	if err := yaml.Unmarshal(buffer.Bytes(), &result); err != nil {
		return types.MockResponse{}, fmt.Errorf("failed to unmarshal response from dynamic template: %w", err)
	}

	return result, nil
}

type goTemplateJSONEngine struct{}

var _ Engine = (*goTemplateJSONEngine)(nil)

func NewGoTemplateJSONEngine() *goTemplateJSONEngine {
	return &goTemplateJSONEngine{}
}

func (*goTemplateJSONEngine) Execute(ctx context.Context, request types.Request, script string) (types.MockResponse, error) {
	tmpl, err := template.New(string(types.EngineGoTemplateJSON)).Funcs(sprig.TxtFuncMap()).Parse(script)
	if err != nil {
		return types.MockResponse{}, fmt.Errorf("failed to parse dynamic template: %w", err)
	}

	var buffer bytes.Buffer
	if err := tmpl.Execute(&buffer, map[string]any{
		"Request": request,
	}); err != nil {
		return types.MockResponse{}, fmt.Errorf("failed to execute dynamic template: %w", err)
	}

	var result types.MockResponse
	if err := json.Unmarshal(buffer.Bytes(), &result); err != nil {
		return types.MockResponse{}, fmt.Errorf("failed to unmarshal response from dynamic template: %w", err)
	}

	return result, nil
}
