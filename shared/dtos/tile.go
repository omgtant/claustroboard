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
	Color enums.TileColor            `json:"color"`
	Data  map[string]json.RawMessage `json:"data"`
}

func (bt BoardTile) MarshalJSON() ([]byte, error) {
	type Base BoardTile
	aux := struct {
		*Base
		Data  map[string]json.RawMessage `json:"data,omitempty"`
		Color *enums.TileColor           `json:"color,omitempty"`
	}{
		Base: (*Base)(&bt),
		Data: bt.Data,
	}

	if bt.Color != enums.ColorLess {
		aux.Color = &bt.Color
	}

	return json.Marshal(aux)
}
