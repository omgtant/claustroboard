import { getMockInitialState, readInitialStateIntoGameState } from "../helpers/helpers";
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
}

function playMove(pos: Pos) {
    const currentPlayer = _getCurrentPlayer();
    const playerPos = currentPlayer.position;
    const possibleMoves = _tile(playerPos).availableMoves(gameState, currentPlayer);

    if (!possibleMoves.includes(pos)) {
        throw new Error("Invalid move");
    }
}