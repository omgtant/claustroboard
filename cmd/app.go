package cmd

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"runtime"
	"syscall"
	"time"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"

	"omgtant/claustroboard/shared/config"
	"omgtant/claustroboard/shared/models"
	"omgtant/claustroboard/web"
)

var (
	_, b, _, _  = runtime.Caller(0)
	ProjectRoot = filepath.Join(filepath.Dir(b), "../..")
)

func Start() {
	// config
	db_addr := config.Get().DATABASE_CONNECTION_STRING
	addr := config.Get().APP_ADDRESS

	if db_addr == "" {
		panic("DATABASE_CONNECTION_STRING environment variable is not set")
	}
	if addr == "" {
		panic("APP_ADDRESS environment variable is not set")
	}

	// db
	db, err := gorm.Open(sqlite.Open(db_addr), &gorm.Config{})
	if err != nil {
		panic(err)
	}
	models.Setup(db)

	// http

	r := web.GetRouter()

	s := &http.Server{
		Addr:         addr,
		Handler:      r,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  15 * time.Second,
	}

	sigint := make(chan os.Signal, 1)
	signal.Notify(sigint, os.Interrupt)
	signal.Notify(sigint, syscall.SIGTERM)

	serverErrors := make(chan error, 1)

	go func() {
		serverErrors <- s.ListenAndServe()
	}()

	println("Server is ready to handle requests at http://" + addr)

	// listen for signals

	select {
	case err := <-serverErrors:
		fmt.Println(err)

	case <-sigint:
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		if err := s.Shutdown(ctx); err != nil {
			fmt.Println(err)

			if err = s.Close(); err != nil {
				fmt.Print(err)
			}
		}
	}
}
