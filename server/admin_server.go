package server

import (
	"crypto/tls"
	"html/template"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strconv"

	"github.com/Thiht/smocker/server/config"
	"github.com/Thiht/smocker/server/handlers"
	"github.com/Thiht/smocker/server/services"
	"github.com/Thiht/smocker/server/types"
	"github.com/facebookgo/grace/gracehttp"
	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
	log "github.com/sirupsen/logrus"
	"gopkg.in/yaml.v3"
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

	// Load mocks from the directory
	if len(config.MockFilesDirectory) > 0 {
		if err := loadMocksFromDir(mockServices, config.MockFilesDirectory); err != nil {
			log.WithError(err).Error("loadMocksFromDir")
		}
	}

	// Admin Routes
	mocksGroup := adminServerEngine.Group("/mocks")
	mocksGroup.GET("", handler.GetMocks)
	mocksGroup.POST("", handler.AddMocks)
	mocksGroup.POST("/lock", handler.LockMocks)
	mocksGroup.POST("/unlock", handler.UnlockMocks)

	historyGroup := adminServerEngine.Group("/history")
	historyGroup.GET("", handler.GetHistory)
	historyGroup.GET("/summary", handler.SummarizeHistory)

	sessionsGroup := adminServerEngine.Group("/sessions")
	sessionsGroup.GET("", handler.GetSessions)
	sessionsGroup.POST("", handler.NewSession)
	sessionsGroup.PUT("", handler.UpdateSession)
	sessionsGroup.POST("/verify", handler.VerifySession)
	sessionsGroup.GET("/summary", handler.SummarizeSessions)
	sessionsGroup.POST("/import", handler.ImportSession)

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

	if config.TLSEnable {
		certificate, err := tls.LoadX509KeyPair(config.TLSCertFile, config.TLSKeyFile)
		if err != nil {
			log.WithFields(log.Fields{
				"tls-cert-file": config.TLSCertFile,
				"tls-key-file":  config.TLSKeyFile,
			}).Fatalf("Invalid certificate: %v", err)
		}

		adminServerEngine.Server.TLSConfig = &tls.Config{
			NextProtos:   []string{"http/1.1"},
			Certificates: []tls.Certificate{certificate},
		}
		mockServerEngine.TLSConfig = &tls.Config{
			NextProtos:   []string{"http/1.1"},
			Certificates: []tls.Certificate{certificate},
		}
	}

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

func loadMocksFromDir(mockServices services.Mocks, dir string) error {
	sessionName := "static_mock_files"

	ses, err := mockServices.GetSessionByID(sessionName)
	if err != nil {
		ses = mockServices.NewSession(sessionName)
		err = nil
	}

	return filepath.Walk(dir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}

		if info.IsDir() {
			// do not traverse dirs beyond the provided 'dir'
			return nil
		}

		filePath, err := filepath.Abs(path)
		if err != nil {
			return err
		}

		f, err := os.Open(filePath)
		if err != nil {
			return err
		}
		defer f.Close()

		var mocks types.Mocks
		if err := yaml.NewDecoder(f).Decode(&mocks); err != nil {
			return err
		}

		for _, m := range mocks {
			_, err := mockServices.AddMock(ses.ID, m)
			if err != nil {
				return err
			}
		}

		return nil
	})
}
