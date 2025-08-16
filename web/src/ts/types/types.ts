import { WebSocketManager } from "../netcode/lib";
import { RenderInterface } from "./renderInterface";
import { Pos, TileColor } from "./util";

export type InitialState = {
    palette: Record<string, {script: string}>[];
    board: TileSetup[][];
    players: InitialPlayer[];
}

export type TileSetup = {tile_type: string, color:number, data?: any}

export type GameState = {
    board: Board;
    turnNumber: number;
    playerTurnIndex: number;
    players: Player[];
    history: Pos[];
    initialState: InitialState;
    someRenderInterface?: RenderInterface;
}

export type InitialPlayer = {
    nickname: string;
    position: Pos;
}

export type Player = InitialPlayer & {
    is_active: boolean;
}

export class Tile {
    // Properties
    position: Pos;
    isOpen: boolean;
    color: TileColor;

    // Hooks
    onTurnStart(state: GameState): void {throw new Error("Method not implemented.");};
    availableMoves(state: GameState, player: Player): Pos[] | ValidMove[] {throw new Error("Method not implemented.");};
    onPlayerLanding(state: GameState, player: Player): void {throw new Error("Method not implemented.");};

    canLandOnMe(state: GameState, player: Player): boolean {throw new Error("Method not implemented.");};
    canStartOnMe(board: Tile[][]): boolean {throw new Error("Method not implemented.");};
}

export type Board = {
    tiles: Tile[][];
}

/**
 * Wrapper for a move position with path data for enhanced visuals
 */
export type ValidMove = {
    to: Pos;
    path?: Pos[];
}

export interface EventMap {
    'created': {code: string}
    'playerlist-changed': string[],
    'start': void,
    'started': InitialState,
    'my-move': MoveDelta,
    'they-moved': MoveDelta,
    'come-again': MoveDelta,
    'close': void,
    'broadcast': any
}

export type Netcode = {
    gameCode: string,
    myNickname: string,
    players: string[],
    ws: WebSocketManager<EventMap>
}

export type MoveDelta = {
    turn: number,
    delta: Pos[]
}