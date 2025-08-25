package models

import (
	"encoding/json"
	"fmt"
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
		tile.Color = enums.RandomColor(false)
	case enums.Teleport:
		tile.Color = enums.RandomColor(true)
	case enums.Wall:
		tile.Open = false
	case enums.Zero:
		tile.Color = enums.RandomColor(false)
	}

	return tile
}

func RandomizeTile(x, y uint16) *Tile {
	return RandomizeTileKind(enums.RandomKind(), x, y)
}

func (t1 Tile) CopyFor(p valueobjects.Point) (t2 Tile) {
	t2.Pos = p
	t2.Open = t1.Open
	t2.Color = t1.Color
	t2.Kind = t1.Kind
	t2.Data = map[string]json.RawMessage{}
	for k, v := range t1.Data {
		t2.Data[k] = v
	}

	return
}

func (t Tile) CanLand(b *Board, p int) bool {
	if !t.Open || b.getPlayerAt(t.Pos) != -1 {
		return false
	}
	switch t.Kind {
	case enums.Wildcard, enums.Layout, enums.Zero:
		return true
	case enums.Wall:
		return false
	case enums.Teleport:
		hasDestinations := false
		for _, row := range b.Tiles {
			for _, tile := range row {
				if tile.Kind != enums.Teleport && tile.CanLand(b, p) && (t.Color == enums.ColorLess || tile.Color == t.Color) {
					hasDestinations = true
					break
				}
			}
		}
		playerOnTeleport := false
		tile, err := b.getTileAt(b.Players[p].Pos)
		if err != nil {
			return false
		}
		if tile.Kind == enums.Teleport {
			playerOnTeleport = true
		}

		return hasDestinations && !playerOnTeleport
	default:
		return false
	}
}

func (t Tile) CanStart() bool {
	return t.Kind == enums.Wildcard || t.Kind == enums.Layout
}

func (from Tile) AvailableMoves(b *Board, p int) (result []valueobjects.Point) {
	switch from.Kind {
	case enums.Layout:
		return b.dfs(from, p, int(from.getEnergy()), true, make(map[valueobjects.Point]bool))
	case enums.Wildcard:
		return b.dfs(from, p, 4, false, make(map[valueobjects.Point]bool))
	case enums.Teleport:
		for _, row := range b.Tiles {
			for _, tile := range row {
				if tile.Kind != enums.Teleport && (from.Color == enums.ColorLess || tile.Color == from.Color) &&
					tile.Open && b.getPlayerAt(tile.Pos) == -1 {
					result = append(result, tile.Pos)
				}
			}
		}
	case enums.Wall, enums.Zero:
		// No moves available for walls or zero tiles
		return nil
	default:
		fmt.Printf("Unknown tile kind %s at %s\n", from.Kind.String(), from.Pos.String())
		return nil
	}

	if len(result) == 0 {
		fmt.Printf("No available moves for tile %s (%s)\n", from.Pos.String(), from.Kind.String())
	}
	return result
}

func (from *Tile) applyMove(b *Board, dest *Tile) (land bool) {
	from.Open = false

	player := b.CurPlayer()
	b.Players[player].Pos = dest.Pos

	fmt.Printf("Turn %d: Player moved from %s (%s) to %s (%s)\n",
		b.Turn,
		from.Pos.String(), from.Kind.String(),
		dest.Pos.String(), dest.Kind.String())

	if dest.Kind == enums.Wildcard || dest.Kind == enums.Layout || dest.Kind == enums.Zero {
		land = true
		println("(and landed)")
	}

	if dest.Kind == enums.Zero {
		n := len(b.Players)

		activePlayers := make([]int, 0, n)
		currentActivePlayer := -1
		for i := range b.Players {
			if b.Players[i].IsActive {
				activePlayers = append(activePlayers, i)
				if i == player {
					currentActivePlayer = len(activePlayers) - 1
				}
			}
		}

		m := len(activePlayers)

		nextActivePlayer := (currentActivePlayer + 1) % m
		nextPlayerTile, _ := b.getTileAt(b.Players[activePlayers[nextActivePlayer]].Pos)
		b.Tiles[dest.Pos.Y][dest.Pos.X] = nextPlayerTile.CopyFor(dest.Pos)

		playerPos := b.Players[activePlayers[0]].Pos
		for i, cur := range activePlayers {
			if i == len(activePlayers)-1 {
				continue
			}
			oldPos := b.Players[activePlayers[cur]].Pos
			b.Players[activePlayers[cur]].Pos = b.Players[activePlayers[i+1]].Pos
			fmt.Printf("Player %d swapped from position %s to position %s\n", cur, oldPos, b.Players[activePlayers[i+1]].Pos.String())
		}
		oldPos := b.Players[activePlayers[len(activePlayers)-1]].Pos
		b.Players[activePlayers[len(activePlayers)-1]].Pos = playerPos
		fmt.Printf("Last step: Player %d swapped from position %s to position %s\n", activePlayers[len(activePlayers)-1], oldPos, playerPos.String())
	}

	return
}
