package models

import "slices"

type BoardSnapshot struct {
	Code     string     `json:"code"`
	Phase    BoardPhase `json:"phase"`
	Width    uint16     `json:"width"`
	Height   uint16     `json:"height"`
	Players  []string   `json:"players"`
	StartPos []uint32   `json:"startPos"`
	Turn     uint16     `json:"turn"`
}

func Snapshot(code GameCode) (*BoardSnapshot, error) {
	b, err := GetBoard(code)
	if err != nil {
		return nil, err
	}
	cpPlayers := slices.Clone(b.Players)
	cpPos := slices.Clone(b.StartPos)
	return &BoardSnapshot{
		Code:     code.Base62(),
		Phase:    b.Phase,
		Width:    b.Width,
		Height:   b.Height,
		Players:  cpPlayers,
		StartPos: cpPos,
		Turn:     b.Turn,
	}, nil
}
