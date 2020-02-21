package templates

import (
	"fmt"

	"github.com/Thiht/smocker/server/types"
)

type TemplateEngine interface {
	Execute(request types.Request, script string) (*types.MockResponse, error)
}

func GenerateMockResponse(d *types.DynamicMockResponse, request types.Request) (*types.MockResponse, error) {
	switch d.Engine {
	case types.GoTemplateEngineID, types.GoTemplateYamlEngineID:
		return NewGoTemplateYamlEngine().Execute(request, d.Script)
	case types.GoTemplateJsonEngineID:
		return NewGoTemplateJsonEngine().Execute(request, d.Script)
	case types.LuaEngineID:
		return NewLuaEngine().Execute(request, d.Script)
	default:
		return nil, fmt.Errorf("invalid engine: %q", d.Engine)
	}
}
