package types

type Engine string

const (
	GoTemplateEngineID     Engine = "go_template"
	GoTemplateYamlEngineID Engine = "go_template_yaml"
	GoTemplateJsonEngineID Engine = "go_template_json"
	LuaEngineID            Engine = "lua"
)

var TemplateEngines = []Engine{GoTemplateEngineID, GoTemplateYamlEngineID, GoTemplateJsonEngineID, LuaEngineID}

func (e Engine) IsValid() bool {
	for _, existingEngine := range TemplateEngines {
		if e == existingEngine {
			return true
		}
	}
	return false
}
