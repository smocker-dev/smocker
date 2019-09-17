package server

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/Thiht/smock/types"
	"github.com/labstack/echo"
	log "github.com/sirupsen/logrus"
	"gopkg.in/yaml.v2"
)

func Serve(mockServerListenPort, configListenPort int, buildParams echo.Map) {
	mockServer := NewMockServer(mockServerListenPort)

	e := echo.New()
	e.HideBanner = true
	e.HidePort = true

	e.GET("/mocks", func(c echo.Context) error {
		return c.JSON(http.StatusOK, mockServer.Mocks())
	})
	e.POST("/mocks", func(c echo.Context) error {
		var mocks []*types.Mock
		if err := c.Bind(&mocks); err != nil {
			if err != echo.ErrUnsupportedMediaType {
				log.WithError(err).Error("Failed to parse payload")
				return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
			}

			// echo doesn't support YAML yet
			req := c.Request()
			if strings.HasPrefix(req.Header.Get(echo.HeaderContentType), "application/x-yaml") {
				if err := yaml.NewDecoder(req.Body).Decode(&mocks); err != nil {
					return echo.NewHTTPError(http.StatusBadRequest, err.Error())
				}
			}
		}

		for _, mock := range mocks {
			if err := mock.Validate(); err != nil {
				return echo.NewHTTPError(http.StatusBadRequest, err.Error())
			}
		}
		for _, mock := range mocks {
			mockServer.AddMock(mock)
		}

		return c.JSON(http.StatusOK, echo.Map{
			"message": "Mocks registered successfully",
		})
	})
	e.GET("/history", func(c echo.Context) error {
		filter := c.QueryParam("filter")
		history, err := mockServer.History(filter)
		if err != nil {
			log.WithError(err).Error("Failed to retreive history")
			return echo.NewHTTPError(http.StatusBadRequest, err.Error())
		}
		return c.JSON(http.StatusOK, history)
	})
	e.POST("/reset", func(c echo.Context) error {
		mockServer.Reset()
		return c.JSON(http.StatusOK, echo.Map{
			"message": "Reset successful",
		})
	})
	e.GET("/version", func(c echo.Context) error {
		return c.JSON(http.StatusOK, buildParams)
	})

	log.WithField("port", configListenPort).Info("Starting config server")
	if err := e.Start(":" + strconv.Itoa(configListenPort)); err != nil {
		log.WithError(err).Fatal("Config server execution failed")
	}
}
