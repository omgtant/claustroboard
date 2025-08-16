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

type TileKindName string

const (
	kindLayout   TileKindName = "Layout"
	kindTeleport              = "Teleport"
	kindWall                  = "Wall"
	kindWildcard              = "Wildcard"
	kindZero                  = "Zero"
)

var TileKindNames = map[TileKind]TileKindName{
	Layout:   kindLayout,
	Teleport: kindTeleport,
	Wall:     kindWall,
	Wildcard: kindWildcard,
	Zero:     kindZero,
}

func (ss TileKind) String() string {
	return string(TileKindNames[ss])
}

func RandomKind() TileKind {
	kinds := slices.Collect(maps.Keys(TileKindNames))
	return kinds[rand.Intn(len(kinds))]
}
