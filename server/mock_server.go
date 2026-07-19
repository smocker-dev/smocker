package server

import (
	"log/slog"
	"net/http"
	"os"
	"strconv"

	"github.com/labstack/echo/v4"
	"github.com/smocker-dev/smocker/server/config"
	"github.com/smocker-dev/smocker/server/handlers"
	"github.com/smocker-dev/smocker/server/services"
)

func NewMockServer(cfg config.Config) (*http.Server, services.Mocks) {
	mockServerEngine := echo.New()
	persistence := services.NewPersistence(cfg.PersistenceDirectory)
	sessions, err := persistence.LoadSessions()
	if err != nil {
		slog.Error("Unable to load sessions", "error", err)
	}
	mockServices, err := services.NewMocks(sessions, cfg.HistoryMaxRetention, persistence, cfg.InitMocks)
	if err != nil {
		slog.Error("Unable to load initial mocks", "error", err, "init-mocks", cfg.InitMocks)
		os.Exit(1)
	}

	mockServerEngine.HideBanner = true
	mockServerEngine.HidePort = true
	mockServerEngine.Use(recoverMiddleware(), loggerMiddleware(), HistoryMiddleware(mockServices))

	handler := handlers.NewMocks(mockServices)
	mockServerEngine.Any("/*", handler.GenericHandler)

	mockServerEngine.Server.Addr = ":" + strconv.Itoa(cfg.MockServerListenPort)
	return mockServerEngine.Server, mockServices
}
