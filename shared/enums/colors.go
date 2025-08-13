package enums

import (
	"maps"
	"math/rand"
	"slices"
)

type TileColor int

const (
	ColorLess TileColor = iota
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

func RandomColor() TileColor {
	colors := slices.Collect(maps.Keys(TileColorNames))
	colors = slices.DeleteFunc(colors, func(c TileColor) bool {
		return c == ColorLess
	})
	return colors[rand.Intn(len(colors))]
}
