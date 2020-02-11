package server

import (
	"strconv"

	"github.com/Thiht/smocker/handlers"
	"github.com/Thiht/smocker/services"
	"github.com/labstack/echo"
	log "github.com/sirupsen/logrus"
)

func NewMockServer(port int) services.MockServer {

	server := echo.New()

	mockServer := services.NewMockServer()

	server.HideBanner = true
	server.HidePort = true
	server.Use(recoverMiddleware(), loggerMiddleware(), HistoryMiddleware(mockServer))

	handler := handlers.NewMocks(mockServer)
	server.Any("/*", handler.GenericHandler)

	log.WithField("port", port).Info("Starting mock server")
	go func() {
		if err := server.Start(":" + strconv.Itoa(port)); err != nil {
			log.WithError(err).Error("Mock Server execution failed")
		}
	}()
	return mockServer
}
