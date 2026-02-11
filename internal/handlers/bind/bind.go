package bind

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"reflect"

	"github.com/clbanning/mxj/v2"
	"gopkg.in/yaml.v3"
)

func init() {
	mxj.SetAttrPrefix("@")
}

func Bind(r *http.Request, v any) error {
	switch r.Header.Get("Content-Type") {
	case "application/json":
		return JSON(r.Body, v)

	case "application/yaml", "application/x-yaml":
		return YAML(r.Body, v)

	default:
		return JSON(r.Body, v)
	}
}

func JSON(r io.Reader, v any) error {
	if err := json.NewDecoder(r).Decode(v); err != nil {
		return fmt.Errorf("failed to decode JSON: %w", err)
	}

	return nil
}

func YAML(r io.Reader, v any) error {
	if err := yaml.NewDecoder(r).Decode(v); err != nil {
		return fmt.Errorf("failed to decode YAML: %w", err)
	}

	return nil
}

func XML(r io.Reader, v any) error {
	parsed, err := mxj.NewMapXmlReader(r)
	if err != nil {
		return fmt.Errorf("failed to decode XML: %w", err)
	}

	rv := reflect.ValueOf(v)
	if rv.Kind() != reflect.Pointer || rv.IsNil() {
		return fmt.Errorf("v must be a non-nil pointer, got %T", v)
	}

	rv.Elem().Set(reflect.ValueOf(map[string]any(parsed)))

	return nil
}
