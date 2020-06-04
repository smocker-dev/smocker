package services

import (
	"fmt"
	"net/url"
	"sort"
	"time"

	"github.com/Thiht/smocker/server/types"
)

const (
	ClientHost  = "Client"
	SmockerHost = "Smocker"
)

type Graph interface {
	Generate(cfg types.GraphConfig, session *types.Session) string
}

type graph struct {
}

func NewGraph() Graph {
	return &graph{}
}

type endpoint struct {
	Name  string
	Alias string
}

type endpoints struct {
	generatedCount int64
	byHost         map[string]endpoint
	list           []string
}

func (e *endpoints) GetAlias(host string) string {
	return e.byHost[host].Alias
}

func (e *endpoints) GetList() []endpoint {
	res := []endpoint{}
	for _, host := range e.list {
		res = append(res, e.byHost[host])
	}
	return res
}

func (e *endpoints) AddHost(host string) {
	if _, ok := e.byHost[host]; ok {
		return
	}
	e.generatedCount++
	ep := endpoint{
		Name:  host,
		Alias: fmt.Sprintf("E%d", e.generatedCount),
	}
	e.byHost[host] = ep
	e.list = append(e.list, host)
}

func (e *endpoints) GenerateFromHost(host string) {
	if _, ok := e.byHost[host]; ok {
		return
	}
	e.generatedCount++
	ep := endpoint{
		Name:  fmt.Sprintf("Endpoint %d", e.generatedCount),
		Alias: fmt.Sprintf("E%d", e.generatedCount),
	}
	e.byHost[host] = ep
	e.list = append(e.list, host)
}

func (e *endpoints) AddEndpoint(host string, ep endpoint) {
	if _, ok := e.byHost[host]; ok {
		e.byHost[host] = ep
		return
	}
	e.byHost[host] = ep
	e.list = append(e.list, host)
}

func (g *graph) Generate(cfg types.GraphConfig, session *types.Session) string {
	mocksByID := map[string]*types.Mock{}
	for _, mock := range session.Mocks {
		mocksByID[mock.State.ID] = mock
	}

	endpoints := endpoints{
		byHost: map[string]endpoint{},
		list:   []string{},
	}
	endpoints.AddEndpoint(ClientHost, endpoint{Name: ClientHost, Alias: "C"})
	endpoints.AddEndpoint(SmockerHost, endpoint{Name: SmockerHost, Alias: "S"})

	cLientAlias := endpoints.GetAlias(ClientHost)
	smockerAlias := endpoints.GetAlias(SmockerHost)

	history := types.GraphHistory{}
	for _, entry := range session.History {
		from := cLientAlias
		if src := entry.Request.Headers.Get(cfg.SrcHeader); src != "" {
			alias := endpoints.GetAlias(src)
			if alias == "" {
				endpoints.AddHost(src)
				alias = endpoints.GetAlias(src)
			}
			from = alias
		}
		to := smockerAlias
		if dest := entry.Request.Headers.Get(cfg.DestHeader); dest != "" {
			alias := endpoints.GetAlias(dest)
			if alias == "" {
				endpoints.AddHost(dest)
				alias = endpoints.GetAlias(dest)
			}
			to = alias
		}

		params := entry.Request.QueryParams.Encode()
		if decoded, err := url.QueryUnescape(params); err == nil {
			params = decoded
		}
		if params != "" {
			params = "?" + params
		}

		requestMessage := ellipsis(entry.Request.Method + " " + entry.Request.Path + params)
		history = append(history, types.GraphEntry{
			Type:    "request",
			Message: requestMessage,
			From:    from,
			To:      smockerAlias,
			Date:    entry.Request.Date,
		})

		history = append(history, types.GraphEntry{
			Type:    "response",
			Message: fmt.Sprintf("%d", entry.Response.Status),
			From:    smockerAlias,
			To:      from,
			Date:    entry.Response.Date,
		})

		if entry.MockID != "" {
			if mocksByID[entry.MockID].Proxy != nil {
				host := mocksByID[entry.MockID].Proxy.Host
				u, err := url.Parse(host)
				if err == nil {
					host = u.Host
				}
				if to == smockerAlias {
					if alias := endpoints.GetAlias(host); alias == "" {
						endpoints.GenerateFromHost(host)
					}
					to = endpoints.GetAlias(host)
				}

				history = append(history, types.GraphEntry{
					Type:    "request",
					Message: requestMessage,
					From:    smockerAlias,
					To:      to,
					Date:    entry.Request.Date.Add(1 * time.Nanosecond),
				})

				history = append(history, types.GraphEntry{
					Type:    "response",
					Message: fmt.Sprintf("%d", entry.Response.Status),
					From:    to,
					To:      smockerAlias,
					Date:    entry.Response.Date.Add(-1 * time.Nanosecond),
				})
			} else {
				history = append(history, types.GraphEntry{
					Type:    "processing",
					Message: "use response mock",
					From:    smockerAlias,
					To:      smockerAlias,
					Date:    entry.Response.Date.Add(-1 * time.Nanosecond),
				})
			}
		}

	}
	sort.Sort(history)
	return renderGraph(history, &endpoints)
}

func renderGraph(gh types.GraphHistory, eps *endpoints) string {
	res := fmt.Sprintln("sequenceDiagram")
	res += fmt.Sprintln("")
	for _, endpoint := range eps.GetList() {
		used := false
		for _, entry := range gh {
			if entry.From == endpoint.Alias || entry.To == endpoint.Alias {
				used = true
				break
			}
		}
		if used {
			res += fmt.Sprintf("    participant %s as %s\n", endpoint.Alias, endpoint.Name)
		}
	}
	res += fmt.Sprintln("")
	for _, entry := range gh {
		if entry.From == "C" {
			res += fmt.Sprintln("    rect rgb(245, 245, 245)")
		}
		arrow := "-->>"
		if entry.Type == "request" {
			arrow = "->>+"
		} else if entry.Type == "response" {
			arrow = "-->>-"
		}
		res += fmt.Sprintf("      %s%s%s: %s\n", entry.From, arrow, entry.To, entry.Message)
		if entry.To == "C" {
			res += fmt.Sprintln("    end")
		}
	}
	return res
}

func ellipsis(s string) string {
	const maxSize = 50
	if len(s) > maxSize {
		return s[:maxSize-3] + "..."
	}
	return s
}
