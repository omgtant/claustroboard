package dtos

import (
	"omgtant/claustroboard/shared/valueobjects"
)

type Player struct {
	Name string             `json:"nickname"`
	Pos  valueobjects.Point `json:"position"`
}
