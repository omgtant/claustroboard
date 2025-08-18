package valueobjects

import "encoding/json"

type DeckElement struct {
	TileType string
	Color    *int // was: int; now pointer to distinguish null vs number
	Data     any
}

type GameConfig struct {
	Width     	int
	Height     	int
	MaxPlayers  int
	Deck       	[]DeckElement
}

// Internal TS-shape helpers
type tsTileSetup struct {
	TileType string `json:"tile_type"`
	Color    *int   `json:"color"` // removed omitempty so nil => "color": null is emitted
	Data     any    `json:"data,omitempty"`
}

type tsDeckElement struct {
	Tile  tsTileSetup `json:"tile"`
	Count *int        `json:"count,omitempty"`
}

type tsGameConfig struct {
	Version     int             `json:"version"`
	UserDefined bool            `json:"userDefined"`
	Width       int             `json:"width"`
	Height      int             `json:"height"`
	MaxPlayers  int             `json:"maxPlayers"`
	Deck        []tsDeckElement `json:"deck"`
}

// MarshalJSON emits JSON compatible with web/src/ts/types/types.ts: Config
func (gc GameConfig) MarshalJSON() ([]byte, error) {
	out := tsGameConfig{
		Version:     1,
		UserDefined: false,
		Width:       gc.Width,
		Height:      gc.Height,
		MaxPlayers:  gc.MaxPlayers,
		Deck:        make([]tsDeckElement, 0, len(gc.Deck)),
	}
	for _, d := range gc.Deck {
		out.Deck = append(out.Deck, tsDeckElement{
			Tile: tsTileSetup{
				TileType: d.TileType,
				Color:    d.Color, // pass pointer through; nil => null, non-nil => number
				Data:     d.Data,
			},
			// Count intentionally omitted (not represented in Go struct)
		})
	}
	return json.Marshal(out)
}

// UnmarshalJSON reads JSON compatible with web/src/ts/types/types.ts: Config
func (gc *GameConfig) UnmarshalJSON(b []byte) error {
	var in tsGameConfig
	if err := json.Unmarshal(b, &in); err != nil {
		return err
	}

	gc.Width = in.Width
	gc.Height = in.Height
	gc.MaxPlayers = in.MaxPlayers

	gc.Deck = make([]DeckElement, 0, len(in.Deck))
	for _, de := range in.Deck {
		var colorPtr *int
		if de.Tile.Color != nil {
			v := *de.Tile.Color
			colorPtr = &v // allocate new int to avoid pointing into transient unmarshaled struct memory
		}
		gc.Deck = append(gc.Deck, DeckElement{
			TileType: de.Tile.TileType,
			Color:    colorPtr, // nil => JSON null (and distinct from integer)
			Data:     de.Tile.Data,
		})
	}
	return nil
}
