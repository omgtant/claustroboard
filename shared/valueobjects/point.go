package valueobjects

import "fmt"

type Point struct {
	X uint16 `json:"x"`
	Y uint16 `json:"y"`
}

func (p Point) String() string {
	return fmt.Sprintf("(%d,%d)", p.X, p.Y)
}
