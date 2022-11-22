package templates

import "encoding/json"

func StructToMSI(s interface{}) (map[string]interface{}, error) {
	bytes, err := json.Marshal(s)
	if err != nil {
		return nil, err
	}
	msi := map[string]interface{}{}
	err = json.Unmarshal(bytes, &msi)
	if err != nil {
		return nil, err
	}
	return msi, nil
}
