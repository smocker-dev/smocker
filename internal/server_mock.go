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
)

func startMockServer(ctx context.Context, config Config, mocksHandler *handlers.MocksHandler) error {
	var httpHandler http.Handler = http.HandlerFunc(mocksHandler.GenericHandler)
	httpHandler = middlewares.Recover(httpHandler)

	server := &http.Server{
		BaseContext: func(net.Listener) context.Context {
			return ctx
		},
		Addr:              ":" + strconv.Itoa(config.MockServerListenPort),
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
		slog.Info("shutting down mock server", slog.Any("reason", ctx.Err()))

		timeoutCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		if err := server.Shutdown(timeoutCtx); err != nil { //nolint: contextcheck
			if !errors.Is(err, http.ErrServerClosed) {
				slog.Error("failed to shutdown mock server", slog.Any("error", err))
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

	slog.Info("starting mock server", slog.Int("port", config.MockServerListenPort), slog.Bool("tls", config.TLSEnable))
	if err := serve(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		slog.Error("mock server failed unexpectedly", slog.Any("error", err))
		return fmt.Errorf("mock server failed unexpectedly: %w", err)
	}

	slog.Info("mock server shutdown successfully")
	return nil
}
