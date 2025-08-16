package dtos

import (
	"encoding/json"
	"errors"
	"omgtant/claustroboard/shared/valueobjects"
	"unsafe"
)

type Delta struct {
	Turn  uint32 `json:"turn"`
	Delta []Move `json:"delta"`
}

type moveType uint8

const (
	moveTypePoint moveType = iota
	moveTypeInt
)

type Move struct {
	tag  moveType
	data []byte
}

func (m Move) MarshalJSON() ([]byte, error) {
	switch m.tag {
	case moveTypePoint:
		if len(m.data) < 4 {
			return nil, errors.New("invalid point")
		}

		point := *(*valueobjects.Point)(unsafe.Pointer(&m.data[0]))
		return json.Marshal(point)
	case moveTypeInt:
		if len(m.data) < 8 {
			return nil, errors.New("invalid int64")
		}

		value := *(*int64)(unsafe.Pointer(&m.data[0]))

		return json.Marshal(value)
	}
	return nil, errors.New("union type missing implementation")
}

func (m *Move) UnmarshalJSON(data []byte) error {
	var point valueobjects.Point
	if err := json.Unmarshal(data, &point); err == nil {
		m.tag = moveTypePoint
		m.data = (*[4]byte)(unsafe.Pointer(&point))[:]
		return nil
	}

	var value int64
	if err := json.Unmarshal(data, &value); err == nil {
		m.tag = moveTypeInt
		m.data = (*[8]byte)(unsafe.Pointer(&value))[:]
		return nil
	}

	return errors.New("unable to unmarshal Move: not a Point or int64")
}

func (m *Move) GetPoint() (p valueobjects.Point, err error) {
	if m.tag == moveTypePoint {
		if len(m.data) == 4 {
			return *(*valueobjects.Point)(unsafe.Pointer(&m.data[0])), nil
		}
		err = errors.New("invalid point")
	} else {
		err = errors.New("not a point")
	}
	return
}
