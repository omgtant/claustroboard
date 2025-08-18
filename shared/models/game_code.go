package models

import (
	"math/rand"
)

type GameCode string

const alphabet = "2356789bcdfghjkmnpqrstwxyz"
const alphLen = uint64(len(alphabet))
const gameCodeLen = 5

func RandomGameCode() GameCode {
	var result string
	for range gameCodeLen {
		result += string(alphabet[rand.Intn(int(alphLen))])
	}
	return GameCode(result)
}

func (code GameCode) String() string {
	return string(code)
}
