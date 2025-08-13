http post `/new-game` (my nickname) -> game code (i.e. `ABC123`), WS
http post `/join/<code>` (my nickname) -> player list, WS

state: ```
```json
{
	palette: {
		'layout': {script: ""}
	},
	board: [
		[{tile_type: 'layout', color: number, data: {move_count: 2}}, ..., ...],
		[..., ..., ...],
		...
		[..., ..., ...]
	],
	players: [
		{nickname: 'name', position: {x: 1, y: 2}},
		...
	]
}
```
delta: `{turn:1,delta:[(x1, y1), (x2, y2), z3, (x4, y4)]}`

ws s2c `playerlist-changed` (player list)
ws c2s `start`: stop accepting joins and set up (create the board, the player turn order)
ws s2c `started`
ws s2c `your-turn` : tells the frontend to offer the player to make a move
ws c2s `my-move` (delta) -> error, yes: the player makes a move
ws s2c `they-moved` (delta)
ws c2s `come-again` -> \[delta\]
ws s2c `close`