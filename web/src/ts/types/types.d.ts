import { Pos, TileColor } from "./util";

export class GameState {
    palette: Record<string, {script: string}>[];
    board: {tile_type: string, color:number, data: any}[][];
    players: Player[];
}

export class Player {
    nickname: string;
    position: Pos;
}

export class AbstractTile {
    // Properties
    position: Pos;
    is_open: boolean;
    color: TileColor;

    // Hooks
    onTurnStart(state: GameState): void;
    availableMoves(state: GameState, player: Player): Pos[];
    onPlayerLanding(state: GameState, player: Player): void;

    canLandOnMe(state: GameState, player: Player): boolean;
    canStartOnMe(state: GameState, player: Player): boolean;
}