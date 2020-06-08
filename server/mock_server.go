package server

import (
	"strconv"

	"github.com/Thiht/smocker/server/config"
	"github.com/Thiht/smocker/server/handlers"
	"github.com/Thiht/smocker/server/services"
	"github.com/labstack/echo"
	log "github.com/sirupsen/logrus"
)

func NewMockServer(cfg config.Config) services.Mocks {
	server := echo.New()
	mockServer := services.NewMocks(cfg)

	server.HideBanner = true
	server.HidePort = true
	server.Use(recoverMiddleware(), loggerMiddleware(), HistoryMiddleware(mockServer))

	handler := handlers.NewMocks(mockServer)
	server.Any("/*", handler.GenericHandler)

	log.WithField("port", cfg.MockServerListenPort).Info("Starting mock server")
	go func() {
		if err := server.Start(":" + strconv.Itoa(cfg.MockServerListenPort)); err != nil {
			log.WithError(err).Error("Mock Server execution failed")
		}
	}()
	return mockServer
}
