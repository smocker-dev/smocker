package types

import "regexp"

func CompileMultiMap(multiMap map[string][]string) (map[*regexp.Regexp][]*regexp.Regexp, error) {
	compiledMultiMap := map[*regexp.Regexp][]*regexp.Regexp{}
	for key, values := range multiMap {
		compiledKey, err := regexp.Compile(key)
		if err != nil {
			return nil, err
		}
		compiledMultiMap[compiledKey] = []*regexp.Regexp{}
		for _, value := range values {
			compiledValue, err := regexp.Compile(value)
			if err != nil {
				return nil, err
			}
			compiledMultiMap[compiledKey] = append(compiledMultiMap[compiledKey], compiledValue)
		}
	}
	return compiledMultiMap, nil
}

func MatchMultiMap(reg map[*regexp.Regexp][]*regexp.Regexp, values map[string][]string) bool {
	match := true
	for rKey, rValues := range reg {
		matchKey := false
		for key, values := range values {
			if rKey.MatchString(key) {
				if len(rValues) > len(values) {
					continue
				}
				matchValues := true
				for i, value := range rValues {
					if !value.MatchString(values[i]) {
						matchValues = false
						break
					}
				}
				if matchValues {
					matchKey = true
					break
				}
			}
		}
		if !matchKey {
			match = false
			break
		}

	}
	return match
}
