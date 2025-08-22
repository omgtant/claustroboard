[[Terminology]]
## Actions
Action `start`: stop accepting joins and set up (create the board, the player turn order)
	-> broadcast `started`: `{...}`

Action `my-move` (delta) -> error, yes: the player makes some moves. Note that an error means the whole delta was cancelled, atomically.
	-> broadcast `they-moved` (delta)
	
Action `come-again` -> \[delta\]

Action `lobby-publicity` (`"private" | "unlisted" | "public"`) -> broadcast `lobby-publicity-changed`

Upon ending the game, the server broadcasts `close`.

If the environment variable `ENVIRONMENT` is set to `"development"`, the following actions and events are also made available:

Action `broadcast` (payload)
	-> broadcast `broadcast`: (payload)
## Type definitions
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