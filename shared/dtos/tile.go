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

func (bt *BoardTile) UnmarshalJSON(data []byte) error {
	aux := &struct {
		*BoardTile
		Color *int `json:"color,omitempty"`
	}{
		BoardTile: (*BoardTile)(bt),
	}

    if err := json.Unmarshal(data, &aux); err != nil {
        return err
    }

    if aux.Color == nil {
        bt.Color = enums.UnspecifiedColor
    } else {
        bt.Color = enums.TileColor(*aux.Color)
    }

    return nil
}