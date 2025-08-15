package models

import (
	"encoding/json"
	"omgtant/claustroboard/shared/enums"
	"omgtant/claustroboard/shared/valueobjects"

	"math/rand"
)

type Tile struct {
	Pos     valueobjects.Point
	BoardID uint
	Board   Board
	Open    bool
	Color   enums.TileColor
	Energy  int16
	Kind    enums.TileKind
	Data    map[string]json.RawMessage
}

func RandomizeTileKind(board Board, tk enums.TileKind, x, y uint16) *Tile {
	tile := &Tile{
		Pos:    valueobjects.Point{X: x, Y: y},
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
		tile.Color = enums.RandomColor()
	case enums.Zero:
		tile.Color = enums.RandomColor()
	}

	return tile
}

func RandomizeTile(board Board, x, y uint16) *Tile {
	return RandomizeTileKind(board, enums.RandomKind(), x, y)
}
