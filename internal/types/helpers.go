package types

import (
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/goccy/go-yaml"
)

// Strings can unmarshal a string as a slice string.
// This allows to write a single item slice as a string.
type Strings []string

var (
	_ json.Unmarshaler      = &Strings{}
	_ yaml.BytesUnmarshaler = &Strings{}
)

func (ss *Strings) UnmarshalJSON(data []byte) error {
	var str string
	if err := json.Unmarshal(data, &str); err == nil {
		*ss = append(*ss, str)
		return nil
	}

	var strSlice []string
	if err := json.Unmarshal(data, &strSlice); err != nil {
		return fmt.Errorf("failed to unmarshal strings: %w", err)
	}

	*ss = make(Strings, 0, len(strSlice))
	*ss = append(*ss, strSlice...)

	return nil
}

func (ss *Strings) UnmarshalYAML(data []byte) error {
	var str string
	if err := yaml.Unmarshal(data, &str); err == nil {
		*ss = append(*ss, str)
		return nil
	}

	var strSlice []string
	if err := yaml.Unmarshal(data, &strSlice); err != nil {
		return fmt.Errorf("failed to unmarshal strings: %w", err)
	}

	*ss = make(Strings, 0, len(strSlice))
	*ss = append(*ss, strSlice...)

	return nil
}

type MapStringStrings map[string]Strings

func MapStringStringsFromHeader(header http.Header) MapStringStrings {
	m := make(MapStringStrings, len(header))
	for k, v := range header {
		m[k] = v
	}

	return m
}

func (m MapStringStrings) ToHeader() http.Header {
	header := make(http.Header, len(m))
	for k, v := range m {
		header[k] = v
	}

	return header
}
