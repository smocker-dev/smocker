package templates

import (
	"github.com/Thiht/smocker/types"
)

type TemplateEngine interface {
	Execute(request types.Request, script string) *types.MockResponse
}

func GenerateMockResponse(d *types.DynamicMockResponse, request types.Request) *types.MockResponse {
	switch d.Engine {
	case types.GoTemplateEngineID:
		return NewGoTemplateEngine().Execute(request, d.Script)
	case types.LuaEngineID:
		return NewLuaEngine().Execute(request, d.Script)
	default:
		return nil
	}
}
