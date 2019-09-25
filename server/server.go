package server

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/Thiht/smocker/types"
	"github.com/labstack/echo"
	log "github.com/sirupsen/logrus"
	"gopkg.in/yaml.v2"
)

const (
	MIMEApplicationXYaml = "application/x-yaml"
	JSONIndent           = "    "
)

func Serve(mockServerListenPort, configListenPort int, buildParams echo.Map) {
	mockServer := NewMockServer(mockServerListenPort)

	e := echo.New()
	e.HideBanner = true
	e.HidePort = true

	e.Use(recoverMiddleware(), loggerMiddleware())
	e.GET("/mocks", func(c echo.Context) error {
		mocks := mockServer.Mocks()
		accept := c.Request().Header.Get(echo.HeaderAccept)
		if strings.Contains(strings.ToLower(accept), MIMEApplicationXYaml) {
			c.Response().Header().Set(echo.HeaderContentType, MIMEApplicationXYaml)
			c.Response().WriteHeader(http.StatusOK)
			out, err := yaml.Marshal(mocks)
			if err != nil {
				return err
			}
			_, err = c.Response().Write(out)
			return err
		}
		return c.JSONPretty(http.StatusOK, mocks, JSONIndent)
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
			contentType := req.Header.Get(echo.HeaderContentType)
			if strings.Contains(strings.ToLower(contentType), MIMEApplicationXYaml) {
				if err := yaml.NewDecoder(req.Body).Decode(&mocks); err != nil {
					return echo.NewHTTPError(http.StatusBadRequest, err.Error())
				}
			} else {
				return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
			}
		}

		for _, mock := range mocks {
			if err := mock.Validate(); err != nil {
				return echo.NewHTTPError(http.StatusBadRequest, err.Error())
			}
		}
		for _, mock := range mocks {
			mock.State = &types.MockState{}
			if mock.Context == nil {
				mock.Context = &types.MockContext{}
			}
			mockServer.AddMock(mock)
		}

		return c.JSON(http.StatusOK, echo.Map{
			"message": "Mocks registered successfully",
		})
	})
	e.POST("/mocks/verify", func(c echo.Context) error {
		mocks := mockServer.Mocks()
		failedMocks := types.Mocks{}
		for _, mock := range mocks {
			if mock.Context.Times > 0 && mock.Context.Times != mock.State.TimesCount {
				failedMocks = append(failedMocks, mock)
			}
		}

		verified := len(failedMocks) == 0
		response := echo.Map{
			"verified": verified,
		}
		if verified {
			response["message"] = "All mocks match expectations"
		} else {
			response["message"] = "Some mocks doesn't match expectations"
			response["mocks"] = failedMocks
		}
		return c.JSON(http.StatusOK, response)
	})
	e.GET("/history", func(c echo.Context) error {
		filter := c.QueryParam("filter")
		history, err := mockServer.History(filter)
		if err != nil {
			log.WithError(err).Error("Failed to retrieve history")
			return echo.NewHTTPError(http.StatusBadRequest, err.Error())
		}
		accept := c.Request().Header.Get(echo.HeaderAccept)
		if strings.Contains(strings.ToLower(accept), MIMEApplicationXYaml) {
			c.Response().Header().Set(echo.HeaderContentType, MIMEApplicationXYaml)
			c.Response().WriteHeader(http.StatusOK)
			out, err := yaml.Marshal(history)
			if err != nil {
				return err
			}
			_, err = c.Response().Write(out)
			return err
		}
		return c.JSONPretty(http.StatusOK, history, JSONIndent)
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
