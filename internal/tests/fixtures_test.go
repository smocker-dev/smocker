//go:build integration

package integration_test

import (
	"bytes"
	"cmp"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"os"
	"testing"

	"github.com/smocker-dev/smocker/internal/pkg/assert"
	"github.com/smocker-dev/smocker/internal/types"
)

var (
	hostMock   = cmp.Or(os.Getenv("TEST_HOST_MOCK"), "http://localhost:8080")
	hostConfig = cmp.Or(os.Getenv("TEST_HOST_CONFIG"), "http://localhost:8081")
	dsn        = cmp.Or(os.Getenv("TEST_SQLITE_DSN"), "./data/smocker.db")
)

func createTimeline(t *testing.T, ctx context.Context, timeline types.CreateTimelineRequest) types.CreateTimelineResponse {
	t.Helper()

	reqBody, err := json.Marshal(timeline)
	assert.Err(t, err, nil)

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, hostConfig+"/timelines", bytes.NewReader(reqBody))
	assert.Err(t, err, nil)
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	assert.Err(t, err, nil)
	defer resp.Body.Close()

	assert.Equal(t, http.StatusCreated, resp.StatusCode)

	rawBody, err := io.ReadAll(resp.Body)
	assert.Err(t, err, nil)

	var body types.CreateTimelineResponse
	assert.Err(t, json.Unmarshal(rawBody, &body), nil)

	return body
}

func useTimeline(t *testing.T, ctx context.Context, timelineID string) {
	t.Helper()

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, hostConfig+"/timelines/"+timelineID+"/use", nil)
	assert.Err(t, err, nil)

	resp, err := http.DefaultClient.Do(req)
	assert.Err(t, err, nil)
	defer resp.Body.Close()

	assert.Equal(t, http.StatusNoContent, resp.StatusCode)
}

func updateTimeline(t *testing.T, ctx context.Context, timelineID string, req types.UpdateTimelineRequest) types.UpdateTimelineResponse {
	t.Helper()

	reqBody, err := json.Marshal(req)
	assert.Err(t, err, nil)

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPut, hostConfig+"/timelines/"+timelineID, bytes.NewReader(reqBody))
	assert.Err(t, err, nil)
	httpReq.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(httpReq)
	assert.Err(t, err, nil)
	defer resp.Body.Close()

	assert.Equal(t, http.StatusOK, resp.StatusCode)

	rawBody, err := io.ReadAll(resp.Body)
	assert.Err(t, err, nil)

	var body types.UpdateTimelineResponse
	assert.Err(t, json.Unmarshal(rawBody, &body), nil)

	return body
}

func deleteTimeline(t *testing.T, ctx context.Context, timelineID string) {
	t.Helper()

	req, err := http.NewRequestWithContext(ctx, http.MethodDelete, hostConfig+"/timelines/"+timelineID, nil)
	assert.Err(t, err, nil)

	resp, err := http.DefaultClient.Do(req)
	assert.Err(t, err, nil)
	defer resp.Body.Close()

	assert.Equal(t, http.StatusNoContent, resp.StatusCode)
}
