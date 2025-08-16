import { Player, ValidMove } from "../types/types";
import { board, getElementByPos } from "./render";

let animationsFromNicknames: Record<string, Animation[]> = {};

function cancelAnimationsForPlayer(nickname: string) {
    const animations = animationsFromNicknames[nickname];
    if (animations) {
        animations.forEach(anim => anim.cancel());
        delete animationsFromNicknames[nickname];
    }
}

function addAnimationForPlayer(nickname: string, animation: Animation) {
    if (!animationsFromNicknames[nickname]) {
        animationsFromNicknames[nickname] = [];
    }
    animationsFromNicknames[nickname].push(animation);
}

function FLIPMove(player: Player, move: ValidMove) {
    if (!board) throw new Error('Board element not found');
    
    const playerElement:HTMLElement | null = getPlayerElement(player.nickname);
    if (!playerElement) throw new Error('Player element not found');
    cancelAnimationsForPlayer(player.nickname);

    const playerRect = playerElement.getBoundingClientRect();

    if (!move.path) throw new Error('Move path is undefined');

    const tileEls = move.path?.map(getElementByPos);
    const positions = tileEls.map(el => {
        if (!el) throw new Error('Tile element not found');
        const rect = el.getBoundingClientRect();
        return {
            x: rect.x + rect.width / 2 - playerRect.width / 2,
            y: rect.y + rect.height / 2 - playerRect.height / 2
        };
    });

    const animations = positions.map((pos, index) => {
        const dX = playerRect.x - pos.x;
        const dY = playerRect.y - pos.y;
        return {transform: `translate(${-dX}px, ${-dY}px)`};
    });
    
    // playerElement.classList.remove('player-highlight');
    const anim = playerElement.animate(animations, {
        duration: 200 * positions.length,
        easing: 'ease-in-out',
        fill: 'forwards',
        composite: 'add'
    });
    addAnimationForPlayer(player.nickname, anim);
}

export function getPlayerElement(nickname: string): HTMLElement | null {
    if (!board) throw new Error('Board element not found');
    const playerElement = board.querySelector(`[data-player-nickname="${nickname}"]`);
    if (!playerElement) {
        console.warn(`Player element for ${nickname} not found`);
    }
    return playerElement as HTMLElement | null;
}

function FLIPPlayerBegin(player: Player) {
    const playerElement:HTMLElement | null = getPlayerElement(player.nickname);
    if (!playerElement) throw new Error('Player element not found');

    const rect = playerElement.getBoundingClientRect();
    playerElement.dataset.oldX = rect.x.toString();
    playerElement.dataset.oldY = rect.y.toString();
}

function FLIPPlayerEnd(player: Player) {
    const playerElement:HTMLElement | null = getPlayerElement(player.nickname);
    if (!playerElement) throw new Error('Player element not found');

    const newRect = playerElement.getBoundingClientRect();

    const oldX = playerElement.dataset.oldX;
    const oldY = playerElement.dataset.oldY;

    const dX = newRect.x - parseFloat(oldX || '0');
    const dY = newRect.y - parseFloat(oldY || '0');

    playerElement.animate([
        { transform: `translate(${-dX}px, ${-dY}px)` },
        { transform: 'translate(0, 0)' }
    ], {
        duration: 300,
        easing: 'ease-in-out'
    });
}

export function _movePlayer(turnNumber:number, player: Player, move: ValidMove) {
    const playerElement = getPlayerElement(player.nickname);
    if (!playerElement) throw new Error('Player element not found');
    
    const tileElement = getElementByPos(move.to);
    if (tileElement?.parentElement?.parentElement) {
        if (!move.path) FLIPPlayerBegin(player);
        tileElement.parentElement.parentElement.appendChild(playerElement);
        if (!move.path) FLIPPlayerEnd(player);
        if (move.path) FLIPMove(player, move);
    }
}
