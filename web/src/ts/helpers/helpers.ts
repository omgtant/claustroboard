import * as tiles from "../game/tiles";
import { Tile, GameState, InitialState, TileSetup } from "../types/types";
import { Pos, TileColor } from "../types/util";

export function getMockInitialState() : InitialState {
    return {
        palette: [{'LayoutTile': {script: 'LayoutTile'}}],
        board: shuffle2DArr([[
            {tile_type: 'LayoutTile', color:1, data: {move_count: 1}},
            {tile_type: 'LayoutTile', color:1, data: {move_count: 2}},
            {tile_type: 'LayoutTile', color:1, data: {move_count: 3}},
            {tile_type: 'LayoutTile', color:1, data: {move_count: 4}}
        ], [
            {tile_type: 'LayoutTile', color:2, data: {move_count: 1}},
            {tile_type: 'LayoutTile', color:2, data: {move_count: 2}},
            {tile_type: 'LayoutTile', color:2, data: {move_count: 3}},
            {tile_type: 'LayoutTile', color:2, data: {move_count: 4}}
        ], [
            {tile_type: 'LayoutTile', color:3, data: {move_count: 1}},
            {tile_type: 'LayoutTile', color:3, data: {move_count: 2}},
            {tile_type: 'LayoutTile', color:3, data: {move_count: 3}},
            {tile_type: 'LayoutTile', color:3, data: {move_count: 4}}
        ], [
            {tile_type: 'LayoutTile', color:4, data: {move_count: 1}},
            {tile_type: 'LayoutTile', color:4, data: {move_count: 2}},
            {tile_type: 'LayoutTile', color:4, data: {move_count: 3}},
            {tile_type: 'LayoutTile', color:4, data: {move_count: 4}}
        ]]),
        players: [{nickname: 'omga', position: {x: 0, y: 0}}, {nickname: 'miltant', position: {x: 1, y: 1}}]
    };
}

export function readInitialStateIntoGameState(initialState: InitialState) : GameState {
    const gameState: GameState = {
        board: {
            tiles: initialState.board.map((row, y) =>
                row.map((tileSetup, x) => bakeTile(tileSetup, { x, y }))
            )
        },
        turnNumber: 0,
        playerTurnIndex: 0,
        players: initialState.players.map(player => ({
            ...player,
            position: { ...player.position },
            is_active: true
        }))
    };
    return gameState;
}

export function bakeTile(tileSetup: TileSetup, pos: Pos) : Tile {
    // const tiles = require("../game/tiles");
    if (tileSetup.tile_type === 'LayoutTile') {
        const tile: tiles.LayoutTile = new tiles.LayoutTile();
        tile.color = tileSetup.color;
        tile.position = pos;
        tile.isOpen = true;
        tile.moveCount = tileSetup.data.move_count;
        return tile;
    }
    throw Error(`Unknown tile type: ${tileSetup.tile_type}`);
}

/**
 * Returns a random integer between the specified range.
 * @param from The lower bound (inclusive).
 * @param to The upper bound (inclusive).
 * @returns A random integer between from and to.
 */
export function rnd(from: number, to:number, seed:number | undefined, tile: Tile | undefined) {
    if (to < from) throw new Error('Invalid range');
    if (seed === undefined) {
        if (tile === undefined) {
            seed = Date.now();
        } else {
            seed = tile.position.x * 1000 + tile.position.y;
        }
    }
    const random = Math.abs(Math.sin(seed)) * 10000;
    return Math.floor(random % (to - from + 1)) + from;
}

export function getNeighbors(state: GameState, tile: Tile): Tile[] {
    const neighbors: Tile[] = [];
    const directions = [
        { x: 0, y: -1 }, // up
        { x: 1, y: 0 },  // right
        { x: 0, y: 1 },  // down
        { x: -1, y: 0 }  // left
    ];
    directions.forEach(dir => {
        const newX = tile.position.x + dir.x;
        const newY = tile.position.y + dir.y;
        if (newX >= 0 && newX < state.board.tiles[0].length && newY >= 0 && newY < state.board.tiles.length) {
            neighbors.push(state.board.tiles[newY][newX]);
        }
    });
    return neighbors;
}

export function shuffle2DArr<T>(arr: T[][]): T[][] {
    const copied = arr.slice();


    for (let i = copied.length - 1; i > 0; i--) {
        copied[i] = copied[i].slice();
    }

    for (let i = copied.length - 1; i > 0; i--) {
        for (let j = copied[i].length - 1; j > 0; j--) {
            const randI = Math.floor(Math.random() * (i + 1));
            const randJ = Math.floor(Math.random() * (j + 1));
            [copied[i][j], copied[randI][randJ]] = [copied[randI][randJ], copied[i][j]];
        }
    }

    return copied;
}

export function posEq(a: Pos, b: Pos): boolean {
    return a.x === b.x && a.y === b.y;
}