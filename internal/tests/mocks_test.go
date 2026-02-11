//go:build integration

package integration_test

import (
	"context"
	"encoding/json"
	"net/http"
	"testing"

	"github.com/smocker-dev/smocker/internal/pkg/assert"
	"github.com/smocker-dev/smocker/internal/pkg/operators"
	"github.com/smocker-dev/smocker/internal/types"
)

func TestMockServer(t *testing.T) {
	timeline := createTimeline(t, t.Context(), types.CreateTimelineRequest{
		Name: "Timeline",
		Mocks: []types.CreateMock{
			{
				Request: types.MockRequest{
					Method: &types.StringMatcher{
						Matcher: operators.OperatorEquals,
						Value:   http.MethodGet,
					},
					Path: &types.StringMatcher{
						Matcher: operators.OperatorEquals,
						Value:   "/hello",
					},
				},
				Response: &types.MockResponse{
					Status: http.StatusOK,
					Headers: types.MapStringStrings{
						"Content-Type": types.Strings{"application/json"},
					},
					Body: `{"message": "Hello, world!"}`,
				},
			},
		},
	})
	t.Cleanup(func() {
		deleteTimeline(t, context.Background(), timeline.Timeline.ID)
	})

	useTimeline(t, t.Context(), timeline.Timeline.ID)

	req, err := http.NewRequestWithContext(t.Context(), http.MethodGet, hostMock+"/hello", nil)
	assert.Err(t, err, nil)

	resp, err := http.DefaultClient.Do(req)
	assert.Err(t, err, nil)
	defer resp.Body.Close()

	assert.Equal(t, resp.StatusCode, http.StatusOK)

	var body map[string]any
	assert.Err(t, json.NewDecoder(resp.Body).Decode(&body), nil)

	assert.Equal(t, body["message"], "Hello, world!")
}
