package templates

import (
	"fmt"

	"github.com/Thiht/smock/history"
	log "github.com/sirupsen/logrus"
	"github.com/yuin/gluamapper"
	lua "github.com/yuin/gopher-lua"
	luar "layeh.com/gopher-luar"
)

const LuaEngineKey = "lua"

type luaEngine struct{}

func NewLuaEngine() TemplateEngine {
	return &luaEngine{}
}

func (*luaEngine) Execute(request history.Request, script string, result interface{}) error {
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
			return fmt.Errorf("Failed to load Lua libraries: %w", err)
		}
	}
	if err := luaState.DoString("coroutine=nil;debug=nil;io=nil;open=nil;os=nil"); err != nil {
		log.WithError(err).Error("Failed to sandbox Lua environment")
		return fmt.Errorf("Failed to sandbox Lua environment: %w", err)
	}

	luaState.SetGlobal("request", luar.New(luaState, request))
	if err := luaState.DoString(script); err != nil {
		log.WithError(err).Error("Failed to execute dynamic template")
		return fmt.Errorf("Failed to execute dynamic template: %w", err)
	}

	if err := gluamapper.Map(luaState.Get(-1).(*lua.LTable), result); err != nil {
		log.WithError(err).Error("Invalid result from Lua script")
		return fmt.Errorf("Invalid result from Lua script: %w", err)
	}

	return nil
}
