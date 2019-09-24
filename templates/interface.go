package templates

import (
	"fmt"

	"github.com/Thiht/smocker/types"
)

type TemplateEngine interface {
	Execute(request types.Request, script string) (*types.MockResponse, error)
}

func GenerateMockResponse(d *types.DynamicMockResponse, request types.Request) (*types.MockResponse, error) {
	switch d.Engine {
	case types.GoTemplateEngineID:
		return NewGoTemplateEngine().Execute(request, d.Script)
	case types.LuaEngineID:
		return NewLuaEngine().Execute(request, d.Script)
	default:
		return nil, fmt.Errorf("invalid engine: %q", d.Engine)
	}
}
