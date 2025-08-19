package enums

import (
	"maps"
	"math/rand"
	"slices"
)

type TileColor int

const (
	UnspecifiedColor TileColor = -1
	ColorLess        TileColor = iota - 1
	Red
	Yellow
	Green
	Blue
)

var TileColorNames = map[TileColor]string{
	ColorLess: "ColorLess",
	Red:       "Red",
	Yellow:    "Yellow",
	Green:     "Green",
	Blue:      "Blue",
}

func (ss TileColor) String() string {
	return TileColorNames[ss]
}

func RandomColor(withColorless bool) TileColor {
	colors := slices.Collect(maps.Keys(TileColorNames))
	colors = slices.DeleteFunc(colors, func(c TileColor) bool {
		return c == UnspecifiedColor || (!withColorless && c == ColorLess)
	})
	return colors[rand.Intn(len(colors))]
}

func (tc TileColor) IsZero() bool {
	return tc == UnspecifiedColor
}
