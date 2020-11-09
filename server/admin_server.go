package server

import (
	"html/template"
	"io"
	"net/http"
	"strconv"

	"github.com/Thiht/smocker/server/config"
	"github.com/Thiht/smocker/server/handlers"
	"github.com/Thiht/smocker/server/services"
	"github.com/facebookgo/grace/gracehttp"
	"github.com/labstack/echo"
	"github.com/labstack/echo/middleware"
	log "github.com/sirupsen/logrus"
)

// TemplateRenderer is a custom html/template renderer for Echo framework
type TemplateRenderer struct {
	*template.Template
}

// Render renders a template document
func (t *TemplateRenderer) Render(w io.Writer, name string, data interface{}, c echo.Context) error {
	return t.ExecuteTemplate(w, name, data)
}

var templateRenderer *TemplateRenderer

func Serve(config config.Config) {
	adminServerEngine := echo.New()
	adminServerEngine.HideBanner = true
	adminServerEngine.HidePort = true

	adminServerEngine.Use(recoverMiddleware(), loggerMiddleware(), middleware.Gzip())

	mockServerEngine, mockServices := NewMockServer(config)
	graphServices := services.NewGraph()
	handler := handlers.NewAdmin(mockServices, graphServices)

	// Admin Routes
	adminServerEngine.GET(config.ConfigBasePath+"/mocks", handler.GetMocks)
	adminServerEngine.POST(config.ConfigBasePath+"/mocks", handler.AddMocks)
	adminServerEngine.POST(config.ConfigBasePath+"/mocks/lock", handler.LockMocks)
	adminServerEngine.POST(config.ConfigBasePath+"/mocks/unlock", handler.UnlockMocks)
	adminServerEngine.GET(config.ConfigBasePath+"/history", handler.GetHistory)
	adminServerEngine.GET(config.ConfigBasePath+"/history/summary", handler.SummarizeHistory)
	adminServerEngine.GET(config.ConfigBasePath+"/sessions", handler.GetSessions)
	adminServerEngine.POST(config.ConfigBasePath+"/sessions", handler.NewSession)
	adminServerEngine.PUT(config.ConfigBasePath+"/sessions", handler.UpdateSession)
	adminServerEngine.POST(config.ConfigBasePath+"/sessions/verify", handler.VerifySession)
	adminServerEngine.GET(config.ConfigBasePath+"/sessions/summary", handler.SummarizeSessions)
	adminServerEngine.POST(config.ConfigBasePath+"/sessions/import", handler.ImportSession)
	adminServerEngine.POST(config.ConfigBasePath+"/reset", handler.Reset)

	// Health Check Route
	adminServerEngine.GET(config.ConfigBasePath+"/version", func(c echo.Context) error {
		return c.JSON(http.StatusOK, config.Build)
	})

	// UI Routes
	adminServerEngine.Static(config.ConfigBasePath+"/assets", config.StaticFiles)
	adminServerEngine.GET(config.ConfigBasePath+"/*", renderIndex(adminServerEngine, config))

	log.WithField("port", config.ConfigListenPort).Info("Starting admin server")
	log.WithField("port", config.MockServerListenPort).Info("Starting mock server")
	adminServerEngine.Server.Addr = ":" + strconv.Itoa(config.ConfigListenPort)
	if err := gracehttp.Serve(adminServerEngine.Server, mockServerEngine); err != nil {
		log.Fatal(err)
	}
	log.Info("Shutting down gracefully")
}

func renderIndex(e *echo.Echo, cfg config.Config) echo.HandlerFunc {
	return func(c echo.Context) error {
		// In development mode, index.html might not be available yet
		if templateRenderer == nil {
			template, err := template.ParseFiles(cfg.StaticFiles + "/index.html")
			if err != nil {
				return c.String(http.StatusNotFound, "index is building...")
			}
			templateRenderer := &TemplateRenderer{template}
			e.Renderer = templateRenderer
		}

		return c.Render(http.StatusOK, "index.html", echo.Map{
			"basePath": cfg.ConfigBasePath,
			"version":  cfg.Build.BuildVersion,
		})
	}
}
