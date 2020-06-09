package handlers

import (
	"net/http"
	"strings"

	"github.com/labstack/echo"
	log "github.com/sirupsen/logrus"
	"gopkg.in/yaml.v3"
)

func bindAccordingAccept(c echo.Context, res interface{}) error {
	if err := c.Bind(res); err != nil {
		if err != echo.ErrUnsupportedMediaType {
			log.WithError(err).Error("Failed to parse payload")
			return err
		}

		// echo doesn't support YAML yet
		req := c.Request()
		contentType := req.Header.Get(echo.HeaderContentType)
		if contentType == "" || strings.Contains(strings.ToLower(contentType), MIMEApplicationXYaml) {
			if err := yaml.NewDecoder(req.Body).Decode(res); err != nil {
				return echo.NewHTTPError(http.StatusBadRequest, err.Error())
			}
		} else {
			return echo.NewHTTPError(http.StatusUnsupportedMediaType, err.Error())
		}
	}
	return nil
}

func respondAccordingAccept(c echo.Context, body interface{}) error {
	accept := c.Request().Header.Get(echo.HeaderAccept)
	if strings.Contains(strings.ToLower(accept), MIMEApplicationXYaml) {
		c.Response().Header().Set(echo.HeaderContentType, MIMEApplicationXYaml)
		c.Response().WriteHeader(http.StatusOK)

		out, err := yaml.Marshal(body)
		if err != nil {
			return err
		}

		_, err = c.Response().Write(out)
		return err
	}
	return c.JSONPretty(http.StatusOK, body, "    ")
}
