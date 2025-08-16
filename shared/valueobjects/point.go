package valueobjects

import "fmt"

type Point struct {
	X uint16 `json:"x"`
	Y uint16 `json:"y"`
}

func (p Point) String() string {
	return fmt.Sprintf("(%d,%d)", p.X, p.Y)
}

func (p Point) Top(boardWidth int, boardHeight int) *Point {
	if p.Y == 0 {
		return nil
	}
	return &Point{p.X, p.Y - 1}
}

func (p Point) Bottom(boardWidth int, boardHeight int) *Point {
	if p.Y+1 >= uint16(boardHeight) {
		return nil
	}
	return &Point{p.X, p.Y + 1}
}

func (p Point) Left(boardWidth int, boardHeight int) *Point {
	if p.X == 0 {
		return nil
	}
	return &Point{p.X - 1, p.Y}
}

func (p Point) Right(boardWidth int, boardHeight int) *Point {
	if p.X+1 >= uint16(boardWidth) {
		return nil
	}
	return &Point{p.X + 1, p.Y}
}
