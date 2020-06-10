package services

import (
	"io/ioutil"
	"os"
	"path/filepath"
)

func ClearDir(dir string) error {
	if _, err := os.Stat(dir); os.IsNotExist(err) {
		if err := os.MkdirAll(dir, os.ModePerm); err != nil {
			return err
		}
		return nil
	}
	files, err := ioutil.ReadDir(dir)
	if err != nil {
		return err
	}
	for _, file := range files {
		os.RemoveAll(filepath.Join(dir, file.Name()))
	}
	return nil
}
