package models

import (
	"fmt"
	"math/rand"
	"omgtant/claustroboard/shared/enums"
	"time"
)

type Board struct {
	CreatedAt time.Time
	Width     uint16
	Height    uint16
	Tiles     []Tile
	Players   []string
	Turn      uint16
	StartPos  []uint32
}

type GameCode uint64

var gameBoards = make(map[GameCode]*Board)

func NewGameBoard(players []string, palette []enums.TileKind, width uint16, height uint16) (GameCode, error) {
	board := Board{
		CreatedAt: time.Now(),
		Width:     width,
		Height:    height,
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
	gameBoards[id] = &board
	for _, p := range players {
		err := Join(id, p)
		if err != nil {
			return 0, err
		}
	}
	return id, nil
}

func Join(id GameCode, p string) error {
	board, err := GetBoard(id)
	if err != nil {
		return err
	}
	board.Players = append(board.Players, p)

	gameBoards[id] = board
	return err
}

func GetBoard(code GameCode) (*Board, error) {
	if board, exists := gameBoards[code]; exists {
		return board, nil
	}
	fmt.Printf("Available boards: %v\n", gameBoards)
	return nil, fmt.Errorf("board with ID %d not found", code)
}
