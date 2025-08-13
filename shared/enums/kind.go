package enums

import (
	"maps"
	"math/rand"
	"slices"
)

type TileKind int

const (
	Layout TileKind = iota
	Teleport
	Wall
	Wildcard
	Zero
)

var TileKindNames = map[TileKind]string{
	Layout:   "Layout",
	Teleport: "Teleport",
	Wall:     "Wall",
	Wildcard: "Wildcard",
	Zero:     "Zero",
}

func (ss TileKind) String() string {
	return TileKindNames[ss]
}

func RandomKind() TileKind {
	kinds := slices.Collect(maps.Keys(TileKindNames))
	return kinds[rand.Intn(len(kinds))]
}
