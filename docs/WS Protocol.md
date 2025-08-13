http post `/new-game` -> game code (i.e. `ABC123`), WS
http post `/join/<code>` -> WS

state: `[[{scripts: ["..."], data: {...}, player: uuid}, tile2row1, ...], [tile1row2, ...], ...]`)

delta: `{turn:1,delta:[(x1, y1), (x2, y2), z3, (x4, y4)]}`

ws c2s `start`: stop accepting joins and set up (create the board, the player turn order)
ws s2c `started`
ws s2c `your-turn` : tells the frontend to offer the player to make a move
ws c2s `my-move` (delta) -> error, yes: the player makes a move
ws s2c `they-moved` (delta)
ws c2s `come-again` -> \[delta\]
ws s2c `close`