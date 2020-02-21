package types

const (
	StatusSmockerInternalError         = 600
	StatusSmockerEngineExecutionError  = 601
	StatusSmockerProxyRedirectionError = 602
	StatusSmockerMockNotFound          = 666

	SmockerInternalError         = "Smocker internal error"
	SmockerEngineExecutionError  = "Error during template engine execution"
	SmockerProxyRedirectionError = "Error during request redirection"
	SmockerMockNotFound          = "No mock found matching the request"
	SmockerMockExceeded          = "Matching mock found but was exceeded"
)
