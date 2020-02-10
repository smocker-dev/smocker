package server

import (
	"strconv"

	"github.com/Thiht/smocker/handlers"
	"github.com/Thiht/smocker/services"
	"github.com/labstack/echo"
	log "github.com/sirupsen/logrus"
)

type mockServer struct {
	server *echo.Echo
	services.MockServer
}

func NewMockServer(port int) *mockServer {
	s := &mockServer{
		server:     echo.New(),
		MockServer: services.NewMockServer(),
	}
	s.server.HideBanner = true
	s.server.HidePort = true
	s.server.Use(recoverMiddleware(), loggerMiddleware(), HistoryMiddleware(s))

	handler := handlers.NewMocks(s)
	s.server.Any("/*", handler.GenericHandler)

	log.WithField("port", port).Info("Starting mock server")
	go func() {
		if err := s.server.Start(":" + strconv.Itoa(port)); err != nil {
			log.WithError(err).Error("Mock Server execution failed")
		}
	}()
	return s
}
