package services

import (
	"context"
	"crypto/tls"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/smocker-dev/smocker/internal/handlers/bind"
	"github.com/smocker-dev/smocker/internal/services/engines"
	"github.com/smocker-dev/smocker/internal/stores"
	"github.com/smocker-dev/smocker/internal/types"
)

type MocksService struct {
	memoryStore *stores.MemoryStoreTx
}

func NewMocksService(memoryStore *stores.MemoryStoreTx) *MocksService {
	return &MocksService{
		memoryStore: memoryStore,
	}
}

func (s *MocksService) MatchRequest(ctx context.Context, request types.Request) (types.MockResponse, types.Mock) {
	timelineID := request.Headers.Get("X-Smocker-Timeline")
	var matchedMock *types.Mock
	exhaustedMocks := []uuid.UUID{}
	if err := s.memoryStore.WithRWLock(ctx, func(ctx context.Context, s stores.MemoryStoreRW) error {
		if timelineID == "" {
			var err error
			timelineID, err = s.GetCurrentTimelineID(ctx)
			if err != nil {
				if !errors.Is(err, types.ErrNoCurrentTimeline) {
					return fmt.Errorf("failed to get current timeline: %w", err)
				}

				newID, err := uuid.NewV7()
				if err != nil {
					return fmt.Errorf("failed to generate UUID for default timeline: %w", err)
				}
				timelineID = newID.String()

				if err := s.CreateTimeline(ctx, types.Timeline{
					ID:        timelineID,
					Name:      "Default Timeline",
					CreatedAt: time.Now().UTC(),
					UpdatedAt: time.Now().UTC(),
				}); err != nil {
					return fmt.Errorf("failed to create default timeline: %w", err)
				}

				if err := s.UseTimeline(ctx, timelineID); err != nil {
					return fmt.Errorf("failed to use default timeline: %w", err)
				}
			}
		}

		mocks, err := s.ListTimelineMocks(ctx, timelineID)
		if err != nil {
			return fmt.Errorf("failed to list timeline mocks: %w", err)
		}

		for _, mock := range mocks {
			if !mock.Request.Match(request) {
				continue
			}

			timesCalled, err := s.GetMockTimesCalled(ctx, timelineID, mock.ID)
			if err != nil {
				return fmt.Errorf("failed to get mock times called: %w", err)
			}

			if mock.Options.Times != nil &&
				timesCalled >= *mock.Options.Times {
				exhaustedMocks = append(exhaustedMocks, mock.ID)
				continue
			}

			matchedMock = &mock.Mock
			if err := s.IncrementMockTimesCalled(ctx, timelineID, mock.ID); err != nil {
				return fmt.Errorf("failed to increase mock times called: %w", err)
			}

			break
		}

		return nil
	}); err != nil {
		return s.handleMatchRequestError(ctx, timelineID, request, err), types.Mock{}
	}

	if matchedMock == nil {
		return s.handleMatchRequestError(ctx, timelineID, request, &types.SmockerError{
			Err: types.ErrNoMatchingMock,
			Extra: map[string]any{
				"exhausted_mocks": exhaustedMocks,
			},
		}), types.Mock{}
	}

	var response types.MockResponse
	switch {
	case matchedMock.Response != nil:
		response = *matchedMock.Response

	case matchedMock.DynamicResponse != nil:
		var err error
		response, err = executeDynamicMock(ctx, matchedMock.DynamicResponse, request)
		if err != nil {
			return s.handleMatchRequestError(ctx, timelineID, request, err), types.Mock{}
		}

	case matchedMock.Proxy != nil:
		var err error
		response, err = s.executeProxyMock(ctx, *matchedMock.Proxy, request)
		if err != nil {
			return s.handleMatchRequestError(ctx, timelineID, request, err), types.Mock{}
		}
	}

	if response.Status == 0 {
		response.Status = http.StatusOK
	}

	headers := response.Headers.ToHeader()

	var parsedResponseBody any
	if response.Body != "" {
		switch headers.Get("Content-Type") {
		case "application/json":
			if err := bind.JSON(strings.NewReader(response.Body), &parsedResponseBody); err != nil {
				slog.ErrorContext(ctx, "failed to unmarshal response body as json", slog.Any("error", err))
			}

		case "application/yaml", "application/x-yaml":
			if err := bind.YAML(strings.NewReader(response.Body), &parsedResponseBody); err != nil {
				slog.ErrorContext(ctx, "failed to unmarshal response body as yaml", slog.Any("error", err))
			}

		case "application/xml":
			if err := bind.XML(strings.NewReader(response.Body), &parsedResponseBody); err != nil {
				slog.ErrorContext(ctx, "failed to unmarshal response body as xml", slog.Any("error", err))
			}

		default:
			// Try with JSON as a fallback when the content type is unknown
			if err := bind.JSON(strings.NewReader(response.Body), &parsedResponseBody); err != nil { //nolint:staticcheck
				// No need to log the error here, as this is just a fallback
			}
		}
	}

	historyEntryID, err := uuid.NewV7()
	if err != nil {
		slog.WarnContext(ctx, "failed to generate UUID for history entry", slog.Any("error", err))
		historyEntryID = uuid.New()
	}

	historyEntry := types.HistoryEntry{
		ID:         historyEntryID,
		TimelineID: timelineID,
		Metadata: types.HistoryEntryMetadata{
			MatchedMockID: &matchedMock.ID,
		},
		Request: request,
		Response: types.Response{
			Status:     response.Status,
			BodyString: response.Body,
			Body:       parsedResponseBody,
			Headers:    headers,
			Date:       time.Now().UTC(),
		},
	}

	if err := s.memoryStore.WithRWLock(ctx, func(ctx context.Context, s stores.MemoryStoreRW) error {
		if err := s.AppendTimelineHistoryEntry(ctx, timelineID, historyEntry); err != nil {
			return fmt.Errorf("failed to append history entry: %w", err)
		}

		return nil
	}); err != nil {
		return s.handleMatchRequestError(ctx, timelineID, request, err), types.Mock{}
	}

	return response, *matchedMock
}

func (s *MocksService) handleMatchRequestError(ctx context.Context, timelineID string, request types.Request, matchErr error) types.MockResponse {
	historyEntryID, err := uuid.NewV7()
	if err != nil {
		slog.WarnContext(ctx, "failed to generate UUID for history entry", slog.Any("error", err))
		historyEntryID = uuid.New()
	}

	historyEntry := types.HistoryEntry{
		ID:         historyEntryID,
		TimelineID: timelineID,
		Request:    request,
		Response: types.Response{
			Status: types.StatusSmockerError,
			Headers: http.Header{
				"Content-Type": []string{"application/problem+json"},
			},
			Date: time.Now().UTC(),
		},
	}

	apiErr := types.APIError{
		Status: types.StatusSmockerError,
		Type:   "uri:smocker:internal-error",
	}

	switch {
	case errors.Is(matchErr, types.ErrNoCurrentTimeline),
		errors.Is(matchErr, types.ErrTimelineNotFound),
		errors.Is(matchErr, types.ErrNoMatchingMock):
		apiErr.Type = "uri:smocker:client-error"
	}

	var smockerErr *types.SmockerError
	if errors.As(matchErr, &smockerErr) {
		apiErr.Title = smockerErr.Error()
		if smockerErr.WrappedError != nil {
			apiErr.Detail = smockerErr.WrappedError.Error()
		}
		apiErr.Extra = smockerErr.Extra
		apiErr.Instance = fmt.Sprintf("/timelines/%s/history/%s", timelineID, historyEntry.ID)
	} else {
		apiErr.Title = "failed to match request"
		apiErr.Detail = matchErr.Error()
	}

	bodyBytes, matchErr := json.Marshal(apiErr)
	if matchErr != nil {
		slog.ErrorContext(ctx, "failed to marshal API error", slog.Any("error", matchErr))
		return types.MockResponse{}
	}

	historyEntry.Response.BodyString = string(bodyBytes)

	if err := json.Unmarshal(bodyBytes, &historyEntry.Response.Body); err != nil {
		slog.ErrorContext(ctx, "failed to unmarshal API error body", slog.Any("error", err))
		historyEntry.Response.Body = historyEntry.Response.BodyString
	}

	if err := s.memoryStore.WithRWLock(ctx, func(ctx context.Context, s stores.MemoryStoreRW) error {
		if err := s.AppendTimelineHistoryEntry(ctx, timelineID, historyEntry); err != nil {
			return fmt.Errorf("failed to append history entry: %w", err)
		}

		return nil
	}); err != nil {
		slog.ErrorContext(ctx, "failed to append history entry", slog.Any("error", err))
		return types.MockResponse{}
	}

	return types.MockResponse{
		Status:  historyEntry.Response.Status,
		Headers: types.MapStringStringsFromHeader(historyEntry.Response.Headers),
		Body:    historyEntry.Response.BodyString,
	}
}

func executeDynamicMock(ctx context.Context, mock *types.MockDynamicResponse, request types.Request) (types.MockResponse, error) {
	switch mock.Engine {
	case types.EngineGoTemplateYAML:
		response, err := engines.NewGoTemplateYAMLEngine().Execute(ctx, request, mock.Script)
		if err != nil {
			return types.MockResponse{}, fmt.Errorf("failed to execute %s dynamic response: %w", types.EngineGoTemplateYAML, err)
		}

		return response, nil

	case types.EngineGoTemplateJSON:
		response, err := engines.NewGoTemplateJSONEngine().Execute(ctx, request, mock.Script)
		if err != nil {
			return types.MockResponse{}, fmt.Errorf("failed to execute %s dynamic response: %w", types.EngineGoTemplateJSON, err)
		}

		return response, nil

	default:
		return types.MockResponse{}, fmt.Errorf("invalid engine: %q", mock.Engine)
	}
}

func (s *MocksService) executeProxyMock(ctx context.Context, mock types.MockProxy, request types.Request) (types.MockResponse, error) {
	proxyURL, err := url.Parse(mock.Host)
	if err != nil {
		return types.MockResponse{}, fmt.Errorf("failed to parse proxy host: %w", err)
	}

	proxyURL.Path = request.Path
	proxyURL.RawQuery = request.QueryParams.Encode()

	proxyReq, err := http.NewRequestWithContext(ctx, request.Method, proxyURL.String(), strings.NewReader(request.BodyString))
	if err != nil {
		return types.MockResponse{}, fmt.Errorf("failed to create proxy request: %w", err)
	}

	proxyReq.Header = request.Headers.Clone()
	if mock.KeepHost {
		proxyReq.Host = request.Headers.Get("Host")
	}

	for key, values := range mock.Headers {
		proxyReq.Header.Del(key)
		for _, value := range values {
			proxyReq.Header.Add(key, value)
		}
	}

	var client http.Client
	if !mock.FollowRedirects {
		client.CheckRedirect = func(req *http.Request, via []*http.Request) error {
			return http.ErrUseLastResponse
		}
	}

	if mock.SkipVerifyTLS {
		customTransport, ok := http.DefaultTransport.(*http.Transport)
		if !ok {
			return types.MockResponse{}, errors.New("failed to type assert default transport")
		}
		customTransport = customTransport.Clone()

		customTransport.TLSClientConfig = &tls.Config{
			InsecureSkipVerify: true, //nolint:gosec // Allowed explicitly by user configuration
		}
		client.Transport = customTransport
	}

	response, err := client.Do(proxyReq)
	if err != nil {
		return types.MockResponse{}, fmt.Errorf("failed to execute proxy request: %w", err)
	}
	defer response.Body.Close()

	body, err := io.ReadAll(response.Body)
	if err != nil {
		return types.MockResponse{}, fmt.Errorf("failed to read proxy response body: %w", err)
	}

	return types.MockResponse{
		Status:  response.StatusCode,
		Body:    string(body),
		Headers: types.MapStringStringsFromHeader(response.Header),
	}, nil
}
