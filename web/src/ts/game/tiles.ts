import { getNeighbors } from "../helpers/helpers";
import { Tile, GameState, Player } from "../types/types";
import { Pos } from "../types/util";

export class LayoutTile extends Tile {
    moveCount: number;

    onTurnStart(state: GameState): void {
        return;
    }

    availableMoves(state: GameState, player: Player): Pos[] {
        return Array.from(this.dfs(state, player, 0, this.moveCount, this, new Set())).map(tile => tile.position);
    }

    onPlayerLanding(state: GameState, player: Player): void {
        return;
    }

    canLandOnMe(state: GameState, player: Player): boolean {
        return true;
    }

    canStartOnMe(state: GameState, player: Player): boolean {
        return true;
    }

    dfs(state: GameState, player:Player, cur_depth:number, target_depth:number, tile: Tile, visited: Set<Tile>): Set<Tile> {
        if (cur_depth > target_depth) return new Set();
        if (cur_depth === target_depth) return new Set([tile]);
        visited.add(tile);
        const result = new Set<Tile>();
        getNeighbors(state, tile).forEach(neighbor => {
            if (visited.has(neighbor) || !neighbor.canLandOnMe(state, player) || !neighbor.isOpen) return;
            this.dfs(state, player, cur_depth+1, target_depth, neighbor, visited).forEach(n => {
                result.add(n);
            });
        });
        visited.delete(tile);
        return result;
    }
}