package config

import (
	"github.com/joho/godotenv"
)

type EnvLoader struct {
	path string
}

var _ ConfigLoader = &EnvLoader{}

func NewEnvLoader(path string) ConfigLoader {
	return &EnvLoader{
		path: path,
	}
}

func (e *EnvLoader) Load(c *config) error {
	envFile, err := godotenv.Read(e.path)
	if err != nil {
		return err
	}

	c.APP_ADDRESS = envFile["APP_ADDRESS"]
	c.ENVIRONMENT = envFile["ENVIRONMENT"]
	c.DISCORD_FEEDBACK_WEBHOOK_URL = envFile["DISCORD_FEEDBACK_WEBHOOK_URL"]
	return nil
}
