package routers

import (
	"context"
	"encoding/json"
	"net/http"
	"sync"
	"time"

	"omgtant/claustroboard/shared/metrics"
	"omgtant/claustroboard/shared/models"

	"github.com/coder/websocket"
	"github.com/coder/websocket/wsjson"
)

type gameWsClient struct {
	conn     *websocket.Conn
	gameCode models.GameCode
	nickname string
}

var (
	gameClientMu          sync.Mutex
	gameClients = make(map[models.GameCode]map[*gameWsClient]struct{})
)

func upgradeAndRegister(w http.ResponseWriter, r *http.Request, gameCode models.GameCode, nickname string) (*gameWsClient, error) {
	c, err := websocket.Accept(w, r, &websocket.AcceptOptions{
		OriginPatterns: []string{"*"},
	})
	if err != nil {
		return nil, err
	}

	client := &gameWsClient{
		conn:     c,
		gameCode: gameCode,
		nickname: nickname,
	}

	gameClientMu.Lock()
	if gameClients[gameCode] == nil {
		gameClients[gameCode] = make(map[*gameWsClient]struct{})
	}
	gameClients[gameCode][client] = struct{}{}
	gameClientMu.Unlock()

	go client.readLoop()
	go client.writePing()

	return client, nil
}

func (c *gameWsClient) readLoop() {
	defer c.closeAndCleanup()
	for {
		typ, data, err := c.conn.Read(context.Background())
		if err != nil {
			return
		}
		if typ != websocket.MessageText {
			continue
		}
		var ie inboundEvent
		if err := json.Unmarshal(data, &ie); err != nil {
			continue
		}
		metrics.WSActionsTotal.Inc()
		if h, ok := inboundHandlers[ie.Type]; ok {
			h(c, ie.Data)
		}
	}
}

func (c *gameWsClient) write(t string, data any) {
	_ = wsjson.Write(context.Background(), c.conn, event{t, data})
}

func (c *gameWsClient) writeError(err error) {
	_ = wsjson.Write(context.Background(), c.conn, event{
		Type: "error",
		Data: err.Error(),
	})
}

func (c *gameWsClient) writePing() {
	t := time.NewTicker(30 * time.Second)
	defer t.Stop()
	for {
		select {
		case <-t.C:
			ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
			_ = c.conn.Ping(ctx)
			cancel()
		}
	}
}

func (c *gameWsClient) closeAndCleanup() {
	c.conn.Close(websocket.StatusNormalClosure, "")
	gameClientMu.Lock()
	clients := gameClients[c.gameCode]
	if clients != nil {
		if _, ok := clients[c]; ok {
			delete(clients, c)
			_ = models.Leave(c.gameCode, c.nickname)
		}
		if len(clients) == 0 {
			metrics.LobbiesClosed.Inc()
			metrics.LobbiesActive.Dec()
			delete(gameClients, c.gameCode)
		}
	}
	gameClientMu.Unlock()
	broadcastPlayerList(c.gameCode)
}

func broadcastEvent(gameCode models.GameCode, evt event) {
	payload, _ := json.Marshal(evt)

	gameClientMu.Lock()
	defer gameClientMu.Unlock()
	for c := range gameClients[gameCode] {
		go func(cl *gameWsClient, msg []byte) {
			ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
			defer cancel()
			_ = cl.conn.Write(ctx, websocket.MessageText, msg)
		}(c, payload)
	}
}
