package config

type Config struct {
	LogLevel             string
	ConfigListenPort     int
	MockServerListenPort int
	StaticFiles          string
	HistoryMaxRetention  int
	PersistenceDirectory string
	Build                Build
}

type Build struct {
	AppName      string `json:"app_name"`
	BuildVersion string `json:"build_version"`
	BuildCommit  string `json:"build_commit"`
	BuildDate    string `json:"build_date"`
}
