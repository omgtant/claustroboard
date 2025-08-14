package models

import "fmt"

type GameCode uint64

const base62Chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"

func (gc GameCode) Base62() string {
	if gc == 0 {
		return "0"
	}
	num := uint64(gc)
	result := ""
	for num > 0 {
		result = string(base62Chars[num%62]) + result
		num /= 62
	}
	return result
}

// implements fmt.Stringer for GameCode
func (gc GameCode) String() string {
	return gc.Base62()
}

// parses a base62 string into a GameCode.
func ParseGameCode(str string) (GameCode, error) {
	var result uint64
	var base uint64 = 1
	for i := len(str) - 1; i >= 0; i-- {
		ch := str[i]
		var value uint64
		switch {
		case ch >= '0' && ch <= '9':
			value = uint64(ch - '0')
		case ch >= 'A' && ch <= 'Z':
			value = uint64(ch - 'A' + 10)
		case ch >= 'a' && ch <= 'z':
			value = uint64(ch - 'a' + 36)
		default:
			return 0, fmt.Errorf("invalid base62 character: %q", ch)
		}
		result += value * base
		base *= 62
	}
	return GameCode(result), nil
}
