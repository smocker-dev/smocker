package operators

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"reflect"
	"regexp"
)

type Operator string

const (
	OperatorEquals       Operator = "eq"
	OperatorEqualsSymbol Operator = "=="

	OperatorNotEquals       Operator = "!eq"
	OperatorNotEqualsSymbol Operator = "!="

	OperatorMatchesRegexp       Operator = "match"
	OperatorMatchesRegexpSymbol Operator = "=~"

	OperatorNotMatchesRegexp       Operator = "!match"
	OperatorNotMatchesRegexpSymbol Operator = "!~"
)

func (o Operator) IsValid() bool {
	switch o {
	case OperatorEquals, OperatorEqualsSymbol,
		OperatorNotEquals, OperatorNotEqualsSymbol,
		OperatorMatchesRegexp, OperatorMatchesRegexpSymbol,
		OperatorNotMatchesRegexp, OperatorNotMatchesRegexpSymbol:
		return true
	default:
		return false
	}
}

type OperatorFunc = func(actual any, operand any) error

var Operators = map[Operator]OperatorFunc{
	OperatorEquals:                 Equals,
	OperatorEqualsSymbol:           Equals,
	OperatorNotEquals:              NotEquals,
	OperatorNotEqualsSymbol:        NotEquals,
	OperatorMatchesRegexp:          MatchesRegexp,
	OperatorMatchesRegexpSymbol:    MatchesRegexp,
	OperatorNotMatchesRegexp:       NotMatchesRegexp,
	OperatorNotMatchesRegexpSymbol: NotMatchesRegexp,
}

var (
	ErrActualType  = errors.New("unexpected actual type")
	ErrOperandType = errors.New("unexpected operand type")
)

func compareEquality(actual any, operand any) (bool, error) {
	valueOfActual := reflect.ValueOf(actual)
	valueOfOperand := reflect.ValueOf(operand)

	switch {
	case valueOfActual.CanInt():
		if !valueOfOperand.CanInt() {
			return false, fmt.Errorf("%w: expected operand to be an integer, got %T", ErrOperandType, operand)
		}

		valueInt := valueOfActual.Int()
		operandInt := valueOfOperand.Int()

		return valueInt == operandInt, nil

	case valueOfActual.CanUint():
		var operandUint uint64
		switch {
		case valueOfOperand.CanUint():
			operandUint = reflect.ValueOf(operand).Uint()

		case valueOfOperand.CanInt():
			operandInt := valueOfOperand.Int()
			if operandInt < 0 {
				return false, fmt.Errorf("%w: expected operand to be an unsigned integer, got %T", ErrOperandType, operand)
			}
			operandUint = uint64(operandInt)

		default:
			return false, fmt.Errorf("%w: expected operand to be an unsigned integer, got %T", ErrOperandType, operand)
		}

		valueUint := reflect.ValueOf(actual).Uint()

		return valueUint == operandUint, nil

	case valueOfActual.CanFloat():
		var operandFloat float64
		switch {
		case valueOfOperand.CanFloat():
			operandFloat = reflect.ValueOf(operand).Float()

		case valueOfOperand.CanInt():
			operandFloat = float64(valueOfOperand.Int())

		default:
			return false, fmt.Errorf("%w: expected operand to be a float, got %T", ErrOperandType, operand)
		}

		valueFloat := valueOfActual.Float()

		return valueFloat == operandFloat, nil

	case valueOfActual.Kind() == reflect.String:
		if reflect.ValueOf(operand).Kind() != reflect.String {
			return false, fmt.Errorf("%w: expected operand to be a string, got %T", ErrOperandType, operand)
		}

		valueString := actual.(string)    //nolint:forcetypeassert
		operandString := operand.(string) //nolint:forcetypeassert

		return valueString == operandString, nil

	case valueOfActual.Kind() == reflect.Bool:
		if reflect.ValueOf(operand).Kind() != reflect.Bool {
			return false, fmt.Errorf("%w: expected operand to be a boolean, got %T", ErrOperandType, operand)
		}

		valueBool := actual.(bool)    //nolint:forcetypeassert
		operandBool := operand.(bool) //nolint:forcetypeassert

		return valueBool == operandBool, nil

	case valueOfActual.Kind() == reflect.Slice ||
		valueOfActual.Kind() == reflect.Map:
		valueBytes, err := json.Marshal(actual)
		if err != nil {
			return false, fmt.Errorf("%w: failed to encode value to JSON", err)
		}

		operandBytes, err := json.Marshal(operand)
		if err != nil {
			return false, fmt.Errorf("%w: failed to encode operand to JSON", err)
		}

		// TODO: ignored paths
		// TODO: add diff to error message

		return bytes.Equal(valueBytes, operandBytes), nil

	default:
		return false, fmt.Errorf("unexpected actual type, got %T", actual)
	}
}

func Equals(actual any, operand any) error {
	equal, err := compareEquality(actual, operand)
	if err != nil {
		return err
	}

	if !equal {
		return fmt.Errorf("expected actual to be equal to %v, got %v", operand, actual)
	}

	return nil
}

func NotEquals(actual any, operand any) error {
	equal, err := compareEquality(actual, operand)
	if err != nil {
		return err
	}

	if equal {
		return fmt.Errorf("expected actual to not be equal to %v", operand)
	}

	return nil
}

func MatchesRegexp(actual any, operand any) error {
	actualString, ok := actual.(string)
	if !ok {
		return fmt.Errorf("%w: expected actual to be a string, got %T", ErrActualType, actual)
	}

	operandString, ok := operand.(string)
	if !ok {
		return fmt.Errorf("%w: expected operand to be a string, got %T", ErrOperandType, operand)
	}

	re, err := regexp.Compile(operandString)
	if err != nil {
		return fmt.Errorf("%w: %w", ErrOperandType, err)
	}

	if !re.MatchString(actualString) {
		return fmt.Errorf("expected actual to match %q, got %q", re.String(), actual)
	}

	return nil
}

func NotMatchesRegexp(actual any, operand any) error {
	actualString, ok := actual.(string)
	if !ok {
		return fmt.Errorf("%w: expected actual to be a string, got %T", ErrActualType, actual)
	}

	operandString, ok := operand.(string)
	if !ok {
		return fmt.Errorf("%w: expected operand to be a string, got %T", ErrOperandType, operand)
	}

	re, err := regexp.Compile(operandString)
	if err != nil {
		return fmt.Errorf("%w: %w", ErrOperandType, err)
	}

	if re.MatchString(actualString) {
		return fmt.Errorf("expected actual to not match %q, got %q", re.String(), actual)
	}

	return nil
}
