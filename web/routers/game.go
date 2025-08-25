package routers

import (
	"encoding/json"
	"errors"

	"omgtant/claustroboard/shared/config"
	"omgtant/claustroboard/shared/dtos"
	"omgtant/claustroboard/shared/enums"
	"omgtant/claustroboard/shared/metrics"
	"omgtant/claustroboard/shared/models"
)

var (
	inboundHandlers = map[string]func(*gameWsClient, json.RawMessage){
		"start":           handleStartGame,
		"broadcast":       handleBroadcast,
		"my-move":         handleMove,
		"come-again":      handleBroadcast,
		"lobby-publicity": handleLobbyPublicity,
		"vote-rematch":    handleRematchVote,
		"kick":            handleKick,
	}
)

func broadcastPlayerList(gameCode models.GameCode) {
	board, err := models.GetBoard(gameCode)
	if err != nil {
		return
	}

	players := []string{}
	for _, p := range board.Players {
		if p.Deleted {
			continue
		}
		players = append(players, p.Nickname)
	}

	broadcastEvent(gameCode, event{
		Type: "playerlist-changed",
		Data: players,
	})
}

func handleStartGame(c *gameWsClient, _ json.RawMessage) {
	b, err := models.GetBoard(c.gameCode)
	if err != nil {
		c.writeError(err)
		return
	}
	if !b.IsHost(c.nickname) {
		c.writeError(errors.New("only hosts can start games"))
		return
	}
	_, err = models.StartGame(c.gameCode)
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

func handleLobbyPublicity(c *gameWsClient, data json.RawMessage) {
	board, err := models.GetBoard(c.gameCode)
	if err != nil {
		c.writeError(err)
		return
	}
	if !board.IsHost(c.nickname) {
		c.writeError(errors.New("only hosts can change lobby publicity"))
		return
	}
	var newPublicity enums.LobbyPublicity
	if err := json.Unmarshal(data, &newPublicity); err != nil {
		c.writeError(err)
		return
	}
	board.Publicity = newPublicity
	broadcastEvent(c.gameCode, event{
		Type: "lobby-publicity-changed",
		Data: newPublicity,
	})
}

func handleRematchVote(c *gameWsClient, data json.RawMessage) {
	var payload bool
	if err := json.Unmarshal(data, &payload); err != nil {
		c.writeError(err)
		return
	}
	allVoted, votedPlayers, err := models.VoteRematch(c.gameCode, c.nickname, payload)
	if err != nil {
		c.writeError(err)
		return
	}
	broadcastEvent(c.gameCode, event{
		Type: "rematch-votes-changed",
		Data: votedPlayers,
	})
	if allVoted {
		metrics.RematchesCount.Inc()
		// Start the game again
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
}

func handleBroadcast(c *gameWsClient, data json.RawMessage) {
	if config.Get().ENVIRONMENT != "development" {
		return
	}
	broadcastEvent(c.gameCode, event{
		Type: "broadcast",
		Data: data,
	})
}

func handleMove(c *gameWsClient, data json.RawMessage) {
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
	if currentPlayer.Nickname != c.nickname {
		c.writeError(errors.New("it is not your turn"))
		return
	}

	println("turn", currentPlayer.Nickname)

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

func handleKick(c *gameWsClient, data json.RawMessage) {
	var nickname string
	if err := json.Unmarshal(data, &nickname); err != nil {
		c.writeError(err)
		return
	}
	board, err := models.GetBoard(c.gameCode)
	if err != nil {
		c.writeError(err)
		return
	}
	if board.Phase != models.PhaseLobby {
		c.writeError(errors.New("can only kick players in lobby phase"))
		return
	}
	if !board.IsHost(c.nickname) {
		c.writeError(errors.New("only hosts can kick players"))
		return
	}
	if err := board.RemovePlayer(nickname); err != nil {
		c.writeError(err)
		return
	}

	broadcastEvent(c.gameCode, event{
		Type: "player-kicked",
		Data: nickname,
	})

	for client := range gameClients[c.gameCode] {
		if client.nickname == nickname {
			client.closeAndCleanup()
		}
	}

	broadcastPlayerList(c.gameCode)
}
