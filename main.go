package main

import (
	"os"

	"github.com/Thiht/smocker/server"
	"github.com/labstack/echo"
	"github.com/namsral/flag"
	log "github.com/sirupsen/logrus"
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
	flag.CommandLine = flag.NewFlagSetWithEnvPrefix(os.Args[0], "SMOCKER", flag.ExitOnError)

	flag.StringVar(&c.logLevel, "log-level", "info", "")
	flag.IntVar(&c.configListenPort, "config-listen-port", 8081, "")
	flag.IntVar(&c.mockServerListenPort, "mock-server-listen-port", 8080, "")

	flag.Parse()
	return
}

func setupLogger(logLevel string) {
	log.SetFormatter(&log.TextFormatter{
		FullTimestamp:    true,
		QuoteEmptyFields: true,
	})

	level, err := log.ParseLevel(logLevel)
	if err != nil {
		log.WithError(err).WithField("log-level", level).Warn("Invalid log level, fallback to info")
		level = log.InfoLevel
	}
	log.WithField("log-level", level).Info("Setting log level")
	log.SetLevel(level)
}

func main() {
	c := parseConfig()
	setupLogger(c.logLevel)
	server.Serve(c.mockServerListenPort, c.configListenPort, echo.Map{
		"appName":      appName,
		"buildVersion": buildVersion,
		"buildCommit":  buildCommit,
		"buildDate":    buildDate,
	})
}
