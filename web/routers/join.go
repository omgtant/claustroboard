package routers

import (
	"context"
	"net/http"
	"omgtant/claustroboard/shared/models"

	"github.com/coder/websocket/wsjson"
)

func StartGameWS(w http.ResponseWriter, r *http.Request) {
	nickname := r.URL.Query().Get("nickname")
	if nickname == "" {
		http.Error(w, "missing nickname", http.StatusBadRequest)
		return
	}

	code, _, err := models.NewDefaultGameBoard(nickname)
	if err != nil {
		http.Error(w, "create failed", http.StatusInternalServerError)
		return
	}

	client, err := upgradeAndRegister(w, r, code, nickname)
	if err != nil {
		http.Error(w, "upgrade failed", http.StatusInternalServerError)
		return
	}

	client.write("created", map[string]string{"code": code.String()})
	broadcastPlayerList(code)
}

func JoinGameWS(w http.ResponseWriter, r *http.Request) {
	nickname := r.URL.Query().Get("nickname")
	if nickname == "" {
		http.Error(w, "missing nickname", http.StatusBadRequest)
		return
	}

	code := models.GameCode(r.PathValue("id"))

	board, err := models.GetBoard(code)
	if err != nil {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}

	already := false
	for _, p := range board.Players {
		if p == nickname {
			already = true
			break
		}
	}
	if already {
		http.Error(w, "a player with the same nickname already joined", http.StatusConflict)
		return
	} else {
		if err := models.Join(code, nickname); err != nil {
			http.Error(w, err.Error(), http.StatusGone)
			return
		}
	}

	client, err := upgradeAndRegister(w, r, code, nickname)
	if err != nil {
		if !already {
			_ = models.Leave(code, nickname)
		}
		http.Error(w, "upgrade failed", http.StatusInternalServerError)
		return
	}

	_ = wsjson.Write(context.Background(), client.conn, event{
		Type: "joined",
		Data: map[string]string{
			"code": code.String(),
			"you":  nickname,
		},
	})

	broadcastPlayerList(code)
}
