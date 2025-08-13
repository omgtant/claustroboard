
const board = document.getElementById('board');

if (!board) {
    throw new Error('Board element not found');
}

for (let i = 0; i < 16; i++) {
    const tile = document.createElement('div');
    tile.className = `tile${i % 2 + 1}`;
    const color = ["tile-red", "tile-blue", "tile-yellow", "tile-green"][i % 4];
    const layout = ["tile-layout-1", "tile-layout-2", "tile-layout-3", "tile-layout-4"][Math.floor(i / 4)];
    tile.classList.add(color);
    tile.classList.add(layout);
    board.appendChild(tile);
}