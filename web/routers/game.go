package routers

import (
	"encoding/json"

	"omgtant/claustroboard/shared/config"
	"omgtant/claustroboard/shared/models"
)

var (
	inboundHandlers = map[string]func(*wsClient, json.RawMessage){
		"start":     handleStartGame,
		"broadcast": handleBroadcast,
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
