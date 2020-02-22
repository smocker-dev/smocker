package server

import (
	"html/template"
	"io"
	"net/http"
	"strconv"

	"github.com/Thiht/smocker/server/config"
	"github.com/Thiht/smocker/server/handlers"
	"github.com/labstack/echo"
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
	mockServer := NewMockServer(config.MockServerListenPort)

	e := echo.New()
	e.HideBanner = true
	e.HidePort = true

	e.Use(recoverMiddleware(), loggerMiddleware())

	handler := handlers.NewAdmin(mockServer)

	// Admin Routes
	e.GET("/mocks", handler.GetMocks)
	e.POST("/mocks", handler.AddMocks)
	e.GET("/history", handler.GetHistory)
	e.GET("/sessions", handler.GetSessions)
	e.POST("/sessions", handler.NewSession)
	e.PUT("/sessions", handler.UpdateSession)
	e.GET("/sessions/summary", handler.SummarizeSessions)
	e.POST("/sessions/import", handler.ImportSession)
	e.POST("/verify", handler.Verify)
	e.POST("/reset", handler.Reset)

	// Health Check Route
	e.GET("/version", func(c echo.Context) error {
		return c.JSON(http.StatusOK, config.Build)
	})

	// UI Routes
	e.Static("/assets", config.StaticFiles)
	e.GET("/*", renderIndex(e, config))

	log.WithField("port", config.ConfigListenPort).Info("Starting config server")
	if err := e.Start(":" + strconv.Itoa(config.ConfigListenPort)); err != nil {
		log.WithError(err).Fatal("Config server execution failed")
	}
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
