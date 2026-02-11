package main

import (
	"crypto/tls"
	"flag"
	"fmt"
	"log/slog"
	"os"
	"path/filepath"
	"strings"

	"github.com/peterbourgon/ff/v3"
	"github.com/pressly/goose/v3"
)

var appName, buildVersion, buildCommit, buildDate string

type Config struct {
	LogLevel               string
	LogFormat              string
	ConfigServerListenPort int
	MockServerListenPort   int
	Persistence            string
	PersistenceSQLiteDSN   string
	PersistencePostgresDSN string
	TLSEnable              bool
	TLSCertFile            string
	TLSKeyFile             string
	TLSCertificate         tls.Certificate
	BuildInfo              BuildInfo
}

type BuildInfo struct {
	AppName      string `json:"app_name"`
	BuildVersion string `json:"build_version"`
	BuildCommit  string `json:"build_commit"`
	BuildDate    string `json:"build_date"`
}

func parseConfig() (c Config, err error) {
	homeDir, err := os.UserHomeDir()
	if err != nil {
		slog.Error("failed to get user home directory", slog.Any("error", err))
		return Config{}, fmt.Errorf("failed to get user home directory: %w", err)
	}

	fs := flag.NewFlagSet("smocker", flag.ContinueOnError)

	fs.StringVar(&c.LogLevel, "log-level", "info", "log level (debug, info, warn, error)")
	fs.StringVar(&c.LogFormat, "log-format", "text", "log format (text, json)")
	fs.IntVar(&c.ConfigServerListenPort, "config-port", 8081, "listen port of Smocker configuration server")
	fs.IntVar(&c.MockServerListenPort, "mock-port", 8080, "listen port of Smocker mock server")
	fs.StringVar(&c.Persistence, "persistence", "memory", "persistence engine (memory, sqlite, postgres)")
	fs.StringVar(&c.PersistenceSQLiteDSN, "sqlite-dsn", "file:"+filepath.Join(homeDir, ".local/share/smocker/smocker.db"), "dsn for SQLite persistence")
	fs.StringVar(&c.PersistencePostgresDSN, "postgres-dsn", "user=postgres password=postgres dbname=postgres host=localhost port=5432 sslmode=disable", "dsn for PostgreSQL persistence")
	fs.BoolVar(&c.TLSEnable, "tls", false, "enable TLS using the provided certificate")
	fs.StringVar(&c.TLSCertFile, "tls-cert", "", "path to TLS certificate file ")
	fs.StringVar(&c.TLSKeyFile, "tls-key", "", "path to TLS key file")

	if err := ff.Parse(fs, os.Args[1:], ff.WithEnvVarPrefix("SMOCKER")); err != nil {
		slog.Error("failed to parse config", slog.Any("error", err))
		return Config{}, fmt.Errorf("failed to parse config: %w", err)
	}

	if c.TLSEnable {
		certificate, err := tls.LoadX509KeyPair(c.TLSCertFile, c.TLSKeyFile)
		if err != nil {
			slog.Error("invalid tls certificate", slog.Any("error", err))
			return Config{}, fmt.Errorf("invalid tls certificate: %w", err)
		}

		c.TLSCertificate = certificate
	}

	c.BuildInfo = BuildInfo{
		AppName:      appName,
		BuildVersion: buildVersion,
		BuildCommit:  buildCommit,
		BuildDate:    buildDate,
	}

	return c, nil
}

func setupLogger(format, level string) {
	var slogLevel slog.Level
	switch level {
	case "debug":
		slogLevel = slog.LevelDebug
	case "info":
		slogLevel = slog.LevelInfo
	case "warn":
		slogLevel = slog.LevelWarn
	case "error":
		slogLevel = slog.LevelError
	default:
		panic(fmt.Sprintf("unknown logger level: %s, expected one of: debug, info, warn, error", level))
	}

	switch format {
	case "json":
		logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
			Level: slogLevel,
		}))
		slog.SetDefault(logger)
	case "text":
		logger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{
			Level: slogLevel,
		}))
		slog.SetDefault(logger)
	default:
		panic(fmt.Sprintf("unknown logger format: %s, expected one of: text, json", format))
	}
}

func setupGoose() {
	goose.SetLogger(&gooseLogger{})
}

type gooseLogger struct{}

func (l *gooseLogger) Fatalf(format string, v ...any) {
	slog.Error(strings.TrimSpace(fmt.Sprintf(format, v...)))
	os.Exit(1)
}

func (l *gooseLogger) Printf(format string, v ...any) {
	slog.Info(strings.TrimSpace(fmt.Sprintf(format, v...)))
}
