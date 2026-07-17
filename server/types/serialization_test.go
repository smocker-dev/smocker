package types

// This file locks the observable "mock format" contract: the exact bytes produced
// when Smocker serializes mocks / history / sessions to YAML and JSON.
//
// It is the regression net that must stay green across any dependency or refactoring
// change (yaml library swap, code cleanup, Go version bump...). If a change alters the
// serialized output, these tests fail on purpose — the format is frozen.
//
// Two complementary guards:
//   - TestSerializationGolden: canonicalizes representative fixtures (all tests/data/*.yml
//     mocks, plus the real on-disk session/history/summary files under tests/sessions) into
//     YAML (and JSON for mocks), and compares the bytes against committed golden files.
//     Regenerate after an *intentional* format change with:
//        go test ./server/types -run TestSerializationGolden -update-golden
//   - TestSerializationFixedPoint: asserts that re-marshaling an already-marshaled value is
//     byte-identical (the canonical form is a stable fixed point), so persisted files stop
//     drifting once written.
//
// NOTE: the committed tests/sessions fixtures were produced by an older Smocker build and use
// a different indentation than the current encoder — they are kept only as load-compatibility
// inputs (exercised by the venom 0_persistence suite). The golden files here capture what the
// CURRENT code emits, which is the format we must preserve going forward.

import (
	"bytes"
	"encoding/json"
	"flag"
	"os"
	"path/filepath"
	"sort"
	"testing"

	"gopkg.in/yaml.v3"
)

var updateGolden = flag.Bool("update-golden", false, "regenerate golden serialization files")

const (
	dataDir     = "../../tests/data"
	sessionsDir = "../../tests/sessions"
	goldenDir   = "../../tests/serialization"
)

// loadFn reads a fixture file and returns a freshly-populated value of the right type.
type goldenCase struct {
	golden string // golden basename (without extension)
	source string // fixture file to load
	load   func(raw []byte) (interface{}, error)
	json   bool // also lock JSON output
}

func mockCases(t *testing.T) []goldenCase {
	entries, err := os.ReadDir(dataDir)
	if err != nil {
		t.Fatalf("unable to read fixtures directory %q: %v", dataDir, err)
	}
	names := make([]string, 0, len(entries))
	for _, e := range entries {
		if !e.IsDir() && filepath.Ext(e.Name()) == ".yml" {
			names = append(names, e.Name())
		}
	}
	sort.Strings(names)
	if len(names) == 0 {
		t.Fatalf("no .yml fixtures found in %q", dataDir)
	}

	cases := make([]goldenCase, 0, len(names))
	for _, name := range names {
		base := name[:len(name)-len(filepath.Ext(name))]
		cases = append(cases, goldenCase{
			golden: "mock_" + base,
			source: filepath.Join(dataDir, name),
			load:   loadValidatedMocks,
			json:   true,
		})
	}
	return cases
}

func sessionCases(t *testing.T) []goldenCase {
	cases := []goldenCase{{
		golden: "sessions_summary",
		source: filepath.Join(sessionsDir, "sessions.yml"),
		load: func(raw []byte) (interface{}, error) {
			var s []SessionSummary
			err := yaml.Unmarshal(raw, &s)
			return s, err
		},
	}}

	dirs, err := os.ReadDir(sessionsDir)
	if err != nil {
		t.Fatalf("unable to read sessions directory %q: %v", sessionsDir, err)
	}
	for _, d := range dirs {
		if !d.IsDir() {
			continue
		}
		if f := filepath.Join(sessionsDir, d.Name(), "mocks.yml"); fileExists(f) {
			cases = append(cases, goldenCase{
				golden: "persisted_mocks",
				source: f,
				load: func(raw []byte) (interface{}, error) {
					var m Mocks
					err := yaml.Unmarshal(raw, &m)
					return m, err
				},
			})
		}
		if f := filepath.Join(sessionsDir, d.Name(), "history.yml"); fileExists(f) {
			cases = append(cases, goldenCase{
				golden: "persisted_history",
				source: f,
				load: func(raw []byte) (interface{}, error) {
					var h History
					err := yaml.Unmarshal(raw, &h)
					return h, err
				},
			})
		}
	}
	return cases
}

// TestSerializationGolden freezes the canonical YAML/JSON serialization of every
// representative value. Loading a fixture then re-encoding it yields the canonical form
// Smocker persists and returns over the API; locking those bytes guards the format.
func TestSerializationGolden(t *testing.T) {
	cases := append(mockCases(t), sessionCases(t)...)
	for _, c := range cases {
		c := c
		t.Run(c.golden, func(t *testing.T) {
			raw, err := os.ReadFile(c.source)
			if err != nil {
				t.Fatal(err)
			}
			v, err := c.load(raw)
			if err != nil {
				t.Fatalf("load %s: %v", c.source, err)
			}

			yamlOut, err := yaml.Marshal(v)
			if err != nil {
				t.Fatalf("marshal yaml: %v", err)
			}
			assertGolden(t, c.golden+".golden.yaml", yamlOut)

			if c.json {
				jsonOut, err := json.MarshalIndent(v, "", "  ")
				if err != nil {
					t.Fatalf("marshal json: %v", err)
				}
				assertGolden(t, c.golden+".golden.json", append(jsonOut, '\n'))
			}
		})
	}
}

// TestSerializationFixedPoint proves the canonical YAML form is stable: marshaling, then
// unmarshaling and marshaling again must yield identical bytes. Without this, persisted
// files could keep changing on every rewrite even though the data is unchanged.
func TestSerializationFixedPoint(t *testing.T) {
	for _, c := range append(mockCases(t), sessionCases(t)...) {
		c := c
		t.Run(c.golden, func(t *testing.T) {
			raw, err := os.ReadFile(c.source)
			if err != nil {
				t.Fatal(err)
			}
			v, err := c.load(raw)
			if err != nil {
				t.Fatal(err)
			}
			first, err := yaml.Marshal(v)
			if err != nil {
				t.Fatal(err)
			}
			v2, err := c.load(first)
			if err != nil {
				t.Fatalf("reload marshaled output: %v", err)
			}
			second, err := yaml.Marshal(v2)
			if err != nil {
				t.Fatal(err)
			}
			if !bytes.Equal(first, second) {
				t.Fatalf("marshaling is not a fixed point for %s.\n--- first ---\n%s\n--- second ---\n%s", c.golden, first, second)
			}
		})
	}
}

// loadValidatedMocks mirrors the real pipeline: mocks are validated (which fills default
// matchers, trims, etc.) before being persisted, so the golden must reflect the validated form.
func loadValidatedMocks(raw []byte) (interface{}, error) {
	var m Mocks
	if err := yaml.Unmarshal(raw, &m); err != nil {
		return nil, err
	}
	for _, mock := range m {
		if err := mock.Validate(); err != nil {
			return nil, err
		}
	}
	return m, nil
}

func fileExists(path string) bool {
	_, err := os.Stat(path)
	return err == nil
}

func assertGolden(t *testing.T, name string, got []byte) {
	t.Helper()
	path := filepath.Join(goldenDir, name)
	if *updateGolden {
		if err := os.MkdirAll(goldenDir, 0o755); err != nil {
			t.Fatal(err)
		}
		if err := os.WriteFile(path, got, 0o644); err != nil {
			t.Fatal(err)
		}
		t.Logf("updated golden %s", path)
		return
	}
	want, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read golden %s (run with -update-golden to create it): %v", path, err)
	}
	if !bytes.Equal(got, want) {
		t.Fatalf("serialization drift for %s.\n--- want (golden) ---\n%s\n--- got ---\n%s", name, want, got)
	}
}
