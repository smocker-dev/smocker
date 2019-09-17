package templates

import (
	"github.com/Thiht/smock/types"
)

type TemplateEngine interface {
	Execute(request types.Request, script string) *types.MockResponse
}

func GenerateMockResponse(d *types.DynamicMockResponse, request types.Request) *types.MockResponse {
	var engine TemplateEngine
	if d.Engine == types.GoTemplateEngineKey {
		engine = NewGoTemplateEngine()
	} else if d.Engine == types.LuaEngineKey {
		engine = NewLuaEngine()
	}
	return engine.Execute(request, d.Script)
}
