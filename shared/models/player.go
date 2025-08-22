package models

import "omgtant/claustroboard/shared/valueobjects"

type Player struct {
	Nickname string
	IsActive bool
	Deleted  bool
	Pos      valueobjects.Point
}
