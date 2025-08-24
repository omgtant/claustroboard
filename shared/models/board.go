package models

import (
	"errors"
	"fmt"
	"math/rand"
	"omgtant/claustroboard/shared/dtos"
	"omgtant/claustroboard/shared/enums"
	"omgtant/claustroboard/shared/metrics"
	"omgtant/claustroboard/shared/valueobjects"
	"slices"
	"sync"
)

type BoardPhase string

const (
	PhaseLobby       BoardPhase = "lobby"
	PhaseStarted     BoardPhase = "started"
	PhaseRematchVote BoardPhase = "rematch_vote"
)

type Board struct {
	mu         sync.Mutex
	Width      uint16
	Height     uint16
	MaxPlayers uint8
	Tiles      [][]Tile
	Players    []Player
	Turn       uint32
	CheckTurn  uint32 // Used in netcode to ensure clients are in sync
	Phase      BoardPhase
	Publicity  enums.LobbyPublicity
}

var (
	gameBoardsMu sync.RWMutex
	gameBoards   = make(map[GameCode]*Board)
)

func (b *Board) Lock()   { b.mu.Lock() }
func (b *Board) Unlock() { b.mu.Unlock() }

func NewGameBoard(players []string, gameConfig dtos.GameConfig) (GameCode, error) {
	width := uint16(gameConfig.Width)
	height := uint16(gameConfig.Height)

	board := Board{
		Width:      width,
		Height:     height,
		MaxPlayers: uint8(gameConfig.MaxPlayers),
		Phase:      PhaseLobby,
		Publicity:  gameConfig.Publicity,
	}

	board.Tiles = make([][]Tile, height)
	for i := range board.Tiles {
		board.Tiles[i] = make([]Tile, width)
	}

	board.fillUsingDeck(&gameConfig.Deck)

	id := RandomGameCode()
	var attempts int
	for attempts = 0; attempts < 10; attempts++ {
		if _, exists := gameBoards[id]; !exists {
			break
		}
		id = RandomGameCode()
	}
	if attempts == 10 {
		return "", errors.New("failed to generate unique board ID after 10 attempts")
	}

	gameBoardsMu.Lock()
	gameBoards[id] = &board
	gameBoardsMu.Unlock()

	for _, p := range players {
		err := Join(id, p)
		if err != nil {
			return "", err
		}
	}

	metrics.LobbiesCreated.Inc()
	metrics.LobbiesActive.Inc()
	return id, nil
}

func Join(id GameCode, p string) error {
	board, err := GetBoard(id)
	if err != nil {
		return err
	}
	if board.Publicity == enums.LobbyPublicityPrivate {
		return errors.New("cannot join private game")
	}
	if board.Phase != PhaseLobby {
		return errors.New("cannot join game that has already started")
	}
	if board.MaxPlayers > 0 && len(board.Players) >= int(board.MaxPlayers) {
		return errors.New("game is full") // TODO specific error types so that backend knows what http code to return
	}

	board.Players = append(board.Players, Player{
		Nickname: p,
		IsActive: true,
		Deleted:  false,
		Pos:      valueobjects.Point{},
	})
	gameBoardsMu.Lock()
	gameBoards[id] = board
	gameBoardsMu.Unlock()
	metrics.PlayersLobbyJoined.Inc()
	return nil
}

func Leave(id GameCode, p string) error {
	board, err := GetBoard(id)
	if err != nil {
		return err
	}

	switch board.Phase {
		case PhaseLobby, PhaseRematchVote:
			board.RemovePlayer(p)
		case PhaseStarted:
			player, err := board.GetPlayerByNickname(p)
			if err != nil {
				return err
			}
			player.Deleted = true
			player.IsActive = false
			if board.Players[board.CurPlayer()].Nickname == p {
				board.advanceTurn()
			} 
	}

	gameBoardsMu.Lock()
	gameBoards[id] = board
	gameBoardsMu.Unlock()

	return nil
}

func (b *Board) RemovePlayer(p string) error {
	for i, player := range b.Players {
		if player.Nickname == p {
			b.Players = append(b.Players[:i], b.Players[i+1:]...)
			break
		}
	}
	return nil
}

func (b *Board) GetPlayerByNickname(p string) (*Player, error) {
	for i, player := range b.Players {
		if player.Nickname == p {
			return &b.Players[i], nil
		}
	}
	return nil, fmt.Errorf("player %s not found", p)
}

func GetBoard(code GameCode) (*Board, error) {
	gameBoardsMu.RLock()
	board, exists := gameBoards[code]
	gameBoardsMu.RUnlock()

	if exists {
		return board, nil
	}

	return nil, fmt.Errorf("board with ID %s not found", code)
}

func StartGame(code GameCode) (*Board, error) {
	board, err := GetBoard(code)
	if err != nil {
		return nil, err
	}
	if board.Phase == PhaseStarted {
		return board, errors.New("already started")
	}
	total := int(board.Width) * int(board.Height)
	if len(board.Players) > total {
		return nil, errors.New("not enough tiles for players")
	}

	// Find valid starting positions
	validPositions := []valueobjects.Point{}
	for y := uint16(0); y < board.Height; y++ {
		for x := uint16(0); x < board.Width; x++ {
			pos := valueobjects.Point{X: x, Y: y}
			if tile, err := board.getTileAt(pos); err == nil && tile.CanStart() {
				validPositions = append(validPositions, pos)
			}
		}
	}

	if len(validPositions) < len(board.Players) {
		return nil, errors.New("not enough valid starting positions")
	}

	// Randomly assign positions to players
	for i := range board.Players {
		idx := rand.Intn(len(validPositions))
		board.Players[i].Pos = validPositions[idx]
		validPositions = append(validPositions[:idx], validPositions[idx+1:]...)
	}

	// Mark all players as active
	for i := range board.Players {
		board.Players[i].IsActive = true
	}

	board.Phase = PhaseStarted
	gameBoardsMu.Lock()
	gameBoards[code] = board
	gameBoardsMu.Unlock()

	metrics.GamesStarted.Inc()
	return board, nil
}

func Snapshot(code GameCode) (*dtos.Board, error) {
	b, err := GetBoard(code)
	if err != nil {
		return nil, err
	}
	cpPlayers := make([]dtos.Player, len(b.Players))
	for i, player := range b.Players {
		cpPlayers[i] = dtos.Player{
			Name: player.Nickname,
			Pos:  player.Pos,
		}
	}

	palette := make(dtos.Palette)
	for _, kind := range enums.TileKindNames {
		palette[kind] = dtos.PaletteTile{}
	}
	dtsTiles := make([][]dtos.BoardTile, b.Height)
	for y := uint16(0); y < b.Height; y++ {
		dtsTiles[y] = make([]dtos.BoardTile, b.Width)
		for x := uint16(0); x < b.Width; x++ {
			tile := b.Tiles[y][x]
			dtsTiles[y][x] = dtos.BoardTile{
				Name:  enums.TileKindName(tile.Kind.String()),
				Color: tile.Color,
				Data:  tile.Data,
			}
		}
	}

	return &dtos.Board{
		Palette: palette,
		Width:   b.Width,
		Height:  b.Height,
		Players: cpPlayers,
		Tiles:   dtsTiles,
	}, nil
}

func (b *Board) getTileAt(p valueobjects.Point) (t *Tile, internalError error) {
	if p.Y >= b.Height || p.X >= b.Width {
		return nil, errors.New("point out of bounds")
	}
	t = &b.Tiles[p.Y][p.X]
	return
}

func (b *Board) GetCurrent() (t *Tile, index int, internalError error) {
	if len(b.Players) <= 0 {
		return nil, 0, errors.New("game has not started")
	}
	index = int(b.Turn) % len(b.Players)
	player := b.Players[index]
	t, internalError = b.getTileAt(player.Pos)
	return t, index, internalError
}

func (b *Board) CurPlayer() int {
	return int(b.Turn) % len(b.Players)
}

func (b *Board) Move(move dtos.Move) (*dtos.Delta, error) {
	if b.Phase != PhaseStarted {
		return nil, errors.New("game has not started")
	}

	from, _, err := b.GetCurrent()
	if err != nil {
		return nil, err
	}

	to, err := move.GetPoint()
	if err != nil {
		return nil, err
	}

	toTile, err := b.getTileAt(to)
	if err != nil {
		return nil, err
	}

	if err := b.checkMoveValidity(from, toTile); err != nil {
		return nil, err
	}

	b.CheckTurn++
	if from.applyMove(b, toTile) {
		b.advanceTurn()
		// Kill the next player now if they can't move
		var dead bool
		var err error
		for dead, err = checkCurrentForDeadness(b); dead && err == nil; {
			b.advanceTurn()
			dead, err = checkCurrentForDeadness(b)
		}
		fmt.Printf("Turn of Player %d\n", b.CurPlayer())
	}
	return &dtos.Delta{Turn: b.CheckTurn, Move: move}, nil
}

func (b *Board) checkMoveValidity(from *Tile, to *Tile) error {
	validMoves := from.AvailableMoves(b, b.CurPlayer())
	destPoint := to.Pos
	destTile, err := b.getTileAt(destPoint)
	if !slices.Contains(validMoves, destPoint) || err != nil || destTile == nil {
		return fmt.Errorf("invalid move from %v to %v: %v", from.Pos, destPoint, err)
	}

	return nil
}

func (b *Board) getPlayerAt(p valueobjects.Point) int {
	for i, player := range b.Players {
		if player.Pos == p {
			return i
		}
	}
	return -1
}

func (b *Board) startRematchVote() {
	b.Phase = PhaseRematchVote
}

func checkCurrentForDeadness(b *Board) (bool, error) {
	nextPlayerPos := b.Players[b.CurPlayer()].Pos
	nextPlayerTile, err := b.getTileAt(nextPlayerPos)
	if err != nil {
		return false, err
	}
	moves := nextPlayerTile.AvailableMoves(b, b.CurPlayer())
	length := len(moves)
	if length == 0 {
		b.Players[b.CurPlayer()].IsActive = false
		fmt.Printf("Player %d is out of the game\n", b.CurPlayer())
		activeCount := 0
		for _, player := range b.Players {
			if player.IsActive {
				activeCount++
			}
		}
		if activeCount <= 1 {
			metrics.StartTurnWins.WithLabelValues(fmt.Sprintf("%d", b.CurPlayer())).Inc()
			metrics.GameDurationsTurns.WithLabelValues(fmt.Sprintf("%d", b.Turn)).Inc()
			b.startRematchVote()
			fmt.Println("Game over, returning to lobby")
			return false, nil
		}
	}
	return length == 0, nil
}

func (b *Board) dfs(me Tile, player int, energy int, exact bool, visited map[valueobjects.Point]bool) (result []valueobjects.Point) {
	if energy == 0 {
		return []valueobjects.Point{me.Pos}
	}

	visited[me.Pos] = true

	result = []valueobjects.Point{}

	for _, him := range []*valueobjects.Point{
		me.Pos.Top(int(b.Width), int(b.Height)),
		me.Pos.Bottom(int(b.Width), int(b.Height)),
		me.Pos.Left(int(b.Width), int(b.Height)),
		me.Pos.Right(int(b.Width), int(b.Height)),
	} {
		if him == nil || visited[*him] {
			continue
		}

		tile, err := b.getTileAt(*him)
		if err != nil || !tile.CanLand(b, player) {
			continue
		}

		for _, p := range b.dfs(*tile, player, energy-1, exact, visited) {
			if !slices.Contains(result, p) {
				result = append(result, p)
			}
		}
	}

	visited[me.Pos] = false

	if exact {
		return result
	}

	if true {
		if !slices.Contains(result, me.Pos) {
			result = append(result, me.Pos)
		}
	}

	return result
}

func (b *Board) fillUsingDeck(deck *[]dtos.TileConfig) error {
	if deck == nil {
		return fmt.Errorf("deck is nil")
	}

	boardSize := int(b.Width) * int(b.Height)

	// 1) Gather guaranteed tiles (with defined count), repeat as needed.
	guaranteed := make([]dtos.TileConfig, 0, boardSize)
	for _, d := range *deck {
		if d.Count <= 0 {
			continue
		}
		for i := 0; i < int(d.Count); i++ {
			guaranteed = append(guaranteed, d)
		}
	}

	// 2) If not enough guaranteed, fill remaining with random tiles chosen from "choice" tiles (count == nil).
	if len(guaranteed) < boardSize {
		choices := make([]dtos.TileConfig, 0)
		for _, d := range *deck {
			if d.Count < 0 {
				choices = append(choices, d)
			}
		}
		if len(choices) == 0 {
			return fmt.Errorf("deck underfills the board (%d guaranteed < %d total) and has no random-choice tiles", len(guaranteed), boardSize)
		}

		missing := boardSize - len(guaranteed)
		for i := 0; i < missing; i++ {
			pick := choices[rand.Intn(len(choices))]
			guaranteed = append(guaranteed, pick)
		}
	}

	// 3) If guaranteed exceeds board size, remove random extras.
	if len(guaranteed) > boardSize {
		rand.Shuffle(len(guaranteed), func(i, j int) { guaranteed[i], guaranteed[j] = guaranteed[j], guaranteed[i] })
		guaranteed = guaranteed[:boardSize]
		*deck = guaranteed
	}

	// Step 4: Shuffle final deck for unbiased placement later.
	rand.Shuffle(len(guaranteed), func(i, j int) { guaranteed[i], guaranteed[j] = guaranteed[j], guaranteed[i] })

	*deck = guaranteed

	// Assign the board tiles to this
	for i := 0; i < int(b.Width); i++ {
		for j := 0; j < int(b.Height); j++ {
			kind, success := enums.TileKindFromString(string(guaranteed[i*int(b.Height)+j].Tile.Name))
			if !success {
				return fmt.Errorf("invalid tile kind %s in deck", guaranteed[i*int(b.Height)+j].Tile.Name)
			}

			color := enums.TileColor(guaranteed[i*int(b.Height)+j].Tile.Color)
			if color == enums.UnspecifiedColor {
				color = enums.RandomColor(true)
			}

			tile := &Tile{
				Pos:   valueobjects.Point{X: uint16(i), Y: uint16(j)},
				Color: color,
				Open:  true,
				Kind:  kind,
				Data:  guaranteed[i*int(b.Height)+j].Tile.Data,
			}
			b.Tiles[j][i] = *tile
		}
	}
	return nil
}

func (b *Board) advanceTurn() {
	b.Turn++
	// Skip dead players' moves
	for !b.Players[(b.Turn)%uint32(len(b.Players))].IsActive {
		b.Turn++
	}
}
