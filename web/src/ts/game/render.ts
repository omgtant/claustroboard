import { rnd } from "../helpers/helpers";
import { HighlightFlags, RenderInterface } from "../types/renderInterface.ts";
import type { GameState, Player, Tile } from "../types/types.d.ts";
import { Pos, TileColor } from "../types/util.ts";
import { LayoutTile } from "./tiles";

const callbacks = {
    tryMoveTo: (pos: Pos) : void => {
        throw new Error("Callback not received yet");
    }
}


export const renderInterface: RenderInterface = {
    registerCallbacks: (tryMoveTo) => {
        callbacks.tryMoveTo = tryMoveTo;
    },
    renderState,
    clearHighlights,
    highlightTiles,
    complainInvalidMove,
    complain,
    movePlayer
}

const board = document.getElementById('board');

function getElementByPos(pos: Pos) {
    if (!board) throw new Error('Board element not found');

    const tileId = `${pos.x}-${pos.y}`;
    return board.querySelector(`[data-tile-id="${tileId}"]`);
}

function clearHighlights() {
    if (!board) throw new Error('Board element not found');
    const highlightedTiles = board.querySelectorAll('.tile-valid, .tile-selected');
    highlightedTiles.forEach(tile => {
        tile.classList.remove('tile-valid', 'tile-selected');
    });
}

function highlightTiles(tiles: Pos[], flags: HighlightFlags) {
    if (!board) throw new Error('Board element not found');
    clearHighlights();

    tiles.forEach(tile => {
        const tileElement = getElementByPos(tile);
        if (tileElement) {
            if (flags === 0) {
                tileElement.classList.remove('tile-valid', 'tile-selected');
            }
            if (flags & HighlightFlags.SELECTION) {
                tileElement.classList.add('tile-selected');
            }
            if (flags & HighlightFlags.VALID) {
                tileElement.classList.add('tile-valid');
            }
        }
    });
}

function movePlayer(player: Player, to: Pos) {

}

function complainInvalidMove() {
    alert("sex");
}

function complain(message: string) {
    alert(message + ". <br>");
}

function renderState(state: GameState) {
    if (!board) throw new Error('Board element not found');
    board.innerHTML = '';

    console.log("AAAAB");

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
                const isValid = tileElement.classList.contains('tile-valid');
                console.log(`Tile clicked: ${tile.position.x}, ${tile.position.y}, valid: ${isValid}`);
                if (isValid) {
                    clearHighlights();
                    movePlayer(state.players[state.playerTurnIndex], tile.position);
                    return;
                }

                const isSelected = tileElement.classList.contains('tile-selected');
                if (!isSelected) {
                    if (!tile.isOpen) return; // Ignore clicks on closed tiles
                    clearHighlights();
                    tileElement.classList.add('tile-selected');
                    const validMoves = tile.availableMoves(state, state.players[state.playerTurnIndex]);
                    validMoves.forEach(pos => {
                        getElementByPos(pos)?.classList.add('tile-valid');
                    });
                } else {
                    clearHighlights();
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

