package services

import (
	"fmt"
	"os"
	"path/filepath"
	"testing"

	"github.com/smocker-dev/smocker/server/types"
)

// TestLoadSessionsResilientToMissingFiles locks the fix for the recurring persistence bug:
// a single incomplete session directory (e.g. a missing mocks.yml after a partial write or a
// mid-write pod restart) used to make LoadSessions fail and drop EVERY persisted session.
// Loading must now be best-effort per session: other sessions still load, and a session with a
// missing file keeps its name and whatever else is readable.
func TestLoadSessionsResilientToMissingFiles(t *testing.T) {
	dir := t.TempDir()

	write := func(name, content string) {
		t.Helper()
		full := filepath.Join(dir, name)
		if err := os.MkdirAll(filepath.Dir(full), 0o755); err != nil {
			t.Fatal(err)
		}
		if err := os.WriteFile(full, []byte(content), 0o644); err != nil {
			t.Fatal(err)
		}
	}

	write("sessions.yml", "- id: sess-full\n  name: Full\n  date: 2020-01-01T00:00:00Z\n"+
		"- id: sess-partial\n  name: Partial\n  date: 2020-01-01T00:00:00Z\n")
	// Complete session: has both mocks and history.
	write("sess-full/mocks.yml", "- request:\n    path: /a\n  response:\n    status: 200\n")
	write("sess-full/history.yml", "[]\n")
	// Partial session: history only, mocks.yml is missing (the failure case).
	write("sess-partial/history.yml", "[]\n")

	sessions, err := NewPersistence(dir).LoadSessions()
	if err != nil {
		t.Fatalf("LoadSessions must not fail because of a partial session dir: %v", err)
	}
	if len(sessions) != 2 {
		t.Fatalf("expected both sessions to load, got %d", len(sessions))
	}

	byName := map[string]*types.Session{}
	for _, s := range sessions {
		byName[s.Name] = s
	}
	if full := byName["Full"]; full == nil || len(full.Mocks) != 1 {
		t.Errorf("complete session should keep its mock, got %+v", full)
	}
	if partial := byName["Partial"]; partial == nil {
		t.Error("partial session must still be loaded (by name)")
	} else if len(partial.Mocks) != 0 {
		t.Errorf("partial session with missing mocks.yml should have no mocks, got %d", len(partial.Mocks))
	}
}

// TestStoreAndLoadManySessions round-trips more sessions than maxPersistenceConcurrency to
// ensure the file-descriptor bounding (errgroup SetLimit) throttles correctly without
// deadlocking or dropping data.
func TestStoreAndLoadManySessions(t *testing.T) {
	dir := t.TempDir()
	const n = maxPersistenceConcurrency*3 + 1 // comfortably above the concurrency limit

	sessions := make(types.Sessions, 0, n)
	for i := 0; i < n; i++ {
		sessions = append(sessions, &types.Session{
			ID:   fmt.Sprintf("sess-%d", i),
			Name: fmt.Sprintf("Session %d", i),
			Mocks: types.Mocks{{
				Request: types.MockRequest{
					Path:   types.StringMatcher{Matcher: "ShouldEqual", Value: fmt.Sprintf("/p%d", i)},
					Method: types.StringMatcher{Matcher: "ShouldEqual", Value: "GET"},
				},
				Response: &types.MockResponse{Status: 200},
			}},
		})
	}

	p := NewPersistence(dir)
	p.StoreSessions(sessions)

	loaded, err := p.LoadSessions()
	if err != nil {
		t.Fatalf("LoadSessions: %v", err)
	}
	if len(loaded) != n {
		t.Fatalf("expected %d sessions, got %d", n, len(loaded))
	}
	for _, s := range loaded {
		if len(s.Mocks) != 1 {
			t.Fatalf("session %q should have 1 mock, got %d", s.ID, len(s.Mocks))
		}
	}
}
