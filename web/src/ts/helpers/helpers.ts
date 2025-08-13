import * as tiles from "../game/tiles";
import { GameState, InitialPlayer, InitialState, Player, Tile, TileSetup } from "../types/types";
import { Pos } from "../types/util";

export function getMockInitialState(): InitialState {
    const obj = {
        palette: [{ 'LayoutTile': { script: 'LayoutTile' } }],
        board: shuffle2DArr([[
            { tile_type: 'LayoutTile', color: 1, data: { move_count: 1 } },
            { tile_type: 'LayoutTile', color: 1, data: { move_count: 2 } },
            { tile_type: 'LayoutTile', color: 1, data: { move_count: 3 } },
            { tile_type: 'LayoutTile', color: 1, data: { move_count: 4 } }
        ], [
            { tile_type: 'LayoutTile', color: 2, data: { move_count: 1 } },
            { tile_type: 'LayoutTile', color: 2, data: { move_count: 2 } },
            { tile_type: 'LayoutTile', color: 2, data: { move_count: 3 } },
            { tile_type: 'LayoutTile', color: 2, data: { move_count: 4 } }
        ], [
            { tile_type: 'LayoutTile', color: 3, data: { move_count: 1 } },
            { tile_type: 'LayoutTile', color: 3, data: { move_count: 2 } },
            { tile_type: 'LayoutTile', color: 3, data: { move_count: 3 } },
            { tile_type: 'LayoutTile', color: 3, data: { move_count: 4 } }
        ], [
            { tile_type: 'LayoutTile', color: 4, data: { move_count: 1 } },
            { tile_type: 'LayoutTile', color: 4, data: { move_count: 2 } },
            { tile_type: 'LayoutTile', color: 4, data: { move_count: 3 } },
            { tile_type: 'LayoutTile', color: 4, data: { move_count: 4 } }
        ]]),
        players: [{ nickname: 'omga'}, { nickname: 'miltant' }] as InitialPlayer[]
    };
    const board = readIntialBoardIntoGameBoard(obj.board);
    const possiblePositions = board.flatMap(row => row.filter(tile => tile.canStartOnMe(board)).map(tile => tile.position));
    if (obj.players.length > possiblePositions.length) {
        throw new Error('Not enough starting positions for players');
    }
    possiblePositions.sort(() => Math.random() - 0.5); // Shuffle positions
    obj.players = obj.players.map((player, index) => {
        (player as InitialPlayer).position = possiblePositions[index];
        return player as InitialPlayer;
    });
    return obj as InitialState;
}

export function readInitialStateIntoGameState(initialState: InitialState): GameState {
    const gameState: GameState = {
        board: {
            tiles: readIntialBoardIntoGameBoard(initialState.board)
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

function readIntialBoardIntoGameBoard(tileSetups: TileSetup[][]): Tile[][] {
    return tileSetups.map((row, y) =>
        row.map((tileSetup, x) => {
            const tile = bakeTile(tileSetup, { x, y });
            if (!tile) throw new Error(`Failed to create tile at position (${x}, ${y})`);
            return tile;
        })
    );
}

export function bakeTile(tileSetup: TileSetup, pos: Pos): Tile {
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
export function rnd(from: number, to: number, seed: number | undefined, tile: Tile | undefined) {
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

    const totalElements = copied.reduce((sum, row) => sum + row.length, 0);
    for (let i = totalElements - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));

        // Convert linear indices to 2D coordinates
        const iRow = Math.floor(i / copied[0].length);
        const iCol = i % copied[0].length;
        const jRow = Math.floor(j / copied[0].length);
        const jCol = j % copied[0].length;

        // Swap elements
        [copied[iRow][iCol], copied[jRow][jCol]] = [copied[jRow][jCol], copied[iRow][iCol]];
    }

    return copied;
}

export function posEq(a: Pos, b: Pos): boolean {
    return a.x === b.x && a.y === b.y;
}
