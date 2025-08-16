package models

import (
	"encoding/json"
	"errors"
	"omgtant/claustroboard/shared/dtos"
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

func (t Tile) CanLand() bool {
	return t.Kind == enums.Wildcard || t.Kind == enums.Layout || t.Kind == enums.Zero
}

func (t Tile) CanStart() bool {
	return t.Kind == enums.Wildcard || t.Kind == enums.Layout
}

func (t Tile) validateMove(b *Board, m dtos.Move) (destTile *Tile, err error) {
	dest := m.GetPoint()
	switch t.Kind {
	case enums.Layout:
		var ok bool
		destTile, ok = b.validateDist(t, dest, int(t.Energy), true)
		if !ok {
			err = errors.New("invalid layout move")
		}

	case enums.Wildcard:
		var ok bool
		destTile, ok = b.validateDist(t, dest, int(t.Energy), false)
		if !ok {
			err = errors.New("invalid wildcard move")
		}

	case enums.Teleport:
		destTile, err = b.getTileAt(dest)
		if err != nil || destTile.Color != t.Color {
			err = errors.New("invalid teleport move")
		}

	default:
		err = errors.New("invalid unknown move")
	}
	return
}

func (destTile Tile) applyMove(b *Board, from *Tile) (land bool) {
	from.Open = false

	i, _ := b.getTileIndex(from.Pos)
	b.Pos[i] = destTile.Pos

	if destTile.CanLand() {
		land = true
	}

	if destTile.Kind == enums.Zero {
		for i := 1; i < len(b.Pos); i++ {
			b.Pos[i] = b.Pos[i-1]
		}

		latestLastPlayerTile, _ := b.getTileAt(b.Pos[len(b.Pos)-1])
		newLastPlayerTile := latestLastPlayerTile.Copy()
		newLastPlayerTile.Pos = destTile.Pos
		b.Tiles[i] = newLastPlayerTile
		b.Pos[0] = destTile.Pos
	}

	return
}
