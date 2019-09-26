package templates

import (
	"bytes"
	"fmt"
	"text/template"

	"github.com/Masterminds/sprig"
	"github.com/Thiht/smocker/types"
	log "github.com/sirupsen/logrus"
	"gopkg.in/yaml.v3"
)

type goTemplateEngine struct{}

func NewGoTemplateEngine() TemplateEngine {
	return &goTemplateEngine{}
}

func (*goTemplateEngine) Execute(request types.Request, script string) (*types.MockResponse, error) {
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
