package dtos

type Board struct {
	Palette Palette       `json:"palette"`
	Width   uint16        `json:"width"`
	Height  uint16        `json:"height"`
	Tiles   [][]BoardTile `json:"board"`
	Players []Player      `json:"players"`
}
