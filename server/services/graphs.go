package services

import (
	"fmt"
	"net/url"
	"sort"
	"time"

	"github.com/Thiht/smocker/server/types"
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

type endpoints []endpoint

func (e endpoints) GetAlias(name string) string {
	for _, ep := range e {
		if ep.Name == name {
			return ep.Alias
		}
	}
	return ""
}

func (g *graph) Generate(cfg types.GraphConfig, session *types.Session) string {
	mocksByID := map[string]*types.Mock{}
	for _, mock := range session.Mocks {
		mocksByID[mock.State.ID] = mock
	}
	endpointsFromOrigin := map[string]string{}
	endpoints := endpoints{
		{Name: "Client", Alias: "C"},
		{Name: "Smocker", Alias: "S"},
	}

	history := types.GraphHistory{}
	for _, entry := range session.History {
		from := endpoints.GetAlias("Client")
		to := endpoints.GetAlias("Smocker")

		params := entry.Request.QueryParams.Encode()
		if decoded, err := url.QueryUnescape(params); err == nil {
			params = decoded
		}
		if params != "" {
			params = "?" + params
		}

		history = append(history, types.GraphEntry{
			Type:    "request",
			Message: entry.Request.Method + " " + entry.Request.Path + params,
			From:    from,
			To:      to,
			Date:    entry.Request.Date,
		})

		history = append(history, types.GraphEntry{
			Type:    "response",
			Message: fmt.Sprintf("%d", entry.Response.Status),
			From:    to,
			To:      from,
			Date:    entry.Response.Date,
		})

		if entry.MockID != "" && mocksByID[entry.MockID].Proxy != nil {
			host := mocksByID[entry.MockID].Proxy.Host
			u, err := url.Parse(host)
			if err == nil {
				host = u.Host
			}
			if _, ok := endpointsFromOrigin[host]; !ok {
				enpointNumber := len(endpointsFromOrigin) + 1
				endpointsFromOrigin[host] = fmt.Sprintf("Endpoint %d", enpointNumber)
				endpoints = append(endpoints, endpoint{
					Name:  endpointsFromOrigin[host],
					Alias: fmt.Sprintf("E%d", enpointNumber),
				})
			}
			history = append(history, types.GraphEntry{
				Type:    "request",
				Message: entry.Request.Method + " " + entry.Request.Path + params,
				From:    endpoints.GetAlias("Smocker"),
				To:      endpoints.GetAlias(endpointsFromOrigin[host]),
				Date:    entry.Request.Date.Add(1 * time.Millisecond),
			})

			history = append(history, types.GraphEntry{
				Type:    "response",
				Message: fmt.Sprintf("%d", entry.Response.Status),
				From:    endpoints.GetAlias(endpointsFromOrigin[host]),
				To:      endpoints.GetAlias("Smocker"),
				Date:    entry.Response.Date.Add(-1 * time.Millisecond),
			})
		}

	}
	sort.Sort(history)
	return renderGraph(history, endpoints)
}

func renderGraph(gh types.GraphHistory, eps endpoints) string {
	res := fmt.Sprintln("sequenceDiagram")
	res += fmt.Sprintln("")
	for _, endpoint := range eps {
		res += fmt.Sprintf("    participant %s as %s\n", endpoint.Alias, endpoint.Name)
	}
	res += fmt.Sprintln("")
	for _, entry := range gh {
		if entry.From == "C" {
			res += fmt.Sprintln("    rect rgb(250, 250, 250)")
		}
		arrow := "-->>-"
		if entry.Type == "request" {
			arrow = "->>+"
		}
		res += fmt.Sprintf("      %s%s%s: %s\n", entry.From, arrow, entry.To, entry.Message)
		if entry.To == "C" {
			res += fmt.Sprintln("    end")
		}
	}
	return res
}
