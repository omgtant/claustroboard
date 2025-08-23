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

type wsClient struct {
	conn     *websocket.Conn
	gameCode models.GameCode
	nickname string
}

type event struct {
	Type string `json:"type"`
	Data any    `json:"data,omitempty"`
}

type inboundEvent struct {
	Type string          `json:"type"`
	Data json.RawMessage `json:"data,omitempty"`
}

var (
	mu          sync.Mutex
	gameClients = make(map[models.GameCode]map[*wsClient]struct{})
)

func upgradeAndRegister(w http.ResponseWriter, r *http.Request, gameCode models.GameCode, nickname string) (*wsClient, error) {
	c, err := websocket.Accept(w, r, &websocket.AcceptOptions{
		OriginPatterns: []string{"*"},
	})
	if err != nil {
		return nil, err
	}

	client := &wsClient{
		conn:     c,
		gameCode: gameCode,
		nickname: nickname,
	}

	mu.Lock()
	if gameClients[gameCode] == nil {
		gameClients[gameCode] = make(map[*wsClient]struct{})
	}
	gameClients[gameCode][client] = struct{}{}
	mu.Unlock()

	go client.readLoop()
	go client.writePing()

	return client, nil
}

func (c *wsClient) readLoop() {
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
		if h, ok := inboundHandlers[ie.Type]; ok {
			h(c, ie.Data)
		}
	}
}

func (c *wsClient) write(t string, data any) {
	_ = wsjson.Write(context.Background(), c.conn, event{t, data})
}

func (c *wsClient) writeError(err error) {
	_ = wsjson.Write(context.Background(), c.conn, event{
		Type: "error",
		Data: err.Error(),
	})
}

func (c *wsClient) writePing() {
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

func (c *wsClient) closeAndCleanup() {
	c.conn.Close(websocket.StatusNormalClosure, "")
	mu.Lock()
	clients := gameClients[c.gameCode]
	if clients != nil {
		if _, ok := clients[c]; ok {
			delete(clients, c)
			_ = models.Leave(c.gameCode, c.nickname)
		}
		if len(clients) == 0 {
			metrics.GamesFinished.Inc()
			delete(gameClients, c.gameCode)
		}
	}
	mu.Unlock()
	broadcastPlayerList(c.gameCode)
}

func broadcastEvent(gameCode models.GameCode, evt event) {
	payload, _ := json.Marshal(evt)

	mu.Lock()
	defer mu.Unlock()
	for c := range gameClients[gameCode] {
		go func(cl *wsClient, msg []byte) {
			ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
			defer cancel()
			_ = cl.conn.Write(ctx, websocket.MessageText, msg)
		}(c, payload)
	}
}
