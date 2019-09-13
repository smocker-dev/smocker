package main

import (
	"net/http"

	log "github.com/sirupsen/logrus"
	"github.com/yuin/gluamapper"
	lua "github.com/yuin/gopher-lua"
	luar "layeh.com/gopher-luar"
)

type TemplateEngine interface {
	Execute(request Request, script string) *MockResponse
}

type luaEngine struct{}

func NewLuaEngine() TemplateEngine {
	return &luaEngine{}
}

func (*luaEngine) Execute(request Request, script string) *MockResponse {
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
			return &MockResponse{
				Status: http.StatusInternalServerError,
				Body:   "Failed to load Lua libraries: " + err.Error(),
			}
		}
	}
	if err := luaState.DoString("coroutine=nil;debug=nil;io=nil;open=nil;os=nil"); err != nil {
		log.WithError(err).Error("Failed to sandbox Lua environment")
		return &MockResponse{
			Status: http.StatusInternalServerError,
			Body:   "Failed to sandbox Lua environment: " + err.Error(),
		}
	}

	luaState.SetGlobal("request", luar.New(luaState, request))
	if err := luaState.DoString(script); err != nil {
		log.WithError(err).Error("Failed to execute dynamic template")
		return &MockResponse{
			Status: http.StatusInternalServerError,
			Body:   "Failed to execute dynamic template: " + err.Error(),
		}
	}

	var response MockResponse
	if err := gluamapper.Map(luaState.Get(-1).(*lua.LTable), &response); err != nil {
		log.WithError(err).Error("Invalid result from Lua script")
		return &MockResponse{
			Status: http.StatusInternalServerError,
			Body:   "Invalid result from Lua script: " + err.Error(),
		}
	}

	return &response
}
