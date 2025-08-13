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
    movePlayer,
    closeTile,
    renderWin
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

function FLIPPlayerBegin(player: Player) {
    const playerElement:HTMLElement | null = document.querySelector(`[data-player-nickname="${player.nickname}"]`);
    if (!playerElement) throw new Error('Player element not found');

    const rect = playerElement.getBoundingClientRect();
    playerElement.dataset.oldX = rect.x.toString();
    playerElement.dataset.oldY = rect.y.toString();
}

function FLIPPlayerEnd(player: Player) {
    const playerElement:HTMLElement | null = document.querySelector(`[data-player-nickname="${player.nickname}"]`);
    if (!playerElement) throw new Error('Player element not found');

    const newRect = playerElement.getBoundingClientRect();

    const oldX = playerElement.dataset.oldX;
    const oldY = playerElement.dataset.oldY;

    const dX = newRect.x - parseFloat(oldX || '0');
    const dY = newRect.y - parseFloat(oldY || '0');

    console.log(`Player ${player.nickname} moved by (${dX}, ${dY})`);

    playerElement.animate([
        { transform: `translate(${-dX}px, ${-dY}px)` },
        { transform: 'translate(0, 0)' }
    ], {
        duration: 300,
        easing: 'ease-in-out'
    });
}

function movePlayer(player: Player, to: Pos) {
    const playerElement = document.querySelector(`[data-player-nickname="${player.nickname}"]`);

    if (playerElement) {
        const tileElement = getElementByPos(to);
        if (tileElement?.parentElement) {
            FLIPPlayerBegin(player);
            tileElement.parentElement.appendChild(playerElement);
            FLIPPlayerEnd(player);
        }
    }
}

function closeTile(pos: Pos) {
    const tileElement = getElementByPos(pos);
    if (tileElement) {
        tileElement.classList.add('tile-closed');
    }
}

function renderWin(state: GameState, winner: Player) {
    const winnerElement = document.querySelector(`[data-player-nickname="${winner.nickname}"]`);
    if (!winnerElement) throw new Error('Winner element not found');

    winnerElement.classList.add('player-won');
    console.log(`Player ${winner.nickname} has won the game!`);
    state.players.filter(p => p !== winner).forEach(loser => {
        const loserElement = document.querySelector(`[data-player-nickname="${loser.nickname}"]`);
        if (loserElement) {
            loserElement.classList.add('player-lost');
        }
    });
}

function _shakeBoard() {
    if (!board) throw new Error('Board element not found');
    board.animate([
        { transform: 'translateX(0)', boxShadow: '0 0 0 rgba(0, 0, 0, 0)' },
        { transform: 'translateX(-5px)', boxShadow: '0 5px 20px rgba(255, 0, 0, 0.5)' },
        { transform: 'translateX(5px)', boxShadow: '0 5px 20px rgba(255, 0, 0, 0.5)' },
        { transform: 'translateX(-5px)', boxShadow: '0 5px 20px rgba(255, 0, 0, 0.5)' },
        { transform: 'translateX(0)', boxShadow: '0 0 0 rgba(0, 0, 0, 0)' }
    ], {
        duration: 250,
        easing: 'ease-out'
    });
}

function complainInvalidMove() {
    _shakeBoard();
}

function complain(message: string) {
    alert(message + ". <br>");
}

function _createTile(tile: Tile) {
    const tileParent = document.createElement('div');
    tileParent.classList.add('tile-parent');
    
    const tileElement = document.createElement('div');
    tileElement.className = `tile tile-type-${rnd(1,2,undefined,tile)} tile-${TileColor[tile.color]}`;

    if (!tile.isOpen) tileElement.classList.add('tile-closed');

    tileElement.dataset.tileId = `${tile.position.x}-${tile.position.y}`;


    if (tile instanceof LayoutTile) {
        tileElement.classList.add(`tile-layout-${tile.moveCount}`);
    } 
    tileParent.appendChild(tileElement);

    tileParent.addEventListener('click', () => {
        callbacks.tryMoveTo(tile.position);
    });

    return tileParent;
}

function _createPlayerElement(player: Player, index: number): HTMLElement {
    const playerParent = document.createElement('div');
    playerParent.className = 'player-parent';
    const playerElement = document.createElement('div');
    playerElement.className = `player player-${index+1}`;
    playerParent.appendChild(playerElement);
    playerParent.dataset.playerNickname = player.nickname;
    _offsetPlayerElement(playerParent, player.position);
    return playerParent;
}

function _offsetPlayerElement(playerElement: HTMLElement, pos: Pos) {
    const tileElement = getElementByPos(pos);
    if (!tileElement) throw new Error('Tile element not found');
}

function renderState(state: GameState) {
    if (!board) throw new Error('Board element not found');
    board.innerHTML = '';

    state.board.tiles.forEach(row => {
        row.forEach(tile => {
            board.appendChild(_createTile(tile));
        });
    });

    state.players.forEach((player, index) => {
        const el = getElementByPos(player.position);
        if (!el) throw new Error('Player position tile not found');
        el.parentElement?.appendChild(_createPlayerElement(player, index));
    });
}

