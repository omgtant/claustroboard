import { getMockInitialState, posEq, readInitialStateIntoGameState, toValidMovesOnly } from "../helpers/helpers";
import { TileHighlightFlags, RenderInterface, PlayerHighlightFlags } from "../types/renderInterface";
import * as t from "../types/types";
import { Pos } from "../types/util";
import { renderInterface } from "../render/render";

export let gameState: t.GameState = readInitialStateIntoGameState(getMockInitialState());

function _getCurrentPlayer(someGameState: t.GameState = gameState): t.Player {
    return someGameState.players[someGameState.playerTurnIndex];
}

function _tile(pos: Pos, someGameState: t.GameState = gameState): t.Tile {
    return someGameState.board.tiles[pos.y][pos.x];
}

export function start(someGameState: t.GameState = gameState, someRenderInterface: RenderInterface | undefined = renderInterface) {
    someRenderInterface?.registerCallbacks(playMove, jumpToHistory);
    someRenderInterface?.renderState(someGameState);
    someRenderInterface?.gameStart(someGameState);
    someGameState.someRenderInterface = someRenderInterface;
    suggestMoving(someGameState, someRenderInterface);
}

function getAvailableMoves(someGameState: t.GameState = gameState): t.ValidMove[] {
    const currentPlayer = _getCurrentPlayer(someGameState);
    const moves = _tile(currentPlayer.position, someGameState).availableMoves(someGameState, currentPlayer);
    return toValidMovesOnly(moves);
}

function advanceMove(someGameState: t.GameState = gameState) {
    someGameState.turnNumber++;
    someGameState.playerTurnIndex = (someGameState.playerTurnIndex + 1) % someGameState.players.length;
}

function suggestMoving(someGameState: t.GameState = gameState, someRenderInterface: RenderInterface | undefined = renderInterface, lastTurnWasSkipped: boolean = false) {
    if (someGameState.players.length === 0) throw new Error("No players in the game");
    if (_getCurrentPlayer(someGameState).is_active === false) {
        advanceMove(someGameState);
        suggestMoving(someGameState, someRenderInterface, true);
        return;
    }
    if (someGameState.players.filter(p => p.is_active).length === 1) {
        someRenderInterface?.renderWin(someGameState, _getCurrentPlayer(someGameState));
        return;
    }

    if (!lastTurnWasSkipped) {
        someGameState.board.tiles.forEach(row => {
            row.forEach(tile => {
                tile.onTurnStart(someGameState);
            });
        });
    }

    const moves = getAvailableMoves(someGameState);
    if (moves.length === 0) {
        _getCurrentPlayer(someGameState).is_active = false;
        someRenderInterface?.playerLost(_getCurrentPlayer(someGameState));
        advanceMove(someGameState);
        suggestMoving(someGameState, someRenderInterface, true);
        return;
    }
    someRenderInterface?.suggestMoves(moves, _getCurrentPlayer(someGameState));
}

function jumpToHistory(turnNumber: number, someGameState: t.GameState = gameState, someRenderInterface: RenderInterface | undefined = renderInterface) {
    if (turnNumber < 0) {
        someRenderInterface.complain("Invalid turn number");
        return;
    }

    gameState = simulateGame(someGameState.initialState, someGameState.history.slice(0, turnNumber + 1));

    console.log(`Jumped to turn ${turnNumber}`);
    suggestMoving(gameState, someRenderInterface);
}

function playMove(pos: Pos, someGameState: t.GameState = gameState, someRenderInterface: RenderInterface | undefined = renderInterface) {
    if (someGameState.players.filter(p => p.is_active).length <= 1) return;
    
    const currentPlayer = _getCurrentPlayer(someGameState);
    const oldPos = currentPlayer.position;
    const possibleMoves = toValidMovesOnly(_tile(oldPos, someGameState).availableMoves(someGameState, currentPlayer));

    const move = possibleMoves.find(p => posEq(p.to, pos));

    if (!move) {
        someRenderInterface?.complainInvalidMove();
        return;
    }
    
    currentPlayer.position = pos;
    someRenderInterface?.clearHighlights();
    someRenderInterface?.movePlayer(someGameState.turnNumber, currentPlayer, move);
    _tile(pos, someGameState).onPlayerLanding(someGameState, currentPlayer);
    _tile(oldPos,someGameState).isOpen = false;
    someRenderInterface?.refreshTile(_tile(oldPos, someGameState));

    someGameState.history.push({...pos});

    advanceMove(someGameState);
    suggestMoving(someGameState, someRenderInterface);
}



function simulateGame(initial_state: t.InitialState, history: Pos[]): t.GameState {
    const newGameState = readInitialStateIntoGameState(initial_state);
    start(newGameState);
    history.forEach((pos, turnNumber) => {
        playMove(pos, newGameState);
    });
    return newGameState;
}