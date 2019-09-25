package templates

import (
	"fmt"

	"github.com/Thiht/smocker/types"
	json "github.com/layeh/gopher-json"
	log "github.com/sirupsen/logrus"
	"github.com/yuin/gluamapper"
	lua "github.com/yuin/gopher-lua"
	luar "layeh.com/gopher-luar"
)

type luaEngine struct{}

func NewLuaEngine() TemplateEngine {
	return &luaEngine{}
}

func (*luaEngine) Execute(request types.Request, script string) (*types.MockResponse, error) {
	luaState := lua.NewState(lua.Options{
		SkipOpenLibs: true,
	})
	defer luaState.Close()

	for _, pair := range []struct {
		n string
		f lua.LGFunction
	}{
		{lua.LoadLibName, lua.OpenPackage},
		{lua.BaseLibName, lua.OpenBase},
		{lua.MathLibName, lua.OpenMath},
		{lua.StringLibName, lua.OpenString},
		{lua.TabLibName, lua.OpenTable},
	} {
		if err := luaState.CallByParam(
			lua.P{
				Fn:      luaState.NewFunction(pair.f),
				NRet:    0,
				Protect: true,
			},
			lua.LString(pair.n),
		); err != nil {
			log.WithError(err).Error("Failed to load Lua libraries")
			return nil, fmt.Errorf("failed to load Lua libraries: %w", err)
		}
	}
	if err := luaState.DoString("coroutine=nil;debug=nil;io=nil;open=nil;os=nil"); err != nil {
		log.WithError(err).Error("Failed to sandbox Lua environment")
		return nil, fmt.Errorf("failed to sandbox Lua environment: %w", err)
	}

	luaState.SetGlobal("request", luar.New(luaState, request))
	if err := luaState.DoString(script); err != nil {
		log.WithError(err).Error("Failed to execute Lua script")
		return nil, fmt.Errorf("failed to execute Lua script: %w", err)
	}

	luaResult := luaState.Get(-1).(*lua.LTable)
	body := luaResult.RawGetString("body")
	if body.Type() == lua.LTTable {
		// FIXME: this should depend on the Content-Type of the luaResult
		b, _ := json.Encode(body)
		luaResult.RawSetString("body", lua.LString(string(b)))
	}

	var result types.MockResponse
	if err := gluamapper.Map(luaResult, &result); err != nil {
		log.WithError(err).Error("Invalid result from Lua script")
		return nil, fmt.Errorf("invalid result from Lua script: %w", err)
	}

	return &result, nil
}
