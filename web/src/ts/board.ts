

const board = document.getElementById('board');

const N = 4;

const tiles: LayoutTile[][] = Array.from({ length: N }, () => Array.from({ length: N }));

for (let i = 0; i < N*N; i++) {
    const tile: LayoutTile = {
        position: { x: i % 4, y: Math.floor(i / 4) },
        is_open: true,
        color: i % 4 + 1,
        move_number: Math.floor(i / 4) + 1
    };

    tiles[tile.position.y][tile.position.x] = tile;
}

renderBoard();

/**
 * Returns a random integer between the specified range.
 * @param from The lower bound (inclusive).
 * @param to The upper bound (inclusive).
 * @returns A random integer between from and to.
 */
function rnd(from: number, to:number, seed:number | undefined, tile: Tile | undefined) {
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

function getColor(num) {
    switch (num) {
        case 1: return 'red';
        case 2: return 'green';
        case 3: return 'blue';
        case 4: return 'yellow';
        default: return 'gray';
    }
}

function getElementByTile(tile: Tile) {
    if (!board) throw new Error('Board element not found');

    const tileId = `${tile.position.x}-${tile.position.y}`;
    return board.querySelector(`[data-tile-id="${tileId}"]`);
}

function canMoveTo(tile: Tile) {
    return tile.is_open;
}

function getValidMoves(tile: LayoutTile): Tile[] {
    return Array.from(dfs(0, tile.move_number, tile, new Set()));
}

function getNeighbors(tile: Tile): Tile[] {
    const neighbors: LayoutTile[] = [];
    const directions = [
        { x: 0, y: -1 }, // up
        { x: 1, y: 0 },  // right
        { x: 0, y: 1 },  // down
        { x: -1, y: 0 }  // left
    ];
    directions.forEach(dir => {
        const newX = tile.position.x + dir.x;
        const newY = tile.position.y + dir.y;
        if (newX >= 0 && newX < N && newY >= 0 && newY < N) {
            neighbors.push(tiles[newY][newX]);
        }
    });
    return neighbors;
}

function dfs(cur_depth:number, target_depth:number, tile: Tile, visited: Set<Tile>): Set<Tile> {
    if (cur_depth > target_depth) return new Set();
    if (cur_depth === target_depth) return new Set([tile]);
    visited.add(tile);
    const result = new Set<Tile>();
    getNeighbors(tile).forEach(neighbor => {
        if (visited.has(neighbor) || !canMoveTo(neighbor)) return;
        dfs(cur_depth+1, target_depth, neighbor, visited).forEach(n => {
            result.add(n);
        });
    });
    visited.delete(tile);
    return result;
}

function deselectTiles() {
    if (!board) throw new Error('Board element not found');
    const selectedTiles = board.querySelectorAll('.tile-selected, .tile-valid');
    selectedTiles.forEach(tile => {
        tile.classList.remove('tile-selected', 'tile-valid');
    });
}

function renderBoard() {
    if (!board) throw new Error('Board element not found');
    board.innerHTML = '';

    tiles.forEach(row => {
        row.forEach(tile => {
            const tileParent = document.createElement('div');
            tileParent.classList.add('tile-parent');
            
            const tileElement = document.createElement('div');
            tileElement.className = `tile tile${rnd(1,2,undefined,tile)} tile-${getColor(tile.color)} tile-layout-${tile.move_number}`;
            if (!tile.is_open) tileElement.classList.add('tile-closed');
            tileElement.addEventListener('click', () => {
                const isSelected = tileElement.classList.contains('tile-selected');
                if (!isSelected) {
                    deselectTiles();
                    tileElement.classList.add('tile-selected');
                    const validMoves = getValidMoves(tile);
                    validMoves.forEach(tile => {
                        getElementByTile(tile)?.classList.add('tile-valid');
                    });
                } else {
                    deselectTiles();
                }
            });
            tileElement.dataset.tileId = `${tile.position.x}-${tile.position.y}`;
            tileElement.addEventListener('contextmenu', (event) => {
                event.preventDefault();
                tile.is_open = !tile.is_open;
                tileElement.classList.toggle('tile-closed', !tile.is_open);
            });
            tileParent.appendChild(tileElement);
            board.appendChild(tileParent);
        });
    });
}