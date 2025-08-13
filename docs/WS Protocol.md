 **version:** v1.3
Let's call "actions" websocket payloads sent to the server by a client, and "events" payloads sent by the server to a client. An event sent to all clients at once can be qualified of "broadcast".

HTTP GET (WS) `/new-game?nickname=$NICK`
	-> event `created` `{"code": "game code (i.e. ABC123)"}`
	-> broadcast `playerlist-changed`: `["nickname"]`
HTTP GET (WS) `/join/<code>?nickname=$NICK`
	-> broadcast `playerlist-changed`: `["nickname1", "nickname2", ...]` 

state:
```json
{
	"palette": {
		"layout": {"script": ""}
	},
	"board": [
		[{"tile_type": "layout", "color": 0, "data": {"move_count": 2}}, ..., ...],
		[..., ..., ...],
		...
		[..., ..., ...]
	],
	"players": [
		{"nickname": "name", "position": {"x": 1, "y": 2}},
		...
	]
}
```
delta: `{turn:1,delta:[(x1, y1), (x2, y2), z3, (x4, y4)]}`

Action `start`: stop accepting joins and set up (create the board, the player turn order)
	-> broadcast `started`: `{...}`

s2c `your-turn` : tells the frontend to offer the player to make a move
c2s `my-move` (delta) -> error, yes: the player makes a move
s2c `they-moved` (delta)
c2s `come-again` -> \[delta\]
s2c `close`
