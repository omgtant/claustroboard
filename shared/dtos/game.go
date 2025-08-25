package dtos

type Game struct {
	Code         string     `json:"code"`
	Players      int        `json:"players"`
	Config       GameConfig `json:"config"`
	HostNickname string     `json:"host"`
}
