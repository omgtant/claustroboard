package dtos

import (
	"encoding/json"
	"errors"
	"omgtant/claustroboard/shared/valueobjects"
)

type Delta struct {
	Turn  uint32 	`json:"turn"`
	Move  Move 		`json:"move"`
}

type moveType uint8

const (
	moveTypePoint moveType = iota
	moveTypeInt
)

type Move struct {
	tag   moveType
	point valueobjects.Point
	i     int64
}

func (m Move) MarshalJSON() ([]byte, error) {
	switch m.tag {
	case moveTypePoint:
		return json.Marshal(m.point)
	case moveTypeInt:
		return json.Marshal(m.i)
	}
	return nil, errors.New("union type missing implementation")
}

func (m *Move) UnmarshalJSON(data []byte) error {
	var point valueobjects.Point
	if err := json.Unmarshal(data, &point); err == nil {
		m.tag = moveTypePoint
		m.point = point
		return nil
	}

	var value int64
	if err := json.Unmarshal(data, &value); err == nil {
		m.tag = moveTypeInt
		m.i = value
		return nil
	}

	return errors.New("unable to unmarshal Move: not a Point or int64")
}

func (m *Move) GetPoint() (p valueobjects.Point, err error) {
	if m.tag == moveTypePoint {
		return m.point, nil
	}
	return p, errors.New("not a point")
}
