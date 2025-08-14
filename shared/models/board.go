package models

import (
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
	Turn    uint16
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

	for x := uint16(0); x < width; x++ {
		for y := uint16(0); y < height; y++ {
			board.Tiles = append(board.Tiles, *RandomizeTile(board, x, y))
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
		return 0, fmt.Errorf("failed to generate unique board ID after 10 attempts")
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
		return fmt.Errorf("cannot join game that has already started")
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
		return board, nil
	}
	total := int(board.Width) * int(board.Height)
	if len(board.Players) > total {
		return nil, fmt.Errorf("not enough tiles for players")
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
			used[idx] = struct{}{}
			board.Pos = append(board.Pos, idx)
			break
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
