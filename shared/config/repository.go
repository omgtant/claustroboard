package config

import "errors"

type config struct {
	APP_ADDRESS                string
	ENVIRONMENT                string
	DATABASE_CONNECTION_STRING string
}

var configInstance *config

func Get() *config {
	if configInstance == nil {
		configInstance = &config{}
	}
	return configInstance
}

type ConfigLoader interface {
	Load(*config) error
}

func Load(loader ConfigLoader) error {
	configInstance = &config{}
	return loader.Load(configInstance)
}

func TryDetectConfig() (err error) {
	return TryLoadConfigs(
		NewEnvLoader(".env"),
		NewSecretLoader("/run/secrets"),
	)
}

func TryLoadConfigs(configs ...ConfigLoader) (err error) {
	for _, loader := range configs {
		err = Load(loader)
		if err == nil {
			return nil
		}
	}

	return errors.New("failed to load config")
}
