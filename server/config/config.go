package config

type Config struct {
	LogLevel             string
	ConfigListenPort     int
	ConfigBasePath       string
	MockServerListenPort int
	StaticFiles          string
	HistoryMaxRetention  int
	PersistenceDirectory string
	TLSEnable            bool
	TLSCertFile          string
	TLSKeyFile           string
	Build                Build
}

type Build struct {
	AppName      string `json:"app_name"`
	BuildVersion string `json:"build_version"`
	BuildCommit  string `json:"build_commit"`
	BuildDate    string `json:"build_date"`
}
