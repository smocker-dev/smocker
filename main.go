package main

import (
	"net/http"
	"os"
	"strconv"
	"strings"

	"github.com/labstack/echo"
	"github.com/namsral/flag"
	log "github.com/sirupsen/logrus"
	"gopkg.in/yaml.v2"
)

var (
	appName, buildVersion, buildCommit, buildDate string // nolint
)

type config struct {
	logLevel             string
	configListenPort     int
	mockServerListenPort int
}

func parseConfig() (c config) {
	// Use a prefix for environment variables
	flag.CommandLine = flag.NewFlagSetWithEnvPrefix(os.Args[0], "SMOCK", flag.ExitOnError)

	flag.StringVar(&c.logLevel, "log-level", "info", "")
	flag.IntVar(&c.configListenPort, "config-listen-port", 8081, "")
	flag.IntVar(&c.mockServerListenPort, "mock-server-listen-port", 8080, "")

	flag.Parse()
	return
}

func setupLogger(logLevel string) {
	log.SetFormatter(&log.TextFormatter{
		FullTimestamp: true,
	})

	level, err := log.ParseLevel(logLevel)
	if err != nil {
		log.WithError(err).WithField("level", level).Warn("Invalid log level, fallback to info")
		level = log.InfoLevel
	}
	log.WithField("level", level).Info("Setting log level")
	log.SetLevel(level)
}

func setupServer(mockServerListenPort, configListenPort int) {
	mockServer := NewMockServer(mockServerListenPort)

	e := echo.New()
	e.HideBanner = true
	e.HidePort = true

	e.POST("/mocks", func(c echo.Context) error {
		log.Info("Registering new mocks")
		req := c.Request()
		var mocks []Route
		if err := c.Bind(&mocks); err != nil {
			if err != echo.ErrUnsupportedMediaType {
				return err
			}

			// echo doesn't support YAML yet
			if strings.HasPrefix(req.Header.Get(echo.HeaderContentType), "application/x-yaml") {
				if err := yaml.NewDecoder(req.Body).Decode(&mocks); err != nil {
					log.WithError(err).Error("Failed to parse YAML")
					return err
				}
			}
		}

		for _, mock := range mocks {
			mockServer.AddRoute(mock)
		}

		log.Info("New mocks registered successfully")
		return nil
	})
	e.POST("/mocks/reset", func(c echo.Context) error {
		mockServer.Reset()
		return nil
	})
	e.GET("/version", func(c echo.Context) error {
		return c.JSON(http.StatusOK, echo.Map{
			"appName":      appName,
			"buildVersion": buildVersion,
			"buildCommit":  buildCommit,
			"buildDate":    buildDate,
		})
	})

	log.WithField("port", configListenPort).Info("Starting config server")
	if err := e.Start(":" + strconv.Itoa(configListenPort)); err != nil {
		log.WithError(err).Fatal("Config server execution failed")
	}
}

func main() {
	c := parseConfig()
	setupLogger(c.logLevel)
	setupServer(c.mockServerListenPort, c.configListenPort)
}
