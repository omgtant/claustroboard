import { Pos, TileColor } from "./util";

export type InitialState = {
    palette: Record<string, {script: string}>[];
    board: TileSetup[][];
    players: InitialPlayer[];
}

export type TileSetup = {tile_type: string, color:number, data: any}

export type GameState = {
    board: Board;
    turnNumber: number;
    playerTurnIndex: number;
    players: Player[];
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
    availableMoves(state: GameState, player: Player): Pos[] {throw new Error("Method not implemented.");};
    onPlayerLanding(state: GameState, player: Player): void {throw new Error("Method not implemented.");};

    canLandOnMe(state: GameState, player: Player): boolean {throw new Error("Method not implemented.");};
    canStartOnMe(state: GameState, player: Player): boolean {throw new Error("Method not implemented.");};
}

export type Board = {
    tiles: Tile[][];
}