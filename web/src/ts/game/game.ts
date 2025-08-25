import {
	getMockInitialState,
	posEq,
	readInitialStateIntoGameState,
	toValidMovesOnly,
} from "../helpers/helpers";
import {
	TileHighlightFlags,
	RenderInterface,
	PlayerHighlightFlags,
} from "../types/renderInterface";
import * as t from "../types/types";
import { Pos } from "../types/util";
import { renderInterface } from "../render/render";

export let gameState: t.GameState = readInitialStateIntoGameState(
	getMockInitialState()
);

function _getCurrentPlayer(someGameState: t.GameState = gameState): t.Player {
	return someGameState.players[someGameState.playerTurnIndex];
}

function _tile(pos: Pos, someGameState: t.GameState = gameState): t.Tile {
	return someGameState.board.tiles[pos.y][pos.x];
}

export function startSingleplayer(
	someGameState: t.GameState = gameState,
	someRenderInterface: RenderInterface | undefined = renderInterface
) {
	someRenderInterface?.registerCallbacks(
		(pos) => playMove(pos, someGameState, someRenderInterface),
		jumpToHistory
	);
	someRenderInterface?.renderState(someGameState);
	someRenderInterface?.gameStart(someGameState);
	someGameState.someRenderInterface = someRenderInterface;
	suggestMoving(someGameState, someRenderInterface);
}

export function startMultiplayer(
	someGameState: t.GameState = gameState,
	someRenderInterface: RenderInterface | undefined = renderInterface,
	myNickname: string,
	afterMyMove?: (pos: Pos) => Promise<boolean>,
	voteRematch?: (vote: boolean) => void
) {
	someRenderInterface?.registerCallbacks(
		(pos) => playMove(pos, someGameState, someRenderInterface, myNickname),
		() => {}
	);
	someRenderInterface?.renderState(someGameState);
	someRenderInterface?.gameStart(someGameState);
	someGameState.someRenderInterface = someRenderInterface;
	someGameState.voteRematch = voteRematch;
	suggestMoving(
		someGameState,
		someRenderInterface,
		false,
		myNickname,
		afterMyMove
	);
	return {
		otherMove: (pos: Pos) =>
			playMove(
				pos,
				someGameState,
				someRenderInterface,
				myNickname,
				afterMyMove
			),
		playerLeft: (nickname: string) => {
			const playerIndex = someGameState.players.findIndex(
				(p) => p.nickname === nickname
			);
			if (playerIndex !== -1) {
				someGameState.players[playerIndex].is_active = false;
				someRenderInterface?.playerLost(
					someGameState.players[playerIndex]
				);
				if (
					someGameState.players.filter((p) => p.is_active).length <= 1
				) {
					someRenderInterface?.renderWin(
						someGameState,
						_getCurrentPlayer(someGameState)
					);
					if (someGameState.voteRematch) {
						someRenderInterface.displayRematchOption(
							someGameState.voteRematch
						);
					}
				}
			} else {
				someRenderInterface?.complain(`Player ${nickname} not found`);
			}
		},
        rematchVotesChanged: (votedPlayers: string[]) => {
            someRenderInterface.rematchVotesChanged(votedPlayers);
        }
	};
}

function getAvailableMoves(
	someGameState: t.GameState = gameState
): t.ValidMove[] {
	const currentPlayer = _getCurrentPlayer(someGameState);
	const moves = _tile(currentPlayer.position, someGameState).availableMoves(
		someGameState,
		currentPlayer
	);
	return toValidMovesOnly(moves);
}

function advanceMove(someGameState: t.GameState = gameState) {
	someGameState.turnNumber++;
	someGameState.playerTurnIndex =
		(someGameState.playerTurnIndex + 1) % someGameState.players.length;
}

function suggestMoving(
	someGameState: t.GameState = gameState,
	someRenderInterface: RenderInterface | undefined = renderInterface,
	lastTurnWasSkipped: boolean = false,
	myNickname?: string,
	afterMyMove?: (pos: Pos) => Promise<boolean>
) {
	if (someGameState.players.length === 0)
		throw new Error("No players in the game");
	if (_getCurrentPlayer(someGameState).is_active === false) {
		advanceMove(someGameState);
		suggestMoving(
			someGameState,
			someRenderInterface,
			true,
			myNickname,
			afterMyMove
		);
		return;
	}
	if (someGameState.players.filter((p) => p.is_active).length === 1) {
		someRenderInterface?.renderWin(
			someGameState,
			_getCurrentPlayer(someGameState)
		);
        if (someGameState.voteRematch) {
			someRenderInterface.displayRematchOption(someGameState.voteRematch);
		}
		return;
	}

	someGameState.board.tiles.forEach((row) => {
		row.forEach((tile) => {
			tile.onTurnStart(someGameState);
		});
	});

	const moves = getAvailableMoves(someGameState);
	if (moves.length === 0) {
		_getCurrentPlayer(someGameState).is_active = false;
		someRenderInterface?.playerLost(_getCurrentPlayer(someGameState));
		advanceMove(someGameState);
		suggestMoving(
			someGameState,
			someRenderInterface,
			true,
			myNickname,
			afterMyMove
		);
		return;
	}

	if (
		myNickname &&
		myNickname !== _getCurrentPlayer(someGameState).nickname
	) {
		someRenderInterface?.clearHighlights();
		someRenderInterface?.highlightOtherActivePlayer(
			_getCurrentPlayer(someGameState)
		);
		return;
	}

	if (afterMyMove && typeof afterMyMove === "function") {
		someRenderInterface?.suggestMoves(
			moves,
			_getCurrentPlayer(someGameState),
			(pos: Pos) => {
				afterMyMove(pos).then((yes) => {
					if (yes) {
						// playMove(pos, someGameState, someRenderInterface, myNickname);
					} else {
						someRenderInterface?.complainInvalidMove();
					}
				});
			}
		);
		return;
	}

	someRenderInterface?.suggestMoves(moves, _getCurrentPlayer(someGameState));
}

function jumpToHistory(
	turnNumber: number,
	someGameState: t.GameState = gameState,
	someRenderInterface: RenderInterface | undefined = renderInterface
) {
	if (turnNumber < 0) {
		someRenderInterface.complain("Invalid turn number");
		return;
	}

	gameState = simulateGame(
		someGameState.initialState,
		someGameState.history.slice(0, turnNumber + 1)
	);

	suggestMoving(gameState, someRenderInterface);
}

function playMove(
	pos: Pos,
	someGameState: t.GameState = gameState,
	someRenderInterface: RenderInterface | undefined = renderInterface,
	myNickname?: string,
	afterMyMove?: (pos: Pos) => Promise<boolean>
) {
	if (someGameState.players.filter((p) => p.is_active).length <= 1) return;
	if (_getCurrentPlayer(someGameState).is_active === false) {
		advanceMove(someGameState);
		playMove(
			pos,
			someGameState,
			someRenderInterface,
			myNickname,
			afterMyMove
		);
		return;
	}
	const currentPlayer = _getCurrentPlayer(someGameState);
	const oldPos = currentPlayer.position;
	const possibleMoves = toValidMovesOnly(
		_tile(oldPos, someGameState).availableMoves(
			someGameState,
			currentPlayer
		)
	);

	const move = possibleMoves.find((p) => posEq(p.to, pos));

	if (!move) {
		someRenderInterface?.complainInvalidMove();
		return;
	}

	currentPlayer.position = pos;
	someRenderInterface?.clearHighlights();
	someRenderInterface?.movePlayer(
		someGameState.turnNumber,
		currentPlayer,
		move
	);
	_tile(pos, someGameState).onPlayerLanding(someGameState, currentPlayer);
	_tile(oldPos, someGameState).isOpen = false;
	someRenderInterface?.refreshTile(_tile(oldPos, someGameState));

	someGameState.history.push({ ...pos });

	advanceMove(someGameState);
	suggestMoving(
		someGameState,
		someRenderInterface,
		false,
		myNickname,
		afterMyMove
	);
}

function simulateGame(
	initial_state: t.InitialState,
	history: Pos[]
): t.GameState {
	const newGameState = readInitialStateIntoGameState(initial_state);
	startSingleplayer(newGameState);
	history.forEach((pos, turnNumber) => {
		playMove(pos, newGameState);
	});
	return newGameState;
}
