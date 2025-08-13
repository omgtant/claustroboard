import { rnd } from "../helpers/helpers";
import type { GameState, Tile } from "../types/types.d.ts";
import { Pos, TileColor } from "../types/util.ts";
import { LayoutTile } from "./tiles";

const board = document.getElementById('board');



function getElementByPos(pos: Pos) {
    if (!board) throw new Error('Board element not found');

    const tileId = `${pos.x}-${pos.y}`;
    return board.querySelector(`[data-tile-id="${tileId}"]`);
}



export function renderBoard(state: GameState) {
    if (!board) throw new Error('Board element not found');
    board.innerHTML = '';

    state.board.tiles.forEach(row => {
        row.forEach(tile => {
            const tileParent = document.createElement('div');
            tileParent.classList.add('tile-parent');
            
            const tileElement = document.createElement('div');
            tileElement.className = `tile tile-type-${rnd(1,2,undefined,tile)} tile-${TileColor[tile.color]}`;
            if (tile instanceof LayoutTile) {
                tileElement.classList.add(`tile-layout-${tile.moveCount}`);
            }
            if (!tile.isOpen) tileElement.classList.add('tile-closed');
            tileElement.addEventListener('click', () => {
                const isSelected = tileElement.classList.contains('tile-selected');
                if (!isSelected) {
                    if (!tile.isOpen) return; // Ignore clicks on closed tiles
                    deselectTiles();
                    tileElement.classList.add('tile-selected');
                    const validMoves = tile.availableMoves(state, state.players[state.playerTurnIndex]);
                    validMoves.forEach(pos => {
                        getElementByPos(pos)?.classList.add('tile-valid');
                    });
                } else {
                    deselectTiles();
                }
            });
            tileElement.dataset.tileId = `${tile.position.x}-${tile.position.y}`;
            tileElement.addEventListener('contextmenu', (event) => {
                event.preventDefault();
                tile.isOpen = !tile.isOpen;
                tileElement.classList.toggle('tile-closed', !tile.isOpen);

                // Rerun selection simulation
                const selectedTileElement = document.querySelector('.tile-selected');
                if (selectedTileElement) {selectedTileElement.dispatchEvent(new Event('click')); selectedTileElement.dispatchEvent(new Event('click')); }
            });
            tileParent.appendChild(tileElement);
            board.appendChild(tileParent);
        });
    });
}


function deselectTiles() {
    if (!board) throw new Error('Board element not found');
    const selectedTiles = board.querySelectorAll('.tile-selected, .tile-valid');
    selectedTiles.forEach(tile => {
        tile.classList.remove('tile-selected', 'tile-valid');
    });
}