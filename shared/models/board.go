package models

import (
	"errors"
	"fmt"
	"maps"
	"math/rand"
	"omgtant/claustroboard/shared/dtos"
	"omgtant/claustroboard/shared/enums"
	"omgtant/claustroboard/shared/valueobjects"
	"slices"
	"sync"
)

type BoardPhase string

const (
	PhaseLobby   BoardPhase = "lobby"
	PhaseStarted BoardPhase = "started"
)

type Board struct {
	Width   uint16
	Height  uint16
	Tiles   []Tile
	Players []string
	Turn    uint32
	Pos     []valueobjects.Point
	Phase   BoardPhase
}

var (
	gameBoardsMu sync.RWMutex
	gameBoards   = make(map[GameCode]*Board)
)

func NewGameBoard(players []string, palette []enums.TileKind, width uint16, height uint16) (GameCode, error) {
	board := Board{
		Width:  width,
		Height: height,
		Phase:  PhaseLobby,
	}

	for y := uint16(0); y < height; y++ {
		for x := uint16(0); x < width; x++ {
			board.Tiles = append(board.Tiles, *RandomizeTile(x, y))
		}
	}

	id := GameCode(rand.Uint64())
	var attempts int
	for attempts = 0; attempts < 10; attempts++ {
		if _, exists := gameBoards[id]; !exists {
			break
		}
		id = GameCode(rand.Uint64())
	}
	if attempts == 10 {
		return 0, errors.New("failed to generate unique board ID after 10 attempts")
	}

	gameBoardsMu.Lock()
	gameBoards[id] = &board
	gameBoardsMu.Unlock()

	for _, p := range players {
		err := Join(id, p)
		if err != nil {
			return 0, err
		}
	}
	return id, nil
}

func NewDefaultGameBoard(nickname string) (GameCode, *Board, error) {
	code, err := NewGameBoard([]string{nickname}, slices.Collect(maps.Keys(enums.TileKindNames)), 6, 6)
	if err != nil {
		return 0, nil, err
	}
	board, _ := GetBoard(code)
	return code, board, nil
}

func Join(id GameCode, p string) error {
	board, err := GetBoard(id)
	if err != nil {
		return err
	}
	if board.Phase != PhaseLobby {
		return errors.New("cannot join game that has already started")
	}

	board.Players = append(board.Players, p)
	gameBoardsMu.Lock()
	gameBoards[id] = board
	gameBoardsMu.Unlock()
	return nil
}

func Leave(id GameCode, p string) error {
	board, err := GetBoard(id)
	if err != nil {
		return err
	}

	for i, player := range board.Players {
		if player == p {
			board.Players = append(board.Players[:i], board.Players[i+1:]...)
			break
		}
	}

	gameBoardsMu.Lock()
	gameBoards[id] = board
	gameBoardsMu.Unlock()

	return nil
}

func GetBoard(code GameCode) (*Board, error) {
	gameBoardsMu.RLock()
	board, exists := gameBoards[code]
	gameBoardsMu.RUnlock()

	if exists {
		return board, nil
	}

	return nil, fmt.Errorf("board with ID %d not found", code)
}

func StartGame(code GameCode) (*Board, error) {
	board, err := GetBoard(code)
	if err != nil {
		return nil, err
	}
	if board.Phase == PhaseStarted {
		return board, errors.New("already started")
	}
	total := int(board.Width) * int(board.Height)
	if len(board.Players) > total {
		return nil, errors.New("not enough tiles for players")
	}

	used := make(map[valueobjects.Point]struct{}, len(board.Players))
	board.Pos = board.Pos[:0]
	for range board.Players {
		for {
			idx := valueobjects.Point{
				X: uint16(rand.Intn(int(board.Width))),
				Y: uint16(rand.Intn(int(board.Height))),
			}
			if _, ok := used[idx]; ok {
				continue
			}

			tile, err := board.getTileAt(idx)
			if err == nil && tile.CanStart() {
				used[idx] = struct{}{}
				board.Pos = append(board.Pos, idx)
				break
			}
		}
	}
	board.Phase = PhaseStarted
	gameBoardsMu.Lock()
	gameBoards[code] = board
	gameBoardsMu.Unlock()
	return board, nil
}

func Snapshot(code GameCode) (*dtos.Board, error) {
	b, err := GetBoard(code)
	if err != nil {
		return nil, err
	}
	cpPlayers := make([]dtos.Player, len(b.Players))
	for i, playerName := range b.Players {
		cpPlayers[i] = dtos.Player{
			Name: playerName,
			Pos:  b.Pos[i],
		}
	}

	palette := make(dtos.Palette)
	for _, kind := range enums.TileKindNames {
		palette[kind] = dtos.PaletteTile{}
	}
	dtsTiles := make([]dtos.BoardTile, len(b.Tiles))
	for i, tile := range b.Tiles {
		dtsTiles[i] = dtos.BoardTile{
			Name:  enums.TileKindName(tile.Kind.String()),
			Color: tile.Color,
			Data:  tile.Data,
		}
	}

	return &dtos.Board{
		Palette: palette,
		Width:   b.Width,
		Height:  b.Height,
		Players: cpPlayers,
		Tiles:   dtsTiles,
	}, nil
}

func (b Board) getTileIndex(p valueobjects.Point) (i int, err error) {
	i = int(b.Width)*int(p.Y) + int(p.X)
	if len(b.Tiles) < i {
		return -1, errors.New("out of bound")
	}
	return
}

func (b Board) getTileAt(p valueobjects.Point) (t *Tile, internalError error) {
	i, interinternalError := b.getTileIndex(p)
	if interinternalError != nil {
		return
	}
	t = &b.Tiles[i]
	return
}

func (b Board) getCurrent() (t *Tile, index int, internalError error) {
	if len(b.Pos) <= 0 {
		return nil, 0, errors.New("game has not started")
	}
	index = int(b.Turn) % len(b.Pos)
	player := b.Pos[index]
	t, internalError = b.getTileAt(player)
	return t, index, internalError
}

func (b Board) Move(moves []dtos.Move) (*dtos.Delta, error) {
	if b.Phase != PhaseStarted {
		return nil, errors.New("game has not started")
	}
	type MoveData struct {
		t    *Tile
		from *Tile
		move dtos.Move
	}
	destTiles := []MoveData{}

	for _, m := range moves {
		t, _, err := b.getCurrent()
		if t == nil || err != nil {
			continue
		}

		destTile, err := t.validateMove(&b, m)
		if err != nil {
			return nil, err
		}

		if destTile != nil {
			destTiles = append(destTiles, MoveData{t: destTile, from: t, move: m})
		}
	}

	delta := dtos.Delta{
		Turn: b.Turn,
	}
	for _, destTile := range destTiles {
		if destTile.t.applyMove(&b, destTile.from) {
			b.Turn++
		}
		delta.Delta = append(delta.Delta, destTile.move)
	}
	return &delta, nil

}

func (b Board) validateDist(src Tile, dest valueobjects.Point, distTarget int, exact bool) (*Tile, bool) {
	visited := []Tile{src}
	queue := []Tile{src}
	dist := 1

	for dist <= distTarget {
		queueCopy := []Tile{}
		copy(queueCopy, queue)
		queue := []Tile{}

		for _, v := range queueCopy {
			neighborsMatrix := []valueobjects.Point{
				{X: v.Pos.X + 1, Y: v.Pos.Y},
				{X: v.Pos.X - 1, Y: v.Pos.Y},
				{X: v.Pos.X, Y: v.Pos.Y + 1},
				{X: v.Pos.X, Y: v.Pos.Y - 1},
			}

		browse:
			for _, p := range neighborsMatrix {
				for _, v := range visited {
					if p == v.Pos {
						break browse
					}
				}
				candidate, _ := b.getTileAt(p)
				candidateValid := candidate != nil && candidate.Open
				candidateIsTarget := dest == candidate.Pos && (!exact || dist == distTarget)

				if !candidateValid {
					if candidateIsTarget {
						return nil, false
					}
					continue
				}

				if candidateIsTarget {
					return candidate, true
				}

				visited = append(visited, *candidate)
				queue = append(queue, *candidate)
			}
		}
		dist++
	}

	return nil, false
}
