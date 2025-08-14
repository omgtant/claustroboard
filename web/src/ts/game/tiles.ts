import { getNeighbors, posEq } from "../helpers/helpers";
import { Tile, GameState, Player, ValidMove } from "../types/types";
import { Pos } from "../types/util";

export class LayoutTile extends Tile {
    moveCount: number;

    onTurnStart(state: GameState): void {
        return;
    }

    availableMoves(state: GameState, player: Player): ValidMove[] {
        return Array.from(this.dfs(state, player, 0, this.moveCount, this, new Set(), []));
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

    dfs(state: GameState, player:Player, cur_depth:number, target_depth:number, tile: Tile, visited: Set<Tile>, path: Pos[]): Set<ValidMove> {
        if (cur_depth > target_depth) return new Set();
        if (cur_depth === target_depth) return new Set([{to: tile.position, path: [...path, tile.position]}]);
        visited.add(tile);
        path.push(tile.position);
        const result = new Set<ValidMove>();
        getNeighbors(state, tile).forEach(neighbor => {
            if (visited.has(neighbor) || !neighbor.canLandOnMe(state, player) || !neighbor.isOpen || state.players.some(p => posEq(p.position, neighbor.position))) return;
            this.dfs(state, player, cur_depth+1, target_depth, neighbor, visited,[...path]).forEach(n => {
                result.add(n);
            });
        });
        visited.delete(tile);
        path.pop();
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

    availableMoves(state: GameState, player: Player): ValidMove[] {
        return Array.from(this.dfs(state, player, 0, 4, this, new Set(), []));
    }

    dfs(state: GameState, player:Player, cur_depth:number, target_depth:number, tile: Tile, visited: Set<Tile>, path: Pos[]): Set<ValidMove> {
        if (cur_depth > target_depth) return new Set();
        if (cur_depth === target_depth) return new Set([{to: tile.position, path: [...path, tile.position]}]);
        visited.add(tile);
        path.push(tile.position);
        const result = new Set<ValidMove>();
        getNeighbors(state, tile).forEach(neighbor => {
            if (visited.has(neighbor) || !neighbor.canLandOnMe(state, player) || !neighbor.isOpen || state.players.some(p => posEq(p.position, neighbor.position))) return;
            this.dfs(state, player, cur_depth+1, target_depth, neighbor, visited, path).forEach(n => {
                result.add(n);
            });
        });
        visited.delete(tile);
        if (cur_depth !== 0) result.add({to: tile.position, path: path.slice()}); // Include the current tile as a valid move
        path.pop();
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

