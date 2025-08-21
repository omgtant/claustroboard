
HTTP GET `/api/v1/start-game?nickname=$NICK&deck=$DECK`
	-> [[Game WS]]
	-> event `created` `{"code": "game code (i.e. ABC123)"}`
	-> broadcast `playerlist-changed`: `["nickname"]`
HTTP GET (WS) `/api/v1/join/<code>?nickname=$NICK`
	| errors: 409 already used nickname, 410 game already started, 404 private/nonexistent
	-> [[Game WS]]
	-> broadcast `playerlist-changed`: `["nickname1", "nickname2", ...]`
HTTP GET (WS) `/api/v1/public-games`
	-> [[Realtime Table WS]]
	-> event `update`
HTTP POST `/api/v1/feedback` (contact, feedback) -> [[Feedback]]
