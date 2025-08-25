package config

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

type SecretLoader struct {
	secretsDir string
	secrets    map[string]string
	initError  error
}

var _ ConfigLoader = &SecretLoader{}

func NewSecretLoader(secretsDir string) ConfigLoader {
	if secretsDir == "" {
		secretsDir = "/run/secrets"
	}
	sl := &SecretLoader{
		secretsDir: secretsDir,
		secrets:    make(map[string]string),
	}
	sl.initError = sl.readAll()
	return sl
}

func (sl *SecretLoader) Load(c *config) error {
	if sl.initError != nil {
		return fmt.Errorf("secretloader initialization error: %w", sl.initError)
	}

	var loadErr error
	getSecret := func(key string) string {
		if loadErr != nil {
			return ""
		}
		value, exists := sl.secrets[key]
		if !exists {
			loadErr = fmt.Errorf("secret %s not found", key)
			return ""
		}
		return value
	}

	// getBoolSecret := func(key string) bool {
	// 	strValue := getSecret(key)
	// 	if loadErr != nil {
	// 		return false
	// 	}
	// 	boolValue, err := strconv.ParseBool(strValue)
	// 	if err != nil {
	// 		loadErr = fmt.Errorf("failed to parse bool secret %s: %w", key, err)
	// 		return false
	// 	}
	// 	return boolValue
	// }

	c.APP_ADDRESS = getSecret("app_address")
	c.ENVIRONMENT = "production"
	c.DISCORD_FEEDBACK_WEBHOOK_URL = getSecret("discord_feedback_webhook_url")

	return loadErr
}

func (sl *SecretLoader) readAll() error {
	err := isDir(sl.secretsDir)
	if err != nil {
		return err
	}
	files, err := os.ReadDir(sl.secretsDir)
	if err != nil {
		return err
	}
	for _, file := range files {
		if file.IsDir() {
			continue
		}
		err := sl.read(file.Name())
		if err != nil {
			return err
		}
	}
	return nil
}

func (sl *SecretLoader) read(file string) error {
	buf, err := os.ReadFile(filepath.Join(sl.secretsDir, file))
	if err != nil {
		return err
	}
	sl.secrets[strings.ToLower(file)] = strings.TrimSpace(string(buf))
	return nil
}

func isDir(path string) error {
	fi, err := os.Stat(path)
	if err != nil {
		return err
	}
	if !fi.Mode().IsDir() {
		return fmt.Errorf("is not a directory: %s", path)
	}
	return nil
}
