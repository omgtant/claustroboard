import { rnd } from "../helpers/helpers.ts";
import { TileHighlightFlags, RenderInterface, PlayerHighlightFlags } from "../types/renderInterface.ts";
import type { GameState, Player, Tile, ValidMove } from "../types/types.ts";
import { Pos, TileColor } from "../types/util.ts";
import { LayoutTile, TeleportTile, WildcardTile, ZeroTile } from "../game/tiles.ts";
import { transform } from "typescript";
import { _movePlayer } from "./playerMover.ts";

const callbacks = {
    tryMoveTo: (pos: Pos) : void => {
        throw new Error("Callback not received yet");
    },
    jumpToHistory: (turnNumber: number) : void => {
        throw new Error("Callback not received yet");
    }
}


export const renderInterface: RenderInterface = {
    registerCallbacks: (tryMoveTo, jumpToHistory) => {
        callbacks.tryMoveTo = tryMoveTo;
        callbacks.jumpToHistory = jumpToHistory;
    },
    renderState,
    clearHighlights,
    highlightTiles,
    complainInvalidMove,
    complain,
    movePlayer,
    refreshTile,
    renderWin,
    gameStart,
    highlightPlayer,
    suggestMoves,
    playerLost,
}

export const board = document.getElementById('board');
const log = document.getElementById('log');

function logTurn(turnNumber: number, player: Player, pos: Pos) {
    const el = logMessage(`${turnNumber.toString().padStart(3,'.')}: Player ${player.nickname} moved to (${pos.x}, ${pos.y})`);
    el.addEventListener('click', () => {
        callbacks.jumpToHistory(turnNumber);
    });
}

export function logMessage(message: string): HTMLSpanElement {
    if (!log) throw new Error('Log element not found');

    const logEntry = document.createElement('span');
    logEntry.textContent = message;
    log.appendChild(logEntry);
    log.scrollTop = log.scrollHeight; // Scroll to the bottom

    return logEntry;
}

function clearLog() {
    if (!log) throw new Error('Log element not found');
    log.innerHTML = '';
}

export function getElementByPos(pos: Pos): HTMLElement | null {
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

function movePlayer(turnNumber: number, player: Player, move: ValidMove) {
    _movePlayer(turnNumber, player, move);
    if (turnNumber !== -1) {
        logTurn(turnNumber, player, move.to);
    }
}

function highlightTiles(tiles: Pos[], flags: TileHighlightFlags) {
    if (!board) throw new Error('Board element not found');
    // clearHighlights();

    tiles.forEach(tile => {
        const tileElement = getElementByPos(tile);
        if (tileElement) {
            if (flags === 0) {
                tileElement.classList.remove('tile-valid', 'tile-selected');
            }
            if (flags & TileHighlightFlags.SELECTION) {
                tileElement.classList.add('tile-selected');
            }
            if (flags & TileHighlightFlags.VALID) {
                tileElement.classList.add('tile-valid');
            }
        }
    });
}

let _choiceCallback: ((move: Pos) => void) | undefined;
function suggestMoves(moves: ValidMove[], player: Player, choiceCallback?: (move: Pos) => void) {
    if (!board) throw new Error('Board element not found');

    clearHighlights();
    clearAllArrows();

    if (moves.length === 0) {
        console.warn("No valid moves available for player", player.nickname);
        return;
    }
    highlightPlayer(player);
    
    highlightTiles([player.position], TileHighlightFlags.SELECTION);
    
    highlightTiles(moves.map(move => move.to), TileHighlightFlags.VALID);
    const tileElements = moves.map(move => getElementByPos(move.to));
    moves.forEach(arrowOnHover);
    _choiceCallback = choiceCallback;
}


/**
 * Takes a move and drags the player along the path of the move.
 */

function refreshTile(tile: Tile) {
    const tileElement = getElementByPos(tile.position);
    if (!tileElement) throw new Error('Tile element not found');

    tileElement.className = `
        tile tile-type-${rnd(1,2,undefined,tile)} tile-${TileColor[tile.color]}`;
    
    if (!tile.isOpen) {
        tileElement.classList.add('tile-closed');
    }
    
    if (tile instanceof LayoutTile) {
        tileElement.classList.add(`tile-layout-${tile.energy}`);
    }

    if (tile instanceof WildcardTile) {
        tileElement.classList.add(`tile-wildcard`);
    }

    if (tile instanceof TeleportTile) {
        tileElement.classList.add('tile-teleport');
    }

    if (tile instanceof ZeroTile) {
        tileElement.classList.add('tile-zero');
    }
}

function gameStart(state: GameState) {
    if (!board) throw new Error('Board element not found');
    clearLog();
    logMessage("Game started!");
}

function renderWin(state: GameState, winner: Player) {
    clearAllArrows();

    const winnerElement = document.querySelector(`[data-player-nickname="${winner.nickname}"]`);
    if (!winnerElement) throw new Error('Winner element not found');

    winnerElement.classList.add('player-won');
    logMessage(`Player ${winner.nickname} has won the game!`);
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
    const tileGrandparent = document.createElement('div');
    tileGrandparent.classList.add('tile-grandparent');

    const tileParent = document.createElement('div');
    tileParent.classList.add('tile-parent');
    
    const tileElement = document.createElement('div');

    tileElement.dataset.tileId = `${tile.position.x}-${tile.position.y}`;

    
    tileParent.appendChild(tileElement);
    tileGrandparent.appendChild(tileParent);
    
    tileParent.addEventListener('click', () => {
        if (_choiceCallback) _choiceCallback(tile.position);
        else callbacks.tryMoveTo(tile.position);
    });

    return tileGrandparent;
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
            refreshTile(tile);
        });
    });

    state.players.forEach((player, index) => {
        const el = getElementByPos(player.position);
        if (!el) throw new Error('Player position tile not found');
        el.parentElement?.parentElement?.appendChild(_createPlayerElement(player, index));
    });
}

function highlightPlayer(player: Player, flags: PlayerHighlightFlags = PlayerHighlightFlags.NONE) {
    const playerElement = document.querySelector(`[data-player-nickname="${player.nickname}"]`);
    if (!playerElement) throw new Error('Player element not found');

    const otherPlayers = document.querySelectorAll('.player-parent');
    otherPlayers.forEach(el => {
        if (el !== playerElement) {
            el.classList.remove('player-highlight');
        }
    });

    playerElement.classList.add('player-highlight');
}

function playerLost(player: Player) {
    const playerElement = document.querySelector(`[data-player-nickname="${player.nickname}"]`);
    if (!playerElement) throw new Error('Player element not found');

    playerElement.classList.add('player-lost');
    playerElement.classList.remove('player-highlight');
    logMessage(`Player ${player.nickname} has lost the game!`);
}

function clearAllArrows() {
    const arrows = document.querySelectorAll('.move-arrow');
    arrows.forEach(arrow => {
        arrow.remove();
    });
}

function getCenterOfTileElementPercentRelToBoard(pos: Pos): {xPercent: number, yPercent: number} {
    const tileElement = getElementByPos(pos);
    if (!tileElement) throw new Error('Tile element not found');
    
    const rect = tileElement.getBoundingClientRect();
    const boardRect = board?.getBoundingClientRect();
    if (!boardRect) throw new Error('Board element not found');

    return {
        xPercent: ((rect.left - boardRect.left) + rect.width / 2) / boardRect.width * 100,
        yPercent: ((rect.top - boardRect.top) + rect.height / 2) / boardRect.height * 100
    };
}

function arrowOnHover(move: ValidMove) {
    if (!move.path || move.path.length < 2) return;

    const tileElement = getElementByPos(move.to);
    if (!tileElement) throw new Error('Tile element not found');

    const arrowElement = document.createElement('div');
    arrowElement.classList.add('move-arrow');
    board?.appendChild(arrowElement);
    const pathPoints = move.path.map(pos => {
        const {xPercent, yPercent} = getCenterOfTileElementPercentRelToBoard(pos);
        return {x: xPercent, y: yPercent};
    });

    const lineWidth = 2; // percentage width of the line
    const polygonPoints: string[] = [];

    // Create perpendicular offsets for each segment
    for (let i = 0; i < pathPoints.length; i++) {
        const current = pathPoints[i];
        let direction = {x: 0, y: 0};

        if (i === 0 && pathPoints.length > 1) {
            // First point: use direction to next point
            const next = pathPoints[i + 1];
            direction = {x: next.x - current.x, y: next.y - current.y};
        } else if (i === pathPoints.length - 1) {
            // Last point: use direction from previous point
            const prev = pathPoints[i - 1];
            direction = {x: current.x - prev.x, y: current.y - prev.y};
        } else {
            // Middle points: average direction of adjacent segments
            const prev = pathPoints[i - 1];
            const next = pathPoints[i + 1];
            const dirToPrev = {x: current.x - prev.x, y: current.y - prev.y};
            const dirToNext = {x: next.x - current.x, y: next.y - current.y};
            direction = {
                x: (dirToPrev.x + dirToNext.x) / 2,
                y: (dirToPrev.y + dirToNext.y) / 2
            };
        }

        // Normalize direction and create perpendicular
        const length = Math.sqrt(direction.x * direction.x + direction.y * direction.y);
        if (length > 0) {
            direction.x /= length;
            direction.y /= length;
        }

        // Perpendicular vector (rotate 90 degrees)
        const perpendicular = {x: -direction.y * lineWidth / 2, y: direction.x * lineWidth / 2};

        // Add points for both sides of the line
        const leftPoint = {x: current.x + perpendicular.x, y: current.y + perpendicular.y};
        const rightPoint = {x: current.x - perpendicular.x, y: current.y - perpendicular.y};

        if (i === 0) {
            polygonPoints.push(`${leftPoint.x}% ${leftPoint.y}%`);
            polygonPoints.unshift(`${rightPoint.x}% ${rightPoint.y}%`);
        } else {
            polygonPoints.unshift(`${rightPoint.x}% ${rightPoint.y}%`);
            polygonPoints.push(`${leftPoint.x}% ${leftPoint.y}%`);
        }
    }

    const points = polygonPoints.join(', ');

    arrowElement.style.clipPath = `polygon(${points})`;

    tileElement.addEventListener('mouseover', () => {
        arrowElement.classList.add('move-arrow-hover');
    });
    tileElement.addEventListener('mouseout', () => {
        arrowElement.classList.remove('move-arrow-hover');
    });
}