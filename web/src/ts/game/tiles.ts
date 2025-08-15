import { getNeighbors, posEq, isTileReasonableToLandOn, cloneTile } from "../helpers/helpers";
import { renderInterface } from "../render/render";
import { Tile, GameState, Player, ValidMove } from "../types/types";
import { Pos, TileColor } from "../types/util";

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

export class TeleportTile extends Tile {
    onTurnStart(state: GameState): void {
    }

    availableMoves(state: GameState, player: Player): ValidMove[] {
        const result: ValidMove[] = []

        state.board.tiles.forEach(row => {
            row.forEach(tile => {
                if (tile instanceof TeleportTile) return;
                if (!isTileReasonableToLandOn(tile, state, player)) return;
                if (tile.isOpen === false) return;
                if (this.color !== TileColor.COLORLESS && this.color !== tile.color) return;

                result.push({to: tile.position, path: [this.position, tile.position]});
            })
        })

        return result;
    }

    onPlayerLanding(state: GameState, player: Player): void {
        state.playerTurnIndex--;
        if (state.playerTurnIndex === -1) state.playerTurnIndex = state.players.length - 1;
    }

    canLandOnMe(state: GameState, player: Player): boolean {
        return !(state.board.tiles.flat().find(tile => posEq(tile.position, player.position)) instanceof TeleportTile);
    }

    canStartOnMe(board: Tile[][]): boolean {
        return false;
    }
}

export class ZeroTile extends Tile {
    onTurnStart(state: GameState): void {
    }

    onPlayerLanding(state: GameState, player: Player): void {
        const activePlayers = state.players.filter(pl => pl.is_active);
        if (activePlayers.length <= 1) return;

        const nextPlayerPos = activePlayers[
            (activePlayers.findIndex(pl => pl.nickname === player.nickname)+1) % activePlayers.length].position;
        const nextPlayerTile = state.board.tiles.flat().find(tile => posEq(tile.position, nextPlayerPos));
        if (!nextPlayerTile) throw Error("No next player tile");
        const thisPosition = {x: this.position.x, y: this.position.y};
        const newTile = cloneTile(nextPlayerTile) as Tile;
        state.board.tiles[this.position.y][this.position.x] = newTile;
        newTile.position = thisPosition;
        console.log(thisPosition, newTile);
        renderInterface?.refreshTile(newTile);
        let pos = activePlayers[0].position;

        activePlayers.forEach((pl, index) => {
            if (index === activePlayers.length-1) return;

            pl.position = activePlayers[index+1].position;
            renderInterface.movePlayer(-1, pl, {to: pl.position})
        })
        activePlayers[activePlayers.length-1].position = pos;
        renderInterface.movePlayer(-1, activePlayers[activePlayers.length-1], {to: activePlayers[activePlayers.length-1].position}); 
    }

    availableMoves(state: GameState, player: Player): Pos[] {
        throw Error("Can't be moving from this tile");
    }

    canLandOnMe(state: GameState, player: Player): boolean {
        return true;
    }

    canStartOnMe(board: Tile[][]): boolean {
        return false;
    }
}