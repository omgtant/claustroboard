package main

import (
	"omgtant/claustroboard/cmd"
	"omgtant/claustroboard/shared/config"
)

func main() {
	err := config.TryDetectConfig()
	if err != nil {
		panic(err)
	}

	cmd.Start()
}
