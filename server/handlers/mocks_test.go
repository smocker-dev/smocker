package handlers_test

import (
	"io"
	"net/http"
	"sync"
	"testing"
	"time"

	"github.com/Thiht/smocker/server"
	"github.com/Thiht/smocker/server/config"
	"github.com/Thiht/smocker/server/types"
)

func TestMocks_GenericHandler(t *testing.T) {
	server, mocks := server.NewMockServer(config.Config{
		LogLevel:             "panic",
		ConfigListenPort:     8081,
		ConfigBasePath:       "/",
		MockServerListenPort: 8080,
		StaticFiles:          ".",
		Build: config.Build{
			AppName:      "smocker",
			BuildVersion: "dev",
			BuildDate:    time.Now().String(),
		},
	})
	session := mocks.NewSession("test")
	_, err := mocks.AddMock(session.ID, &types.Mock{
		Request: types.MockRequest{
			Method: types.StringMatcher{Matcher: "ShouldMatch", Value: "GET"},
			Path:   types.StringMatcher{Matcher: "ShouldMatch", Value: "/api/v1"},
		},
		Response: &types.MockResponse{
			Status: 200,
			Body:   "test",
		},
		Context: &types.MockContext{
			Times: 60000,
		},
	})
	if err != nil {
		t.Fatalf("expected no error, got %s", err)
	}

	go func() {
		if err := server.ListenAndServe(); err != http.ErrServerClosed {
			t.Errorf("expected no error, got %s", err)
		}
	}()

	wg := &sync.WaitGroup{}
	wg.Add(20)
	for i := 0; i < 20; i++ {
		go func() {
			defer wg.Done()
			for j := 0; j < 3000; j++ {
				resp, err := http.Get("http://localhost:8080/api/v1")
				if err != nil {
					t.Errorf("expected no error, got %s", err)
				}

				body, err := io.ReadAll(resp.Body)
				if err != nil {
					t.Errorf("expected no error, got %s", err)
				}

				if resp.StatusCode != 200 {
					t.Errorf("expected status code 200, got %d", resp.StatusCode)
				}
				if string(body) != "test" {
					t.Errorf("expected body to be 'test', got %s", string(body))
				}
			}
		}()
	}

	wg.Wait()

	calls := session.Clone().Mocks.Clone()[0].State.TimesCount
	if *calls != 60000 {
		t.Errorf("expected 60000 calls, got %d", calls)
	}
}
