 
### Introduction
 **version:** v1.7
Let's call "actions" websocket payloads sent to the server by a client, and "events" payloads sent by the server to a client. An event sent to all clients at once can be qualified of "broadcast".

## Network
### HTTP
HTTP GET (WS) `/api/v1/start-game?nickname=$NICK&deck=$DECK`
	-> event `created` `{"code": "game code (i.e. ABC123)"}`
	-> broadcast `playerlist-changed`: `["nickname"]`
HTTP GET (WS) `/api/v1/join/<code>?nickname=$NICK`
	| errors: 409 already used nickname, 410 game already started
	-> broadcast `playerlist-changed`: `["nickname1", "nickname2", ...]`
### Actions
Action `start`: stop accepting joins and set up (create the board, the player turn order)
	-> broadcast `started`: `{...}`

Action `my-move` (delta) -> error, yes: the player makes some moves. Note that an error means the whole delta was cancelled, atomically.
	-> broadcast `they-moved` (delta)
Action `come-again` -> \[delta\]

Upon ending the game, the server broadcasts `close`.

If the environment variable `ENVIRONMENT` is set to `"development"`, the following actions and events are also made available:

Action `broadcast` (payload)
	-> broadcast `broadcast`: (payload)


## Type spec
### Config
```json
{
width: int,
height: int,
maxPlayers: int,
deck: [{
	type: string (e.g. "Layout"),
	data: {},
	color?: int ([0;4], null means random),
	count?: int ([1;inf), null means random),
}]
}
```

### State
```json
{
	"palette": {
		"layout": {"script": ""}
	},
	"width": 6,
	"height": 6,
	"board": [
		[{"tile_type": "layout", "color": 0, "data": {"move_count": 2}}, ...],
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

### Delta:
`{turn:1,delta:[(x1, y1), (x2, y2), z3, (x4, y4)]}`