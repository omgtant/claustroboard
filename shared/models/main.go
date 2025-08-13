package models

import (
	"gorm.io/gorm"
)

var (
	db *gorm.DB
)

func Setup (_db *gorm.DB) {
	db = _db
	db.AutoMigrate(&Player{})
}