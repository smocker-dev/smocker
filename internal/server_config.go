package main

import (
	"context"
	"crypto/tls"
	"errors"
	"fmt"
	"log/slog"
	"net"
	"net/http"
	"strconv"
	"time"

	"github.com/smocker-dev/smocker/internal/handlers"
	"github.com/smocker-dev/smocker/internal/handlers/middlewares"
	"github.com/smocker-dev/smocker/internal/handlers/render"
	"github.com/smocker-dev/smocker/public"
)

func startConfigServer(ctx context.Context, config Config, timelinesHandler *handlers.TimelinesHandler) error {
	muxConfig := http.NewServeMux()

	muxConfig.HandleFunc("PUT /timelines/settings", timelinesHandler.UpdateSettings)
	muxConfig.HandleFunc("GET /timelines/export", timelinesHandler.ExportTimelines)
	muxConfig.HandleFunc("POST /timelines/import", timelinesHandler.ImportTimelines)

	muxConfig.HandleFunc("POST /timelines", timelinesHandler.CreateTimeline)
	muxConfig.HandleFunc("PUT /timelines/{timelineID}", timelinesHandler.UpdateTimeline)
	muxConfig.HandleFunc("POST /timelines/{timelineID}/use", timelinesHandler.UseTimeline)

	muxConfig.HandleFunc("GET /timelines", timelinesHandler.ListTimelines)
	muxConfig.HandleFunc("GET /timelines/current", timelinesHandler.GetCurrentTimeline)
	muxConfig.HandleFunc("GET /timelines/{timelineID}", timelinesHandler.GetTimeline)

	muxConfig.HandleFunc("DELETE /timelines/current", timelinesHandler.DeleteCurrentTimeline)
	muxConfig.HandleFunc("DELETE /timelines/{timelineID}", timelinesHandler.DeleteTimeline)

	muxConfig.HandleFunc("GET /timelines/current/mocks", timelinesHandler.ListCurrentTimelineMocks)
	muxConfig.HandleFunc("GET /timelines/{timelineID}/mocks", timelinesHandler.ListTimelineMocks)

	muxConfig.HandleFunc("GET /timelines/current/mocks/{mockID}", timelinesHandler.GetCurrentTimelineMock)
	muxConfig.HandleFunc("GET /timelines/{timelineID}/mocks/{mockID}", timelinesHandler.GetTimelineMock)

	muxConfig.HandleFunc("POST /timelines/current/mocks", timelinesHandler.PushMocksToCurrentTimeline)
	muxConfig.HandleFunc("POST /timelines/{timelineID}/mocks", timelinesHandler.PushMocksToTimeline)

	muxConfig.HandleFunc("GET /timelines/current/history", timelinesHandler.GetCurrentTimelineHistory)
	muxConfig.HandleFunc("GET /timelines/{timelineID}/history", timelinesHandler.GetTimelineHistory)

	muxConfig.HandleFunc("DELETE /timelines/current/history", timelinesHandler.DeleteCurrentTimelineHistory)
	muxConfig.HandleFunc("DELETE /timelines/{timelineID}/history", timelinesHandler.DeleteTimelineHistory)

	muxConfig.HandleFunc("GET /ping", func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusNoContent)
	})
	muxConfig.HandleFunc("GET /version", func(w http.ResponseWriter, _ *http.Request) {
		render.JSON(w, http.StatusOK, config.BuildInfo)
	})
	muxConfig.HandleFunc("GET /openapi.yml", func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Disposition", "attachment; filename=openapi.yml")
		w.Header().Set("Content-Type", "application/yaml")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write(public.OpenAPIYAML)
	})

	var httpHandler http.Handler = muxConfig
	httpHandler = middlewares.Recover(httpHandler)
	httpHandler = middlewares.Log(httpHandler, "/ping", "/version", "/openapi.yml")
	httpHandler = middlewares.CORS(httpHandler)
	httpHandler = middlewares.Compress(httpHandler)

	server := &http.Server{
		BaseContext: func(net.Listener) context.Context {
			return ctx
		},
		Addr:              ":" + strconv.Itoa(config.ConfigServerListenPort),
		Handler:           httpHandler,
		IdleTimeout:       60 * time.Second,
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       10 * time.Second,
		WriteTimeout:      10 * time.Second,
	}

	if config.TLSEnable {
		server.TLSConfig = &tls.Config{
			NextProtos:   []string{"h2", "http/1.1"},
			Certificates: []tls.Certificate{config.TLSCertificate},
			MinVersion:   tls.VersionTLS12,
		}
	}

	go func() {
		<-ctx.Done()
		slog.Info("shutting down config server", slog.Any("reason", ctx.Err()))

		timeoutCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		if err := server.Shutdown(timeoutCtx); err != nil { //nolint: contextcheck
			if !errors.Is(err, http.ErrServerClosed) {
				slog.Error("failed to shutdown config server", slog.Any("error", err))
				return
			}
		}
	}()

	serve := server.ListenAndServe
	if config.TLSEnable {
		serve = func() error {
			return server.ListenAndServeTLS("", "")
		}
	}

	slog.Info("starting config server", slog.Int("port", config.ConfigServerListenPort), slog.Bool("tls", config.TLSEnable))
	if err := serve(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		slog.Error("config server failed unexpectedly", slog.Any("error", err))
		return fmt.Errorf("config server failed unexpectedly: %w", err)
	}

	slog.Info("config server shutdown successfully")
	return nil
}
