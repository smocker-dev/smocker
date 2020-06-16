package server

import (
	"net/http"
	"strconv"

	"github.com/Thiht/smocker/server/config"
	"github.com/Thiht/smocker/server/handlers"
	"github.com/Thiht/smocker/server/services"
	"github.com/labstack/echo"
	log "github.com/sirupsen/logrus"
)

func NewMockServer(cfg config.Config) (*http.Server, services.Mocks) {
	mockServerEngine := echo.New()
	persistance := services.NewPersistence(cfg.PersistenceDirectory)
	sessions, err := persistance.LoadSessions()
	if err != nil {
		log.Error("unable to load sessions: ", err)
	}
	mockServices := services.NewMocksWithSessions(sessions, cfg.HistoryMaxRetention, persistance)

	mockServerEngine.HideBanner = true
	mockServerEngine.HidePort = true
	mockServerEngine.Use(recoverMiddleware(), loggerMiddleware(), HistoryMiddleware(mockServices))

	handler := handlers.NewMocks(mockServices)
	mockServerEngine.Any("/*", handler.GenericHandler)

	mockServerEngine.Server.Addr = ":" + strconv.Itoa(cfg.MockServerListenPort)
	return mockServerEngine.Server, mockServices
}
