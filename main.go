package main

import (
	"os"

	"github.com/Thiht/smocker/server"
	"github.com/Thiht/smocker/server/config"
	"github.com/namsral/flag"
	log "github.com/sirupsen/logrus"
	"github.com/teris-io/shortid"
)

var (
	appName, buildVersion, buildCommit, buildDate string // nolint
)

func parseConfig() (c config.Config) {
	c.Build = config.Build{
		AppName:      appName,
		BuildVersion: buildVersion,
		BuildCommit:  buildCommit,
		BuildDate:    buildDate,
	}

	// Use a prefix for environment variables
	flag.CommandLine = flag.NewFlagSetWithEnvPrefix(os.Args[0], "SMOCKER", flag.ExitOnError)

	flag.StringVar(&c.LogLevel, "log-level", "info", "Available levels: panic, fatal, error, warning, info, debug, trace")
	flag.IntVar(&c.ConfigListenPort, "config-listen-port", 8081, "")
	flag.IntVar(&c.MockServerListenPort, "mock-server-listen-port", 8080, "")
	flag.StringVar(&c.StaticFiles, "static-files", ".", "The location of the static files to serve (index.html, etc.)")
	flag.IntVar(&c.HistoryMaxRetention, "history-retention", 0, "The maximum number of calls to keep in the history by sessions (0 = infinity)")
	flag.StringVar(&c.PersistenceDirectory, "persistence-directory", "", "If defined, the directory where the sessions will be synchronized")
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

func setupShortID() {
	const alphabet = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ+-"
	sid := shortid.MustNew(0, alphabet, 1)
	shortid.SetDefault(sid)
}

func main() {
	c := parseConfig()
	setupLogger(c.LogLevel)
	setupShortID()
	server.Serve(c)
}
