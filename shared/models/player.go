package models

import "omgtant/claustroboard/shared/valueobjects"

type Player struct {
	Nickname string
	IsActive bool
	ShouldThrowOut bool
	Pos valueobjects.Point
}