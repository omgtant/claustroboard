import * as t from './types';
import * as u from './util';

export enum HighlightFlags {
    NONE = 0,
    SELECTION = 1,
    VALID = 2,
}

export interface RenderInterface {
    registerCallbacks(tryMoveTo: (pos: u.Pos) => void, jumpToHistory: (turnNumber:number) => void): void;
    renderState(state: t.GameState): void;
    movePlayer(turnNumber:number, player: t.Player, to: u.Pos): void;
    suggestMoves(moves: t.ValidMove[], player: t.Player): void;
    /** May keep old highlighted tiles.
     */
    highlightTiles(tiles: u.Pos[], flags: HighlightFlags): void;
    clearHighlights(): void;
    complainInvalidMove(): void;
    complain(message: string): void;
    refreshTile(tile: t.Tile): void;
    renderWin(state: t.GameState, winner: t.Player): void;
    gameStart(state: t.GameState): void;
    highlightPlayer(player: t.Player): void;
}
