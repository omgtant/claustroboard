package routers

import (
	"context"
	"net/http"
	"omgtant/claustroboard/shared/models"
	"sync"
	"time"

	"github.com/coder/websocket"
	"github.com/coder/websocket/wsjson"
)

type tableWsClient struct {
	conn *websocket.Conn
}

var (
	matchmakingMu      sync.Mutex
	matchmakingClients = make(map[*tableWsClient]struct{})
)

func RequestRTTWS(w http.ResponseWriter, r *http.Request) {
	_, err := upgradeRTT(w, r)
	if err != nil {
		http.Error(w, "upgrade failed", http.StatusInternalServerError)
		return
	}
}

func upgradeRTT(w http.ResponseWriter, r *http.Request) (*tableWsClient, error) {
	c, err := websocket.Accept(w, r, &websocket.AcceptOptions{
		OriginPatterns: []string{"*"},
	})
	if err != nil {
		return nil, err
	}

	client := &tableWsClient{
		conn: c,
	}

	matchmakingMu.Lock()
	matchmakingClients[client] = struct{}{}
	matchmakingMu.Unlock()

	go client.writeLoop()

	return client, nil
}

func (c *tableWsClient) closeAndCleanup() {
	c.conn.Close(websocket.StatusNormalClosure, "")
	matchmakingMu.Lock()
	delete(matchmakingClients, c)
	matchmakingMu.Unlock()
}

const publicBoardsCount = 10

func (c *tableWsClient) writeLoop() {
	defer c.closeAndCleanup()
	// Every 1 second, call models.GetPublicBoards
	ticker := time.NewTicker(1 * time.Second)
	defer ticker.Stop()
	for range ticker.C {
		boards := models.GetPublicBoards(publicBoardsCount)
		_ = wsjson.Write(context.Background(), c.conn, event{
			Type: "update",
			Data: boards,
		})
	}
}
