package types

import (
	"encoding/json"
)

// StringSlice is a type that can unmarshal a string as a slice string
// This allows to write a single item slice as a string
type StringSlice []string

func (ss *StringSlice) UnmarshalJSON(data []byte) error {
	var str string
	if err := json.Unmarshal(data, &str); err == nil {
		*ss = append(*ss, str)
		return nil
	}

	var strSlice []string
	if err := json.Unmarshal(data, &strSlice); err != nil {
		return err
	}

	*ss = make(StringSlice, 0, len(strSlice))
	*ss = append(*ss, strSlice...)

	return nil
}

func (ss *StringSlice) UnmarshalYAML(unmarshal func(interface{}) error) error {
	var str string
	if err := unmarshal(&str); err == nil {
		*ss = append(*ss, str)
		return nil
	}

	var strSlice []string
	if err := unmarshal(&strSlice); err != nil {
		return err
	}

	*ss = make(StringSlice, 0, len(strSlice))
	*ss = append(*ss, strSlice...)

	return nil
}

type MapStringSlice map[string]StringSlice
