package templates

import "github.com/Thiht/smock/history"

type TemplateEngine interface {
	Execute(request history.Request, script string, result interface{}) error
}
