import { Pos, TileColor } from "./util";

export type InitialState = {
    palette: Record<string, {script: string}>[];
    board: TileSetup[][];
    players: Player[];
}

export type TileSetup = {tile_type: string, color:number, data: any}

export type GameState = {
    board: Board;
    turnNumber: number;
    playerTurnIndex: number;
    players: Player[];
}

export type Player = {
    nickname: string;
    position: Pos;
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