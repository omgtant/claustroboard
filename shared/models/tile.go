package models

import (
	"omgtant/claustroboard/shared/enums"

	"math/rand"
)

type Tile struct {
	PosX    uint16 `gorm:"primarykey"`
	PosY    uint16 `gorm:"primarykey"`
	BoardID uint   `gorm:"primarykey"`
	Board   Board  `gorm:"foreignKey:BoardID"`
	Open    bool
	Color   enums.TileColor
	Energy  int16
	Kind    enums.TileKind
}

func RandomizeTileKind(board Board, tk enums.TileKind, x, y uint16) *Tile {
	tile := &Tile{
		PosX:   x,
		PosY:   y,
		Board:  board,
		Open:   true,
		Kind:   tk,
		Color:  enums.ColorLess,
		Energy: 0,
	}

	switch tk {
	case enums.Layout:
		tile.Energy = int16(1 + rand.Intn(4))
		tile.Color = enums.RandomColor()
	case enums.Teleport:
		tile.Color = enums.RandomColor()
	case enums.Wall:
		tile.Open = false
	case enums.Wildcard:
		tile.Energy = 4
	case enums.Zero:
	}

	return tile
}

func RandomizeTile(board Board, x, y uint16) *Tile {
	return RandomizeTileKind(board, enums.RandomKind(), x, y)
}
