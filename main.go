package main

import (
	"flag"
	"fmt"
	"log/slog"
	"os"
	"strings"

	"github.com/smocker-dev/smocker/server"
	"github.com/smocker-dev/smocker/server/config"
)

// envPrefix mirrors the historical namsral/flag behavior: a flag named "foo-bar" is also
// configurable through the environment variable SMOCKER_FOO_BAR. These names are part of
// Smocker's operational API and must not change.
const envPrefix = "SMOCKER"

// envName maps a flag name to its environment variable (e.g. "log-level" -> "SMOCKER_LOG_LEVEL").
func envName(flagName string) string {
	return envPrefix + "_" + strings.ToUpper(strings.ReplaceAll(flagName, "-", "_"))
}

var appName, buildVersion, buildCommit, buildDate string // nolint

func parseConfig() (c config.Config) {
	c.Build = config.Build{
		AppName:      appName,
		BuildVersion: buildVersion,
		BuildCommit:  buildCommit,
		BuildDate:    buildDate,
	}

	fs := flag.NewFlagSet(os.Args[0], flag.ExitOnError)

	fs.StringVar(&c.LogLevel, "log-level", "info", "Available levels: panic, fatal, error, warning, info, debug, trace")
	fs.StringVar(&c.ConfigBasePath, "config-base-path", "/", "Base path applied to Smocker UI")
	fs.IntVar(&c.ConfigListenPort, "config-listen-port", 8081, "Listening port of Smocker administration server")
	fs.IntVar(&c.MockServerListenPort, "mock-server-listen-port", 8080, "Listening port of Smocker mock server")
	fs.StringVar(&c.StaticFiles, "static-files", "client", "Location of the static files to serve (index.html, etc.)")
	fs.IntVar(&c.HistoryMaxRetention, "history-retention", 0, "Maximum number of calls to keep in the history per session (0 = no limit)")
	fs.StringVar(&c.PersistenceDirectory, "persistence-directory", "", "If defined, the directory where the sessions will be synchronized")
	fs.BoolVar(&c.TLSEnable, "tls-enable", false, "Enable TLS using the provided certificate")
	fs.StringVar(&c.TLSCertFile, "tls-cert-file", "/etc/smocker/tls/certs/cert.pem", "Path to TLS certificate file ")
	fs.StringVar(&c.TLSKeyFile, "tls-private-key-file", "/etc/smocker/tls/private/key.pem", "Path to TLS key file")

	// Seed defaults from environment variables (SMOCKER_*); command-line flags below take
	// precedence, matching the previous namsral/flag precedence (flag > env > default).
	fs.VisitAll(func(f *flag.Flag) {
		if v, ok := os.LookupEnv(envName(f.Name)); ok {
			if err := fs.Set(f.Name, v); err != nil {
				slog.Warn(fmt.Sprintf("Invalid value for environment variable: %v", err), envName(f.Name), v)
			}
		}
	})

	// main() doubles as the entrypoint of the coverage-instrumented integration test binary
	// (see main_test.go / the Makefile test-integration target), which is launched with go's
	// own `-test.*` flags. Those are not Smocker flags, so drop them before parsing to avoid
	// aborting on "flag provided but not defined".
	args := make([]string, 0, len(os.Args)-1)
	for _, a := range os.Args[1:] {
		if strings.HasPrefix(a, "-test.") || strings.HasPrefix(a, "--test.") {
			continue
		}
		args = append(args, a)
	}

	if err := fs.Parse(args); err != nil {
		slog.Error(fmt.Sprintf("Unable to parse flags: %v", err))
		os.Exit(1)
	}
	return
}

// parseLevel maps the CLI log level names (case-insensitive) to slog levels. The accepted
// names mirror the historical logrus levels; slog has no panic/fatal/trace, so those fold
// into the nearest slog level.
func parseLevel(logLevel string) slog.Level {
	switch strings.ToLower(logLevel) {
	case "panic", "fatal", "error":
		return slog.LevelError
	case "warn", "warning":
		return slog.LevelWarn
	case "info":
		return slog.LevelInfo
	case "debug", "trace":
		return slog.LevelDebug
	default:
		slog.Warn("Invalid log level, fallback to info")
		return slog.LevelInfo
	}
}

func setupLogger(logLevel string) {
	level := parseLevel(logLevel)
	handler := slog.NewTextHandler(os.Stderr, &slog.HandlerOptions{
		Level: level,
	})
	slog.SetDefault(slog.New(handler))
	slog.Info("Setting log level", "log-level", level)
}

func main() {
	c := parseConfig()
	setupLogger(c.LogLevel)
	server.Serve(c)
}
