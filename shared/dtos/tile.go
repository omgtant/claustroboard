package dtos

import (
	"encoding/json"
	"omgtant/claustroboard/shared/enums"
)

type PaletteTile struct {
	Script string `json:"script_url"`
}

type Palette map[enums.TileKindName]PaletteTile

type BoardTile struct {
	Name  enums.TileKindName         `json:"tile_type"`
	Color enums.TileColor            `json:"color,omitempty"`
	Data  map[string]json.RawMessage `json:"data,omitempty"`
}
