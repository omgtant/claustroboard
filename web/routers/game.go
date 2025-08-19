package routers

import (
	"encoding/json"
	"errors"

	"omgtant/claustroboard/shared/config"
	"omgtant/claustroboard/shared/dtos"
	"omgtant/claustroboard/shared/models"
)

var (
	inboundHandlers = map[string]func(*wsClient, json.RawMessage){
		"start":      handleStartGame,
		"broadcast":  handleBroadcast,
		"my-move":    handleMove,
		"come-again": handleBroadcast,
	}
)

func broadcastPlayerList(gameCode models.GameCode) {
	board, err := models.GetBoard(gameCode)
	if err != nil {
		return
	}

	players := make([]string, len(board.Players))
	copy(players, board.Players)

	broadcastEvent(gameCode, event{
		Type: "playerlist-changed",
		Data: players,
	})
}

func handleStartGame(c *wsClient, _ json.RawMessage) {
	_, err := models.StartGame(c.gameCode)
	if err != nil {
		c.writeError(err)
		return
	}

	snap, _ := models.Snapshot(c.gameCode)
	broadcastEvent(c.gameCode, event{
		Type: "started",
		Data: snap,
	})
}

func handleBroadcast(c *wsClient, data json.RawMessage) {
	if config.Get().ENVIRONMENT != "development" {
		return
	}
	broadcastEvent(c.gameCode, event{
		Type: "broadcast",
		Data: data,
	})
}

func handleMove(c *wsClient, data json.RawMessage) {
	board, err := models.GetBoard(c.gameCode)
	if err != nil {
		c.writeError(err)
		return
	}

	board.Lock()
	defer board.Unlock()

	_, idx, err := board.GetCurrent()
	if err != nil {
		c.writeError(err)
		return
	}

	currentPlayer := board.Players[idx]
	if currentPlayer != c.nickname {
		c.writeError(errors.New("it is not your turn"))
		return
	}

	println("turn", currentPlayer)

	var inputDelta dtos.Delta
	if err := json.Unmarshal(data, &inputDelta); err != nil {
		c.writeError(err)
		return
	}
	delta, err := board.Move(inputDelta.Move)

	if err != nil {
		c.writeError(err)
		return
	}
	broadcastEvent(c.gameCode, event{
		Type: "they-moved",
		Data: delta,
	})
}
