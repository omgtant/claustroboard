package dtos

import (
	"encoding/json"
	"omgtant/claustroboard/shared/enums"
)

type Board struct {
    Palette Palette       `json:"palette"`
    Width   uint16        `json:"width"`
    Height  uint16        `json:"height"`
    Tiles   [][]BoardTile `json:"board"`
    Players []Player      `json:"players"`
}

type GameConfig struct {
    Version    int          `json:"version"`
    Publicity  enums.LobbyPublicity `json:"publicity"`
    Width      int          `json:"width"`
    Height     int          `json:"height"`
    MaxPlayers int          `json:"maxPlayers"`
    Deck       []TileConfig `json:"deck"`
}

type Count int
const UnspecifiedCount Count = -1

// makes encoding/json treat -1 as "empty" for `omitempty`.
func (c Count) IsZero() bool { return c == UnspecifiedCount }

type TileConfig struct {
    Tile  BoardTile `json:"tile"`
    Count Count     `json:"count,omitempty"`
}

// set tc.Count = UnspecifiedCount if "null"
func (tc *TileConfig) UnmarshalJSON(b []byte) error {
    type wire struct {
        Tile  BoardTile `json:"tile"`
        Count *int      `json:"count"`
    }
    var w wire
    if err := json.Unmarshal(b, &w); err != nil {
        return err
    }
    tc.Tile = w.Tile
    if w.Count == nil {
        tc.Count = UnspecifiedCount
    } else {
        tc.Count = Count(*w.Count)
    }
    return nil
}