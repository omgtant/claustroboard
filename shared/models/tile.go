package models

import (
	"encoding/json"
	"omgtant/claustroboard/shared/enums"
	"omgtant/claustroboard/shared/valueobjects"

	"math/rand"
)

type Tile struct {
	Pos    valueobjects.Point
	Open   bool
	Color  enums.TileColor
	Energy int16
	Kind   enums.TileKind
	Data   map[string]json.RawMessage
}

func RandomizeTileKind(tk enums.TileKind, x, y uint16) *Tile {
	tile := &Tile{
		Pos:    valueobjects.Point{X: x, Y: y},
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

func RandomizeTile(x, y uint16) *Tile {
	return RandomizeTileKind(enums.RandomKind(), x, y)
}

func (t1 Tile) Copy() (t2 Tile) {
	t2.Pos = t1.Pos
	t2.Open = t1.Open
	t2.Color = t1.Color
	t2.Energy = t1.Energy
	t2.Kind = t1.Kind
	t2.Data = map[string]json.RawMessage{}
	for k, v := range t1.Data {
		t2.Data[k] = v
	}

	return
}
