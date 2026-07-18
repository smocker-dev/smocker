package server

import (
	"context"
	"crypto/tls"
	"errors"
	"fmt"
	"html/template"
	"io"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"syscall"
	"time"

	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
	"github.com/smocker-dev/smocker/server/config"
	"github.com/smocker-dev/smocker/server/frontend"
	"github.com/smocker-dev/smocker/server/handlers"
	"github.com/smocker-dev/smocker/server/services"
	"golang.org/x/sync/errgroup"
)

// shutdownTimeout is how long in-flight requests are given to drain on shutdown.
const shutdownTimeout = 10 * time.Second

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
	mocksGroup := adminServerEngine.Group("/mocks")
	mocksGroup.GET("", handler.GetMocks)
	mocksGroup.POST("", handler.AddMocks)
	mocksGroup.POST("/lock", handler.LockMocks)
	mocksGroup.POST("/unlock", handler.UnlockMocks)
	mocksGroup.PUT("/:id", handler.UpdateMock)
	mocksGroup.DELETE("/:id", handler.DeleteMock)

	historyGroup := adminServerEngine.Group("/history")
	historyGroup.GET("", handler.GetHistory)
	historyGroup.GET("/summary", handler.SummarizeHistory)
	historyGroup.DELETE("", handler.DeleteHistory)

	sessionsGroup := adminServerEngine.Group("/sessions")
	sessionsGroup.GET("", handler.GetSessions)
	sessionsGroup.POST("", handler.NewSession)
	sessionsGroup.PUT("", handler.UpdateSession)
	sessionsGroup.DELETE("/:id", handler.DeleteSession)
	sessionsGroup.POST("/verify", handler.VerifySession)
	sessionsGroup.GET("/summary", handler.SummarizeSessions)
	sessionsGroup.POST("/import", handler.ImportSession)

	adminServerEngine.POST("/reset", handler.Reset)

	// Health Check Route
	adminServerEngine.GET("/version", func(c echo.Context) error {
		return c.JSON(http.StatusOK, config.Build)
	})

	// UI Routes: serve from --static-files on disk when it holds a built index.html (development
	// or an explicit override); otherwise fall back to the client embedded in the binary, so a
	// released binary is self-contained.
	if fileExists(config.StaticFiles + "/index.html") {
		adminServerEngine.Static("/assets", config.StaticFiles)
	} else if embedded, ok := frontend.FS(); ok {
		adminServerEngine.StaticFS("/assets", embedded)
	}
	adminServerEngine.GET("/*", renderIndex(adminServerEngine, config))

	slog.Info("Starting admin server", "port", config.ConfigListenPort)
	slog.Info("Starting mock server", "port", config.MockServerListenPort)
	adminServerEngine.Server.Addr = ":" + strconv.Itoa(config.ConfigListenPort)

	if config.TLSEnable {
		certificate, err := tls.LoadX509KeyPair(config.TLSCertFile, config.TLSKeyFile)
		if err != nil {
			slog.Error(fmt.Sprintf("Invalid certificate: %v", err), "tls-cert-file", config.TLSCertFile, "tls-key-file", config.TLSKeyFile)
			os.Exit(1)
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

	if err := serve(config.TLSEnable, adminServerEngine.Server, mockServerEngine); err != nil {
		slog.Error("fatal error", "error", err)
		os.Exit(1)
	}
	slog.Info("Shutting down gracefully")
}

// serve starts every provided HTTP server and blocks until an interrupt/terminate signal is
// received or one of the servers fails to start. On signal it drains in-flight requests via
// Server.Shutdown. This replaces the abandoned facebookgo/grace dependency; it keeps graceful
// shutdown (SIGINT/SIGTERM) but drops grace's SIGHUP fork-exec restart, which Smocker did not
// use (configuration is read once at startup).
func serve(tlsEnable bool, servers ...*http.Server) error {
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	g, gctx := errgroup.WithContext(ctx)
	for _, srv := range servers {
		srv := srv
		g.Go(func() error {
			var err error
			if tlsEnable {
				// Certificates are provided via srv.TLSConfig, so the file paths are empty.
				err = srv.ListenAndServeTLS("", "")
			} else {
				err = srv.ListenAndServe()
			}
			if errors.Is(err, http.ErrServerClosed) {
				return nil
			}
			return err
		})
	}

	// Once the context is cancelled (signal received, or a server returned an error via the
	// errgroup context), gracefully shut every server down.
	g.Go(func() error {
		<-gctx.Done()
		shutdownCtx, cancel := context.WithTimeout(context.Background(), shutdownTimeout)
		defer cancel()
		for _, srv := range servers {
			_ = srv.Shutdown(shutdownCtx)
		}
		return nil
	})

	return g.Wait()
}

// fileExists reports whether path exists (used to prefer an on-disk UI over the embedded one).
func fileExists(path string) bool {
	_, err := os.Stat(path)
	return err == nil
}

func renderIndex(e *echo.Echo, cfg config.Config) echo.HandlerFunc {
	return func(c echo.Context) error {
		// Parse index.html once: from --static-files on disk if present (dev/override), otherwise
		// from the client embedded in the binary. In development the client may not be built yet.
		if templateRenderer == nil {
			var (
				tmpl *template.Template
				err  error
			)
			if diskIndex := cfg.StaticFiles + "/index.html"; fileExists(diskIndex) {
				tmpl, err = template.ParseFiles(diskIndex)
			} else if embedded, ok := frontend.FS(); ok {
				tmpl, err = template.ParseFS(embedded, "index.html")
			} else {
				return c.String(http.StatusNotFound, "index is building...")
			}
			if err != nil {
				return c.String(http.StatusNotFound, "index is building...")
			}
			templateRenderer = &TemplateRenderer{tmpl}
			e.Renderer = templateRenderer
		}

		return c.Render(http.StatusOK, "index.html", echo.Map{
			"basePath": cfg.ConfigBasePath,
			"version":  cfg.Build.BuildVersion,
		})
	}
}
