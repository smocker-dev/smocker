package selectors

import (
	"errors"
	"fmt"
	"reflect"
	"strings"
	"unicode"
)

func Get(in any, selector Selector) (any, error) {
	current := in
	for i, token := range selector {
		switch token := token.(type) {
		case string:
			if v := reflect.ValueOf(current); v.Kind() == reflect.Map {
				if !v.MapIndex(reflect.ValueOf(token)).IsValid() {
					return nil, fmt.Errorf("key doesn't exist at %s", selector.PartialString(i))
				}

				current = v.MapIndex(reflect.ValueOf(token)).Interface()
				continue
			}

			return nil, fmt.Errorf("expected map at %s, got %T", selector.PartialString(i), current)

		case int:
			if v := reflect.ValueOf(current); v.Kind() == reflect.Slice {
				if token >= v.Len() {
					return nil, fmt.Errorf("index out of range at %s", selector.PartialString(i))
				}

				current = v.Index(token).Interface()
				continue
			}

			return nil, fmt.Errorf("expected array at %s, got %T", selector.PartialString(i), current)

		default:
			panic(fmt.Sprintf("unexpected token type %T", token))
		}
	}

	return current, nil
}

type Selector []any

func (s Selector) PartialString(maxIndex int) string {
	var selector strings.Builder
	for i, token := range s {
		if i > maxIndex {
			break
		}

		switch token := token.(type) {
		case string:
			if selector.Len() > 0 {
				selector.WriteRune('.')
			}

			selector.WriteString(token)

		case int:
			fmt.Fprintf(&selector, "[%d]", token)

		default:
			panic(fmt.Sprintf("unexpected token type %T", token))
		}
	}

	return selector.String()
}

func (s Selector) String() string {
	return s.PartialString(len(s))
}

func MustParse(selector string) Selector {
	s, err := Parse(selector)
	if err != nil {
		panic(err)
	}

	return s
}

func isValidMapKeyRune(r rune) bool {
	return unicode.IsLetter(r) ||
		unicode.IsDigit(r) ||
		r == '_' || r == '-'
}

type tokenType int

const (
	tokenTypeUnknown tokenType = iota
	tokenTypeMapKey
	tokenTypeSliceIndex
)

func Parse(selector string) (Selector, error) {
	tokens := Selector{}

	tokenType := tokenTypeUnknown
	currentMapKey := strings.Builder{}
	currentSliceIndex := -1
	for i, r := range selector {
		switch tokenType {
		case tokenTypeUnknown:
			if r == '[' {
				tokenType = tokenTypeSliceIndex
				continue
			}

			if r == '.' {
				tokenType = tokenTypeMapKey
				continue
			}

			if isValidMapKeyRune(r) {
				tokenType = tokenTypeMapKey
				currentMapKey.WriteRune(r)
				continue
			}

			return nil, fmt.Errorf("unexpected character %q at index %d in selector", r, i)

		case tokenTypeMapKey:
			if r == '.' {
				if currentMapKey.Len() == 0 {
					return nil, fmt.Errorf("unexpected %q at index %d, expected valid map key", r, i)
				}

				tokens = append(tokens, currentMapKey.String())
				currentMapKey.Reset()
				tokenType = tokenTypeMapKey
				continue
			}

			if r == '[' {
				if currentMapKey.Len() == 0 {
					return nil, fmt.Errorf("unexpected %q at index %d, expected valid map key", r, i)
				}

				tokens = append(tokens, currentMapKey.String())
				currentMapKey.Reset()
				tokenType = tokenTypeSliceIndex
				continue
			}

			if isValidMapKeyRune(r) {
				currentMapKey.WriteRune(r)
				continue
			}

			return nil, fmt.Errorf("unexpected character %q at index %d in map key", r, i)

		case tokenTypeSliceIndex:
			if r == ']' {
				if currentSliceIndex < 0 {
					return nil, fmt.Errorf("unexpected %q at index %d, expected array index", r, i)
				}

				tokens = append(tokens, currentSliceIndex)
				currentSliceIndex = -1
				tokenType = tokenTypeUnknown
				continue
			}

			if r >= '0' && r <= '9' {
				if currentSliceIndex < 0 {
					currentSliceIndex = 0
				}

				currentSliceIndex = currentSliceIndex*10 + int(r-'0')
				continue
			}

			return nil, fmt.Errorf("unexpected character %q at index %d in array index", r, i)
		}
	}

	switch tokenType {
	case tokenTypeMapKey:
		tokens = append(tokens, currentMapKey.String())

	case tokenTypeSliceIndex:
		return nil, errors.New("unexpected end of selector, expected ']'")
	}

	return tokens, nil
}
