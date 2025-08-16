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
	mu      sync.Mutex
	Width   uint16
	Height  uint16
	Tiles   [][]Tile
	Players []string
	Turn    uint32
	Pos     []valueobjects.Point
	Phase   BoardPhase
}

var (
	gameBoardsMu sync.RWMutex
	gameBoards   = make(map[GameCode]*Board)
)

func (b *Board) Lock()   { b.mu.Lock() }
func (b *Board) Unlock() { b.mu.Unlock() }

func NewGameBoard(players []string, palette []enums.TileKind, width uint16, height uint16) (GameCode, error) {
	board := Board{
		Width:  width,
		Height: height,
		Phase:  PhaseLobby,
	}

	board.Tiles = make([][]Tile, height)
	for y := uint16(0); y < height; y++ {
		board.Tiles[y] = make([]Tile, width)
		for x := uint16(0); x < width; x++ {
			board.Tiles[y][x] = *RandomizeTile(x, y)
		}
	}

	id := GameCode(02)
	var attempts int
	for attempts = 0; attempts < 10; attempts++ {
		if _, exists := gameBoards[id]; !exists {
			break
		}
		id = GameCode(02)
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
	dtsTiles := make([][]dtos.BoardTile, b.Height)
	for y := uint16(0); y < b.Height; y++ {
		dtsTiles[y] = make([]dtos.BoardTile, b.Width)
		for x := uint16(0); x < b.Width; x++ {
			tile := b.Tiles[y][x]
			dtsTiles[y][x] = dtos.BoardTile{
				Name:  enums.TileKindName(tile.Kind.String()),
				Color: tile.Color,
				Data:  tile.Data,
			}
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

func (b *Board) getTileAt(p valueobjects.Point) (t *Tile, internalError error) {
	if p.Y >= b.Height || p.X >= b.Width {
		return nil, errors.New("point out of bounds")
	}
	t = &b.Tiles[p.Y][p.X]
	return
}

func (b *Board) GetCurrent() (t *Tile, index int, internalError error) {
	if len(b.Pos) <= 0 {
		return nil, 0, errors.New("game has not started")
	}
	index = int(b.Turn) % len(b.Pos)
	player := b.Pos[index]
	t, internalError = b.getTileAt(player)
	return t, index, internalError
}

func (b *Board) Move(moves []dtos.Move) (*dtos.Delta, error) {
	if b.Phase != PhaseStarted {
		return nil, errors.New("game has not started")
	}
	type MoveData struct {
		from *Tile
		to   *Tile
		move dtos.Move
	}
	moveData := []MoveData{}

	for _, m := range moves {
		t, _, err := b.GetCurrent()
		if t == nil || err != nil {
			continue
		}

		destTile, err := t.validateMove(b, m)
		if err != nil {
			return nil, err
		}

		if destTile != nil {
			moveData = append(moveData, MoveData{to: destTile, from: t, move: m})
		}

		// we don't want to move a different player!
		if destTile.CanLand() {
			break
		}
	}

	delta := dtos.Delta{
		Turn: b.Turn,
	}
	for _, m := range moveData {
		if m.from.applyMove(b, m.to) {
			b.Turn++
		}
		delta.Delta = append(delta.Delta, m.move)
	}
	return &delta, nil
}

func (b *Board) validateDist(src Tile, dest valueobjects.Point, distTarget int, exact bool) (*Tile, bool) {
	println("validate", src.Kind, src.Pos.X, src.Pos.Y, dest.X, dest.Y, distTarget, exact)
	visited := []Tile{src}
	queue := []Tile{src}
	dist := 1

	for dist <= distTarget {
		queueCopy := make([]Tile, len(queue))
		copy(queueCopy, queue)
		queue = []Tile{}

		for _, v := range queueCopy {
			neighborsMatrix := []valueobjects.Point{}
			if v.Pos.X+1 < b.Width {
				neighborsMatrix = append(neighborsMatrix, valueobjects.Point{X: v.Pos.X + 1, Y: v.Pos.Y})
			}
			if v.Pos.X > 0 {
				neighborsMatrix = append(neighborsMatrix, valueobjects.Point{X: v.Pos.X - 1, Y: v.Pos.Y})
			}
			if v.Pos.Y+1 < b.Height {
				neighborsMatrix = append(neighborsMatrix, valueobjects.Point{X: v.Pos.X, Y: v.Pos.Y + 1})
			}
			if v.Pos.Y > 0 {
				neighborsMatrix = append(neighborsMatrix, valueobjects.Point{X: v.Pos.X, Y: v.Pos.Y - 1})
			}

		browse:
			for _, p := range neighborsMatrix {
				println("neigh", p.X, p.Y)
				for _, v := range visited {
					if p == v.Pos {
						continue browse
					}
				}
				candidate, _ := b.getTileAt(p)
				candidateValid := candidate != nil && candidate.Open
				candidateIsTarget := dest == candidate.Pos && (!exact || dist == distTarget)

				println("candidate", candidate.Pos.X, candidate.Pos.Y, candidateValid, candidateIsTarget)
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
