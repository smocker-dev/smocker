//go:build integration

package integration_test

import (
	"cmp"
	"net/http"
	"os"
	"testing"

	"github.com/smocker-dev/smocker/internal/pkg/assert"
)

func TestPing(t *testing.T) {
	t.Parallel()

	host := cmp.Or(os.Getenv("TEST_HOST_CONFIG"), "http://localhost:8081")

	req, err := http.NewRequestWithContext(t.Context(), http.MethodGet, host+"/ping", nil)
	assert.Err(t, err, nil)

	resp, err := http.DefaultClient.Do(req)
	assert.Err(t, err, nil)
	defer resp.Body.Close()

	assert.Equal(t, http.StatusNoContent, resp.StatusCode)
}
