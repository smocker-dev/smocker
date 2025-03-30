package templates

import "encoding/json"

func StructToMSI(s any) (map[string]any, error) {
	bytes, err := json.Marshal(s)
	if err != nil {
		return nil, err
	}
	msi := map[string]any{}
	err = json.Unmarshal(bytes, &msi)
	if err != nil {
		return nil, err
	}
	return msi, nil
}
