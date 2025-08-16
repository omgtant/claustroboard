import * as tiles from "../game/tiles";
import { GameState, InitialPlayer, InitialState, Player, Tile, TileSetup, ValidMove } from "../types/types";
import { Pos } from "../types/util";

export function getMockInitialState(): InitialState {
    const obj = {
        palette: [{ 'Layout': { script: 'Layout' } }],
        board: shuffle2DArr([[
            { tile_type: 'Layout', color: 1, data: { move_count: 1 } },
            { tile_type: 'Layout', color: 1, data: { move_count: 2 } },
            { tile_type: 'Layout', color: 1, data: { move_count: 3 } },
            { tile_type: 'Layout', color: 1, data: { move_count: 4 } },
            { tile_type: 'Teleport', color: 1 },
            { tile_type: 'Wall', color: 1}
        ], [
            { tile_type: 'Layout', color: 2, data: { move_count: 1 } },
            { tile_type: 'Layout', color: 2, data: { move_count: 2 } },
            { tile_type: 'Layout', color: 2, data: { move_count: 3 } },
            { tile_type: 'Layout', color: 2, data: { move_count: 4 } },
            { tile_type: 'Teleport', color: 2 },
            { tile_type: 'Wall', color: 2}
        ], [
            { tile_type: 'Layout', color: 3, data: { move_count: 1 } },
            { tile_type: 'Layout', color: 3, data: { move_count: 2 } },
            { tile_type: 'Layout', color: 3, data: { move_count: 3 } },
            { tile_type: 'Layout', color: 3, data: { move_count: 4 } },
            { tile_type: 'Teleport', color: 3 },
            { tile_type: 'Wall', color: 3}
        ], [
            { tile_type: 'Layout', color: 4, data: { move_count: 1 } },
            { tile_type: 'Layout', color: 4, data: { move_count: 2 } },
            { tile_type: 'Layout', color: 4, data: { move_count: 3 } },
            { tile_type: 'Layout', color: 4, data: { move_count: 4 } },
            { tile_type: 'Teleport', color: 4 },
            { tile_type: 'Wall', color: 4}
        ], [
            { tile_type: 'Wildcard', color: 0 },
            { tile_type: 'Wildcard', color: 0 },
            { tile_type: 'Wildcard', color: 0 },
            { tile_type: 'Wildcard', color: 0 },
            { tile_type: 'Wildcard', color: 0 },
            { tile_type: 'Teleport', color: 0 }
        ], [
            {tile_type: 'Zero', color:1},
            {tile_type: 'Zero', color:2},
            {tile_type: 'Zero', color:3},
            {tile_type: 'Zero', color:4},
            {tile_type: 'Zero', color:4},
            {tile_type: 'Zero', color:4},
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
        })),
        history: [],
        initialState: { ...initialState },
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
    if (tileSetup.tile_type === 'Layout') {
        const tile: tiles.LayoutTile = new tiles.LayoutTile();
        tile.color = tileSetup.color;
        tile.position = pos;
        tile.isOpen = true;
        tile.moveCount = tileSetup.data.move_count;
        return tile;
    } else if (tileSetup.tile_type === 'Wall') {
        const tile: tiles.WallTile = new tiles.WallTile();
        tile.color = tileSetup.color;
        tile.position = pos;
        tile.isOpen = true;
        return tile;
    } else if (tileSetup.tile_type === 'Wildcard') {
        const tile: tiles.WildcardTile = new tiles.WildcardTile();
        tile.color = tileSetup.color;
        tile.position = pos;
        tile.isOpen = true;
        return tile;
    } else if (tileSetup.tile_type === 'Teleport') {
        const tile: tiles.TeleportTile = new tiles.TeleportTile();
        tile.color = tileSetup.color;
        tile.position = pos;
        tile.isOpen = true;
        return tile;
    } else if (tileSetup.tile_type === 'Zero') {
        const tile: tiles.ZeroTile = new tiles.ZeroTile();
        tile.color = tileSetup.color;
        tile.position = pos;
        tile.isOpen = true;
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


export function isTileReasonableToLandOn(tile: Tile, state: GameState, player: Player) {
    return  tile.isOpen &&
            tile.canLandOnMe(state, player) &&
            !state.players.some(pl => posEq(pl.position, tile.position));
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

/**
 * Turns all Pos objects in the array into ValidMove objects.
 * Additionally, filters out repeated positions.
 * @param moves Array of positions or ValidMove objects.
 */
export function toValidMovesOnly(moves: Pos[] | ValidMove[]): ValidMove[] {
    return moves.map((move: Pos | ValidMove) => {
        if (move instanceof Object && 'to' in move && 'path' in move) {
            move.path = move.path || [];
            return move as ValidMove & {path: Pos[]};
        } else if (move instanceof Object && 'x' in move && 'y' in move) {
            return { to: move as Pos, path: [move as Pos] } as ValidMove & {path: Pos[]};
        }
        throw new Error('Invalid move type');
    }).sort((a, b) =>  a.path.length - b.path.length).filter((move, index, self) =>
        index === self.findIndex(m => posEq(m.to, move.to))
    ) as ValidMove[];
}

export function cloneTile(tile: Tile) {
    // @ts-ignore
    let newTile: Tile = new tile.constructor; 
    Object.assign(newTile, tile);
    return newTile;
}

export function validateNickname(nickname: string): [true] | [false, string] {
    if (!nickname || nickname.trim() === '') return [false, "No nickname"];
    
    return [true]
}