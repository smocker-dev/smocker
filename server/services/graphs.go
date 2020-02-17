package services

import (
	"fmt"
	"net/url"
	"regexp"
	"sort"
	"strings"
	"time"

	"github.com/Thiht/smocker/server/types"
)

var re = regexp.MustCompile("[^a-z0-9]+")

type Graph interface {
	Generate(cfg types.GraphConfig, session *types.Session) string
}

type graph struct {
}

func NewGraph() Graph {
	return &graph{}
}

func (g *graph) Generate(cfg types.GraphConfig, session *types.Session) string {
	mocksByID := map[string]*types.Mock{}
	for _, mock := range session.Mocks {
		mocksByID[mock.State.ID] = mock
	}
	history := types.GraphHistory{}
	clientHost := ""
	for index, entry := range session.History {
		from := entry.Request.Headers.Get("Host")
		if from == "" {
			from = "unknown"
		}
		if index == 0 {
			clientHost = from
		}
		if from == clientHost {
			from = "client"
		}
		to := "smocker"

		from = strings.Trim(re.ReplaceAllString(strings.ToLower(from), "_"), "_")
		to = strings.Trim(re.ReplaceAllString(strings.ToLower(to), "_"), "_")

		history = append(history, types.GraphEntry{
			Type:    "request",
			Message: entry.Request.Method + " " + entry.Request.Path + entry.Request.QueryParams.Encode(),
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
			host = strings.Trim(re.ReplaceAllString(strings.ToLower(host), "_"), "_")
			if len(host) > 17 {
				host = host[:17] + "..."
			}
			history = append(history, types.GraphEntry{
				Type:    "request",
				Message: entry.Request.Method + " " + entry.Request.Path + entry.Request.QueryParams.Encode(),
				From:    "smocker",
				To:      host,
				Date:    entry.Request.Date.Add(1 * time.Millisecond),
			})

			history = append(history, types.GraphEntry{
				Type:    "response",
				Message: fmt.Sprintf("%d", entry.Response.Status),
				From:    host,
				To:      "smocker",
				Date:    entry.Response.Date.Add(-1 * time.Millisecond),
			})
		}

	}
	sort.Sort(history)

	return renderGraph(history)
}

func renderGraph(gh types.GraphHistory) string {
	res := fmt.Sprintln("sequenceDiagram")
	for _, entry := range gh {
		if entry.From == "client" {
			res += fmt.Sprintln("    rect rgb(250, 250, 250)")
		}
		arrow := "-->>"
		if entry.Type == "request" {
			arrow = "->>"
		}
		res += fmt.Sprintf("    %s%s%s: %s\n", entry.From, arrow, entry.To, entry.Message)

		if entry.Type == "request" {
			res += fmt.Sprintf("    activate %s\n", entry.To)
		}

		if entry.Type == "response" {
			res += fmt.Sprintf("    deactivate %s\n", entry.From)
		}
		if entry.To == "client" {
			res += fmt.Sprintln("    end")
		}
	}
	return res
}
