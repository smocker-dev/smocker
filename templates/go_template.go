package templates

import (
	"bytes"
	"encoding/json"
	"fmt"
	"text/template"

	"github.com/Thiht/smocker/types"
	log "github.com/sirupsen/logrus"
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

	var tmp map[string]interface{}
	if err = json.Unmarshal(buffer.Bytes(), &tmp); err != nil {
		log.WithError(err).Error("Failed to unmarshal response from dynamic template")
		return nil, fmt.Errorf("failed to unmarshal response from dynamic template: %w")
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
	if err = json.Unmarshal(b, &result); err != nil {
		log.WithError(err).Error("Failed to unmarshal response as mock response")
	}

	return &result, nil
}
