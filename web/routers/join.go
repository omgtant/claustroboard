package routers

import (
	"encoding/json"
	"io"
	"maps"
	"net/http"
	"omgtant/claustroboard/shared/enums"
	"omgtant/claustroboard/shared/models"
	"slices"
	"strconv"
)

const base62Chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"

func encodeBase62(num uint64) string {
	if num == 0 {
		return "0"
	}

	result := ""
	for num > 0 {
		result = string(base62Chars[num%62]) + result
		num /= 62
	}
	return result
}

func decodeBase62(str string) (uint64, error) {
	result := uint64(0)
	base := uint64(1)

	for i := len(str) - 1; i >= 0; i-- {
		char := str[i]
		var value uint64

		if char >= '0' && char <= '9' {
			value = uint64(char - '0')
		} else if char >= 'A' && char <= 'Z' {
			value = uint64(char - 'A' + 10)
		} else if char >= 'a' && char <= 'z' {
			value = uint64(char - 'a' + 36)
		} else {
			return 0, strconv.ErrSyntax
		}

		result += value * base
		base *= 62
	}
	return result, nil
}

func StartGame(w http.ResponseWriter, r *http.Request) {
	nickname, err := io.ReadAll(r.Body)
	if err != nil {
		http.Error(w, "Failed to read request body", http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	safeNickname := string(nickname)
	if len(safeNickname) >= 45 {
		http.Error(w, "Nickname too long", http.StatusBadRequest)
		return
	}

	board, err := models.NewGameBoard(
		[]string{safeNickname},
		slices.Collect(maps.Keys(enums.TileKindNames)),
		1,
		1,
	)

	if err != nil {
		http.Error(w, "Failed to create game board", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "text/plain")
	gameCode := encodeBase62(uint64(board))
	w.Write([]byte(gameCode))
}

func JoinGame(w http.ResponseWriter, r *http.Request) {
	body, err := io.ReadAll(r.Body)
	if err != nil {
		http.Error(w, "Failed to read request body", http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	nickname := string(body)
	if len(nickname) >= 45 {
		http.Error(w, "Nickname too long", http.StatusBadRequest)
		return
	}

	intGameCode, err := decodeBase62(r.PathValue("id"))
	if err != nil {
		http.Error(w, "Invalid game code", http.StatusBadRequest)
		return
	}
	gameCode := models.GameCode(intGameCode)

	board, err := models.GetBoard(gameCode)
	if err != nil {
		http.Error(w, "Game not found", http.StatusNotFound)
		return
	}

	err = models.Join(gameCode, nickname)
	if err != nil {
		http.Error(w, "Failed to join game", http.StatusBadRequest)
		return
	}

	playerList := make([]string, len(board.Players))
	for i, p := range board.Players {
		playerList[i] = p
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(playerList)
}
