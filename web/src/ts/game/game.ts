import { getMockInitialState, readInitialStateIntoGameState } from "../helpers/helpers";
import { HighlightFlags } from "../types/renderInterface";
import * as t from "../types/types";
import { Pos } from "../types/util";
import { renderInterface } from "./render";

export let gameState: t.GameState = readInitialStateIntoGameState(getMockInitialState());

function _getCurrentPlayer() {
    return gameState.players[gameState.playerTurnIndex];
}

function _tile(pos: Pos) {
    return gameState.board.tiles[pos.y][pos.x];
}

export function start() {
    renderInterface.registerCallbacks(playMove);
    renderInterface.renderState(gameState);
    suggestMoving();
}

function getAvailableMoves() {
    const currentPlayer = _getCurrentPlayer();
    return _tile(currentPlayer.position).availableMoves(gameState, currentPlayer);
}

function highlight(positions: Pos[]) {
    renderInterface.highlightTiles(positions, HighlightFlags.VALID);
}

function advanceMove() {
    gameState.turnNumber++;
    gameState.playerTurnIndex = (gameState.playerTurnIndex + 1) % gameState.players.length;
}

function suggestMoving() {
    if (gameState.players.length === 0) throw new Error("No players in the game");
    if (_getCurrentPlayer().is_active === false) {
        advanceMove();
        suggestMoving();
        return;
    }
    if (gameState.players.filter(p => p.is_active).length === 1) {
        renderInterface.renderWin(gameState, _getCurrentPlayer());
    }

    const moves = getAvailableMoves();
    if (moves.length === 0) {
        _getCurrentPlayer().is_active = false;
        advanceMove();
        suggestMoving();
    }
    highlight(moves);
}

function playMove(pos: Pos) {
    const currentPlayer = _getCurrentPlayer();
    const oldPos = currentPlayer.position;
    const possibleMoves = _tile(oldPos).availableMoves(gameState, currentPlayer);

    if (!possibleMoves.includes(pos)) {
        renderInterface.complainInvalidMove();
        return;
    }

    currentPlayer.position = pos;
    renderInterface.movePlayer(currentPlayer, pos);
    _tile(pos).onPlayerLanding(gameState, currentPlayer);
    _tile(oldPos).isOpen = false;
    renderInterface.closeTile(oldPos);
    advanceMove();
    suggestMoving();
}