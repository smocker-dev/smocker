package types

type Engine string

const (
	EngineGoTemplateYAML Engine = "go-template-yaml"
	EngineGoTemplateJSON Engine = "go-template-json"
)

var TemplateEngines = [...]Engine{
	EngineGoTemplateYAML,
	EngineGoTemplateJSON,
}

func (e Engine) IsValid() bool {
	for _, engine := range TemplateEngines {
		if e == engine {
			return true
		}
	}

	return false
}
