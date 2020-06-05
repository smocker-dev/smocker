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

	requestType    = "request"
	responseType   = "response"
	processingType = "processing"
)

type Graph interface {
	Generate(cfg types.GraphConfig, session *types.Session) types.GraphHistory
}

type graph struct {
}

func NewGraph() Graph {
	return &graph{}
}

func (g *graph) Generate(cfg types.GraphConfig, session *types.Session) types.GraphHistory {

	endpointCpt := 0
	endpoints := map[string]string{}

	mocksByID := map[string]*types.Mock{}
	for _, mock := range session.Mocks {
		mocksByID[mock.State.ID] = mock
	}

	history := types.GraphHistory{}
	for _, entry := range session.History {
		from := ClientHost
		if src := entry.Request.Headers.Get(cfg.SrcHeader); src != "" {
			from = src
		}
		to := SmockerHost
		if dest := entry.Request.Headers.Get(cfg.DestHeader); dest != "" {
			to = dest
		}

		params := entry.Request.QueryParams.Encode()
		if decoded, err := url.QueryUnescape(params); err == nil {
			params = decoded
		}
		if params != "" {
			params = "?" + params
		}

		requestMessage := entry.Request.Method + " " + entry.Request.Path + params
		history = append(history, types.GraphEntry{
			Type:    requestType,
			Message: requestMessage,
			From:    from,
			To:      SmockerHost,
			Date:    entry.Request.Date,
		})

		history = append(history, types.GraphEntry{
			Type:    responseType,
			Message: fmt.Sprintf("%d", entry.Response.Status),
			From:    SmockerHost,
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
				if to == SmockerHost {
					if endpoint := endpoints[host]; endpoint == "" {
						endpointCpt++
						endpoints[host] = fmt.Sprintf("Endpoint%d", endpointCpt)
					}
					to = endpoints[host]
				}

				history = append(history, types.GraphEntry{
					Type:    requestType,
					Message: requestMessage,
					From:    SmockerHost,
					To:      to,
					Date:    entry.Request.Date.Add(1 * time.Nanosecond),
				})

				history = append(history, types.GraphEntry{
					Type:    responseType,
					Message: fmt.Sprintf("%d", entry.Response.Status),
					From:    to,
					To:      SmockerHost,
					Date:    entry.Response.Date.Add(-1 * time.Nanosecond),
				})
			} else {
				history = append(history, types.GraphEntry{
					Type:    processingType,
					Message: "use response mock",
					From:    SmockerHost,
					To:      SmockerHost,
					Date:    entry.Response.Date.Add(-1 * time.Nanosecond),
				})
			}
		}

	}
	sort.Sort(history)
	return history
}
