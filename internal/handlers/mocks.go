package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"math/rand/v2"
	"net/http"
	"net/url"
	"time"

	"github.com/smocker-dev/smocker/internal/handlers/bind"
	"github.com/smocker-dev/smocker/internal/services"
	"github.com/smocker-dev/smocker/internal/types"
)

type MocksHandler struct {
	mocksService *services.MocksService
}

func NewMocksHandler(mocksService *services.MocksService) *MocksHandler {
	return &MocksHandler{
		mocksService: mocksService,
	}
}

func (m *MocksHandler) GenericHandler(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	// Get the request date as early as possible
	requestDate := time.Now().UTC()

	parsedRequest := httpRequestToRequest(ctx, r, requestDate)

	response, matchedMock := m.mocksService.MatchRequest(ctx, parsedRequest)

	var delay time.Duration
	if matchedMock.Options.Delay != nil {
		delay = time.Duration(matchedMock.Options.Delay.Min)

		if matchedMock.Options.Delay.Min != matchedMock.Options.Delay.Max {
			interval := int64(matchedMock.Options.Delay.Max - matchedMock.Options.Delay.Min)
			delay = time.Duration(int64(matchedMock.Options.Delay.Min) + rand.Int64N(interval)) //nolint: gosec // no need for secure random here
		}
	}
	if delay > 0 {
		slog.Debug("delaying response", slog.Any("delay", delay), slog.Any("mock_min_delay", matchedMock.Options.Delay.Min), slog.Any("mock_max_delay", matchedMock.Options.Delay.Max))
		time.Sleep(delay)
	}

	for key, values := range response.Headers {
		for _, value := range values {
			w.Header().Add(key, value)
		}
	}

	w.WriteHeader(response.Status)

	if response.Body != "" {
		if _, err := w.Write([]byte(response.Body)); err != nil {
			slog.Error("failed to write response body", slog.Any("error", err))
			return
		}
	}
}

func httpRequestToRequest(ctx context.Context, r *http.Request, requestDate time.Time) types.Request {
	scheme := "http"
	if r.TLS != nil {
		scheme = "https"
	}

	rawRequestBody := []byte{}
	if r.Body != nil {
		var err error
		rawRequestBody, err = io.ReadAll(r.Body)
		if err != nil {
			slog.ErrorContext(ctx, "failed to read request body", slog.Any("error", err))
		}
	}

	var parsedRequestBody any
	switch r.Header.Get("Content-Type") {
	case "application/json":
		if err := bind.JSON(bytes.NewReader(rawRequestBody), &parsedRequestBody); err != nil {
			slog.Warn("failed to decode JSON", slog.Any("error", err))
			parsedRequestBody = string(rawRequestBody)
		}

	case "application/yaml", "application/x-yaml":
		if err := bind.YAML(bytes.NewReader(rawRequestBody), &parsedRequestBody); err != nil {
			slog.Warn("failed to decode YAML", slog.Any("error", err))
			parsedRequestBody = string(rawRequestBody)
		}

	case "application/xml":
		if err := bind.XML(bytes.NewReader(rawRequestBody), &parsedRequestBody); err != nil {
			slog.Warn("failed to decode XML", slog.Any("error", err))
			parsedRequestBody = string(rawRequestBody)
		}

	case "application/x-www-form-urlencoded":
		urlValues, err := url.ParseQuery(string(rawRequestBody))
		if err != nil {
			slog.Warn("failed to decode URL-encoded form", slog.Any("error", err))
			parsedRequestBody = string(rawRequestBody)
		} else {
			m := make(map[string]any, len(urlValues))
			for key, values := range urlValues {
				if len(values) == 1 {
					m[key] = values[0]
				} else {
					m[key] = values
				}
			}
			parsedRequestBody = m
		}

	default:
		// Try with JSON as a fallback when the content type is unknown, but don't warn in case of failure
		if err := json.Unmarshal(rawRequestBody, &parsedRequestBody); err != nil {
			parsedRequestBody = string(rawRequestBody)
		}
	}

	return types.Request{
		Scheme:      scheme,
		Host:        r.Host,
		Path:        r.URL.EscapedPath(),
		Method:      r.Method,
		Origin:      r.RemoteAddr,
		BodyString:  string(rawRequestBody),
		Body:        parsedRequestBody,
		QueryParams: r.URL.Query(),
		Headers:     r.Header,
		Date:        requestDate,
	}
}
