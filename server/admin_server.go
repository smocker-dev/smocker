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
	adminServerEngine.GET("/mocks", handler.GetMocks)
	adminServerEngine.POST("/mocks", handler.AddMocks)
	adminServerEngine.GET("/history", handler.GetHistory)
	adminServerEngine.GET("/history/summary", handler.SummarizeHistory)
	adminServerEngine.GET("/sessions", handler.GetSessions)
	adminServerEngine.POST("/sessions", handler.NewSession)
	adminServerEngine.PUT("/sessions", handler.UpdateSession)
	adminServerEngine.POST("/sessions/verify", handler.VerifySession)
	adminServerEngine.GET("/sessions/summary", handler.SummarizeSessions)
	adminServerEngine.POST("/sessions/import", handler.ImportSession)
	adminServerEngine.POST("/reset", handler.Reset)

	// Health Check Route
	adminServerEngine.GET("/version", func(c echo.Context) error {
		return c.JSON(http.StatusOK, config.Build)
	})

	// UI Routes
	adminServerEngine.Static("/assets", config.StaticFiles)
	adminServerEngine.GET("/*", renderIndex(adminServerEngine, config))

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
			"basePath": "/",
			"version":  cfg.Build.BuildVersion,
		})
	}
}
