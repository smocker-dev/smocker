package templates

import (
	"bytes"
	"encoding/json"
	"fmt"
	"text/template"

	"github.com/Thiht/smock/history"
)

const GoTemplateEngineKey = "go_template"

type GoTemplateEngine struct{}

func NewGoTemplateEngine() TemplateEngine {
	return &GoTemplateEngine{}
}

func (*GoTemplateEngine) Execute(request history.Request, script string, result interface{}) error {
	tmpl, err := template.New("engine").Parse(script)
	if err != nil {
		return fmt.Errorf("Failed to parse dynamic template: %w", err)
	}

	buffer := new(bytes.Buffer)
	err = tmpl.Execute(buffer, request)
	if err != nil {
		return fmt.Errorf("Failed to execute dynamic template: %w", err)
	}

	err = json.Unmarshal(buffer.Bytes(), result)
	if err != nil {
		return fmt.Errorf("Failed to unmarshal response from dynamic template: %w", err)
	}

	return nil
}
