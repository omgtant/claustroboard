package enums

import (
	"encoding/json"
	"maps"
	"math/rand"
	"slices"
	"strconv"
)

type TileColor int

const (
	UnspecifiedColor TileColor = -1
	ColorLess        TileColor = iota
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

func (c TileColor) MarshalJSON() ([]byte, error) {
	if c == UnspecifiedColor {
		return []byte("null"), nil
	}
	return []byte(strconv.FormatInt(int64(c), 10)), nil
}

func (c TileColor) UnmarshalJSON(b []byte) error {
	if string(b) == "null" {
		c = UnspecifiedColor
		return nil
	}
	var n int
	if err := json.Unmarshal(b, &n); err != nil {
		c = UnspecifiedColor
		return nil
	}
	c = TileColor(n)
	return nil
}
