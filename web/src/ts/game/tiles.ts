import { getNeighbors, posEq } from "../helpers/helpers";
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

    canStartOnMe(state: Tile[][]): boolean {
        return true;
    }

    dfs(state: GameState, player:Player, cur_depth:number, target_depth:number, tile: Tile, visited: Set<Tile>): Set<Tile> {
        if (cur_depth > target_depth) return new Set();
        if (cur_depth === target_depth) return new Set([tile]);
        visited.add(tile);
        const result = new Set<Tile>();
        getNeighbors(state, tile).forEach(neighbor => {
            if (visited.has(neighbor) || !neighbor.canLandOnMe(state, player) || !neighbor.isOpen || state.players.some(p => posEq(p.position, neighbor.position))) return;
            this.dfs(state, player, cur_depth+1, target_depth, neighbor, visited).forEach(n => {
                result.add(n);
            });
        });
        visited.delete(tile);
        return result;
    }
}

export class WallTile extends Tile {
    onTurnStart(state: GameState): void {
        if (state.turnNumber == 0) {
            this.isOpen = false;
            state.someRenderInterface?.refreshTile(this);
        }
    }

    availableMoves(state: GameState, player: Player): Pos[] {
        throw new Error("A player is on a wall.");
    }

    onPlayerLanding(state: GameState, player: Player): void {
        throw new Error("A player is on a wall.");
    }

    canLandOnMe(state: GameState, player: Player): boolean {
        return false;
    }

    canStartOnMe(state: Tile[][]): boolean {
        return false;
    }
}

export class WildcardTile extends Tile {
    onTurnStart(state: GameState): void {
        return;
    }

    availableMoves(state: GameState, player: Player): Pos[] {
        return Array.from(this.dfs(state, player, 0, 4, this, new Set())).map(tile => tile.position);
    }

    dfs(state: GameState, player:Player, cur_depth:number, target_depth:number, tile: Tile, visited: Set<Tile>): Set<Tile> {
        if (cur_depth > target_depth) return new Set();
        if (cur_depth === target_depth) return new Set([tile]);
        visited.add(tile);
        const result = new Set<Tile>();
        getNeighbors(state, tile).forEach(neighbor => {
            if (visited.has(neighbor) || !neighbor.canLandOnMe(state, player) || !neighbor.isOpen || state.players.some(p => posEq(p.position, neighbor.position))) return;
            this.dfs(state, player, cur_depth+1, target_depth, neighbor, visited).forEach(n => {
                result.add(n);
            });
        });
        if (cur_depth !== 0) result.add(tile); // Include the current tile as a valid move
        visited.delete(tile);
        return result;
    }

    onPlayerLanding(state: GameState, player: Player): void {
        return;
    }

    canLandOnMe(state: GameState, player: Player): boolean {
        return true;
    }

    canStartOnMe(state: Tile[][]): boolean {
        return true;
    }
}

