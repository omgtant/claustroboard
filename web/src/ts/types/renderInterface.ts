import * as t from './types';
import * as u from './util';

export enum TileHighlightFlags {
    NONE = 0,
    SELECTION = 1,
    VALID = 2,
}

export enum PlayerHighlightFlags {
    NONE = 0,
    WINNER = 1,
    LOSER = 2,
    ACTIVE = 4,
}

export interface RenderInterface {
    registerCallbacks(tryMoveTo: (pos: u.Pos) => void, jumpToHistory: (turnNumber:number) => void): void;
    renderState(state: t.GameState): void;
    movePlayer(turnNumber:number, player: t.Player, valid_move: t.ValidMove): void;
    suggestMoves(moves: t.ValidMove[], player: t.Player, choiceCallback?: (move: u.Pos) => void): void;
    /** May keep old highlighted tiles.
     */
    highlightTiles(tiles: u.Pos[], flags: TileHighlightFlags): void;
    clearHighlights(): void;
    complainInvalidMove(): void;
    complain(message: string): void;
    refreshTile(tile: t.Tile): void;
    renderWin(state: t.GameState, winner: t.Player): void;
    gameStart(state: t.GameState): void;
    highlightWinner(player: t.Player, flags: PlayerHighlightFlags): void;
    highlightOtherActivePlayer(player: t.Player): void;
    playerLost(player: t.Player): void;
    displayRematchOption(callback: (vote: boolean) => void): void;
    rematchVotesChanged(votedPlayers: string[]): void;
}
