package models

import (
	"encoding/json"
	"errors"
	"fmt"
	"omgtant/claustroboard/shared/dtos"
	"omgtant/claustroboard/shared/enums"
	"omgtant/claustroboard/shared/valueobjects"

	"math/rand"
)

type Tile struct {
	Pos   valueobjects.Point
	Open  bool
	Color enums.TileColor
	Kind  enums.TileKind
	Data  map[string]json.RawMessage
}

func (t *Tile) getEnergy() int {
	if energyData, exists := t.Data["energy"]; exists {
		var energy int
		json.Unmarshal(energyData, &energy)
		return energy
	}
	return 0
}

func (t *Tile) setEnergy(e int) {
	if t.Data == nil {
		t.Data = make(map[string]json.RawMessage)
	}
	energyBytes, _ := json.Marshal(e)
	t.Data["energy"] = energyBytes
}

func RandomizeTileKind(tk enums.TileKind, x, y uint16) *Tile {
	tile := &Tile{
		Pos:   valueobjects.Point{X: x, Y: y},
		Open:  true,
		Kind:  tk,
		Color: enums.ColorLess,
	}

	switch tk {
	case enums.Layout:
		tile.setEnergy(1 + rand.Intn(4))
		tile.Color = enums.RandomColor()
	case enums.Teleport:
		tile.Color = enums.RandomColor()
	case enums.Wall:
		tile.Open = false
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

func (from Tile) validateMove(b *Board, m dtos.Move) (destTile *Tile, err error) {
	dest, err := m.GetPoint()
	if err != nil {
		return nil, errors.New("only point moves are implemented")
	}
	switch from.Kind {
	case enums.Layout:
		var ok bool
		destTile, ok = b.validateDist(from, dest, int(from.getEnergy()), true)
		if !ok {
			err = errors.New("invalid layout move")
		}

	case enums.Wildcard:
		var ok bool
		destTile, ok = b.validateDist(from, dest, 4, false)
		if !ok {
			err = errors.New("invalid wildcard move")
		}

	case enums.Teleport:
		destTile, err = b.getTileAt(dest)
		if err != nil || destTile.Color != from.Color {
			err = errors.New("invalid teleport move")
		}

	default:
		err = errors.New("invalid unknown move")
	}

	if destTile != nil {
		fmt.Printf("Move validated: from %s (%s) to %s (%s)\n",
			from.Pos.String(), from.Kind.String(),
			destTile.Pos.String(), destTile.Kind.String())
	}
	return
}

func (from *Tile) applyMove(b *Board, dest *Tile) (land bool) {
	from.Open = false

	player := int(b.Turn) % len(b.Pos)
	b.Pos[player] = dest.Pos

	fmt.Printf("Turn %d: Player moved from %s (%s) to %s (%s)\n",
		b.Turn,
		from.Pos.String(), from.Kind.String(),
		dest.Pos.String(), dest.Kind.String())

	if dest.CanLand() {
		land = true
		println("(and landed)")
	}

	if dest.Kind == enums.Zero {
		n := len(b.Pos)
		for i := player; i != player; i = (i + 1) % n {
			b.Pos[(i+1)%n] = b.Pos[i]
			fmt.Printf("Player %d swapped to position %s\n", i+1, b.Pos[(i+1)%n].String())
		}

		lastPlayer := (player + n - 1) % n
		latestLastPlayerTile, _ := b.getTileAt(b.Pos[lastPlayer])
		newLastPlayerTile := latestLastPlayerTile.Copy()
		newLastPlayerTile.Pos = dest.Pos
		b.Tiles[dest.Pos.X][dest.Pos.Y] = newLastPlayerTile
		b.Pos[lastPlayer] = dest.Pos
		fmt.Printf("Player %d swapped to position %s\n", player, b.Pos[player].String())
	}

	return
}
