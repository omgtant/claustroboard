package metrics

import (
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
)

var (
	// Lobby
	LobbiesCreated = promauto.NewCounter(prometheus.CounterOpts{
		Name: "lobbies_created_total",
		Help: "Total number of lobbies created",
	})
	GamesStarted = promauto.NewCounter(prometheus.CounterOpts{
		Name: "games_started_total",
		Help: "Total number of games started",
	})
	LobbiesClosed = promauto.NewCounter(prometheus.CounterOpts{
		Name: "lobbies_closed_total",
		Help: "Total number of lobbies that were closed",
	})
	LobbiesActive = promauto.NewGauge(prometheus.GaugeOpts{
		Name: "lobbies_active_total",
		Help: "Total number of active lobbies",
	})
	PlayersLobbyJoined = promauto.NewCounter(prometheus.CounterOpts{
		Name: "players_lobby_joined_total",
		Help: "Total number of players that joined a lobby",
	})

	// Game
	RematchesCount = promauto.NewCounter(prometheus.CounterOpts{
		Name: "rematches_total",
		Help: "Total number of rematches played",
	})
	StartTurnWins = promauto.NewCounterVec(prometheus.CounterOpts{
		Name: "start_turn_wins_total",
		Help: "Total number of wins for players that moved first, second, etc.",
	}, []string{"start_turn"})
	GameDurationsTurns = promauto.NewCounterVec(prometheus.CounterOpts{
		Name: "game_durations_turns",
		Help: "Game durations in turns (for X players, 1 full circle is X turns)",
	}, []string{"game_id"})

	// Network
	PageLoads = promauto.NewCounter(prometheus.CounterOpts{
		Name: "page_loads_total",
		Help: "Total number of successful requests for templates",
	})
	RequestsTotal = promauto.NewCounter(prometheus.CounterOpts{
		Name: "requests_total",
		Help: "Total number of requests received",
	})
)
