package main

import (
	"context"
	"database/sql"
	"fmt"
	"log/slog"
	"os"
	"os/signal"
	"syscall"

	"github.com/smocker-dev/smocker/internal/handlers"
	"github.com/smocker-dev/smocker/internal/services"
	"github.com/smocker-dev/smocker/internal/stores"
	"golang.org/x/sync/errgroup"

	_ "embed"
	_ "github.com/jackc/pgx/v5/stdlib"
	_ "modernc.org/sqlite"
	_ "time/tzdata"
)

func main() {
	if err := run(); err != nil {
		os.Exit(1)
	}
}

func run() error {
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, os.Kill, syscall.SIGTERM)
	defer stop()

	config, err := parseConfig()
	if err != nil {
		slog.Error("failed to parse configuration", slog.Any("error", err))
		return fmt.Errorf("failed to parse configuration: %w", err)
	}
	setupLogger(config.LogFormat, config.LogLevel)

	var persistentStore stores.PersistentStore
	switch config.Persistence {
	case "sqlite":
		setupGoose()

		db, err := sql.Open("sqlite", config.PersistenceSQLiteDSN)
		if err != nil {
			slog.Error("failed to connect to SQLite database", slog.Any("error", err))
			return fmt.Errorf("failed to connect to SQLite database: %w", err)
		}
		defer db.Close()

		persistentStore, err = stores.NewSQLiteStore(db)
		if err != nil {
			slog.Error("failed to create SQLite store", slog.Any("error", err))
			return fmt.Errorf("failed to create SQLite store: %w", err)
		}

	case "postgres":
		setupGoose()

		db, err := sql.Open("pgx", config.PersistencePostgresDSN)
		if err != nil {
			slog.Error("failed to connect to Postgres database", slog.Any("error", err))
			return fmt.Errorf("failed to connect to Postgres database: %w", err)
		}
		defer db.Close()

		persistentStore, err = stores.NewPostgresStore(db)
		if err != nil {
			slog.Error("failed to create Postgres store", slog.Any("error", err))
			return fmt.Errorf("failed to create Postgres store: %w", err)
		}

	case "memory":
		persistentStore = stores.NewNoopStore()

	default:
		slog.Error("unknown persistence type", slog.String("persistence", config.Persistence))
		return fmt.Errorf("unknown persistence type %q", config.Persistence)
	}

	memoryStore, err := stores.NewMemoryStoreTx(ctx, persistentStore)
	if err != nil {
		slog.Error("failed to create memory store", slog.Any("error", err))
		return fmt.Errorf("failed to create memory store: %w", err)
	}

	timelinesService := services.NewTimelinesService(memoryStore)
	timelinesHandler := handlers.NewTimelinesHandler(timelinesService)

	mocksService := services.NewMocksService(memoryStore)
	mocksHandler := handlers.NewMocksHandler(mocksService)

	g, gCtx := errgroup.WithContext(ctx)
	g.Go(func() error {
		return startConfigServer(gCtx, config, timelinesHandler)
	})
	g.Go(func() error {
		return startMockServer(gCtx, config, mocksHandler)
	})
	if err := g.Wait(); err != nil {
		return err //nolint: wrapcheck
	}

	return nil
}
