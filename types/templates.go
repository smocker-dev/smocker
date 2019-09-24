package types

type Engine string

const (
	GoTemplateEngineID Engine = "go_template"
	LuaEngineID        Engine = "lua"
)

var TemplateEngines = []Engine{GoTemplateEngineID, LuaEngineID}

func (e Engine) IsValid() bool {
	for _, existingEngine := range TemplateEngines {
		if e == existingEngine {
			return true
		}
	}
	return false
}
