import { startMultiplayer } from "../game/game";
import { readInitialStateIntoGameState, validateNickname } from "../helpers/helpers";
import { logMessage } from "../render/render";
import { EventMap, InitialState, MoveDelta, Netcode } from "../types/types";
import { Pos } from "../types/util";
import { WebSocketManager } from "./lib";


export let netcode: Netcode = {
    gameCode: '',
    myNickname: '',
    players: [] as string[],
    ws: new WebSocketManager<EventMap>({heartbeatInterval: 10000, connectionTimeout: 60000, enableLogging: true})
};

function getNickname() {
    const nicknameEl: HTMLInputElement | null = document.getElementById('nickname') as (HTMLInputElement | null);
    const err = document.getElementById('nickname-err')
    if (!err) throw Error('No error field');
    console.log('Nickname element:', nicknameEl);
    if (!nicknameEl) {
        err.textContent = 'No nickname element';
        return;
    }
    const succError = validateNickname(nicknameEl.value);
    if (!succError[0]) {
        err.textContent = succError[1];
        return;
    }

    return {nickname: nicknameEl.value};
}

function getGameCode() {
    const gameCodeEl: HTMLInputElement | null = document.getElementById('game-code') as (HTMLInputElement | null);
    if (!gameCodeEl) {
        throw new Error('No game code element found');
    }
    return gameCodeEl.value;
}

export function init() {
    const newGame = document.getElementById('new-game');
    if (newGame) newGame.addEventListener('click', newGameBtn);
    else throw new Error('No new game button found');

    const join = document.getElementById('join');
    if (join) join.addEventListener('click', joinBtn);
    else throw new Error('No join button found');

    const searchQuery = new URLSearchParams(window.location.search);
    const gameCode = searchQuery.get('c');
    if (gameCode) {
        document.getElementById('game-code')!.setAttribute('value', gameCode);
    }
    const nickname = searchQuery.get('n');
    if (nickname) {
        document.getElementById('nickname')!.setAttribute('value', nickname);
    }
    if (gameCode && nickname) {
        if (searchQuery.get('start')) {
            joinGame(nickname, gameCode);
            console.log('Starting game automatically');
            document.getElementById('prep-stage')?.remove();
            netcode.ws.send('start', undefined);
        }
    }
}

function newGameBtn() {
    const plData = getNickname();
    if (!plData) return;

    createGame(plData.nickname);
}


async function createGame(nickname: string) {
    netcode.ws.on('created', (data) => {
        netcode.gameCode = data.code;
        console.log('Game created with code:', netcode.gameCode);
        initPrepState();
    })

    netcode.ws.connect(`/api/v1/start-game?nickname=${encodeURIComponent(nickname)}`).then(() => {
        netcode.myNickname = nickname;
    });
}
function joinBtn() {
    const plData = getNickname();
    if (!plData) return;

    const gameCode = getGameCode();
    if (!gameCode) {
        console.warn('No game code provided');
        return;
    }

    joinGame(plData.nickname, gameCode);
}

async function joinGame(nickname: string, gameCode: string) {
    netcode.ws.connect(`/api/v1/join/${encodeURIComponent(gameCode)}?nickname=${encodeURIComponent(nickname)}`).then(() => {
        netcode.myNickname = nickname;
        netcode.gameCode = gameCode;
        initPrepState();
    })
}

function initPrepState() {
    document.getElementById('create-join')?.remove();
    document.getElementById('prep-stage')?.classList.remove('hidden');

    window.history.pushState({}, '', `/?c=${netcode.gameCode}`);

    const gameLinkEl = document.getElementById('game-link');
    if (gameLinkEl) {
        gameLinkEl.textContent = `${window.location.origin}/?c=${netcode.gameCode}`;
        gameLinkEl.setAttribute('href', gameLinkEl.textContent);
    } else {
        console.warn('No game code element found');
    }

    const copyBtn = document.getElementById('copy-link');
    if (copyBtn) {
        if (!navigator.clipboard) return;
        copyBtn.classList.remove('hidden');
        copyBtn.addEventListener('click', (e) => {
            e.preventDefault();
            navigator.clipboard.writeText(gameLinkEl?.textContent || '');
            copyBtn.querySelector('.hide-on-copy')?.classList.add('hidden');
            setTimeout(() => {
                copyBtn.querySelector('.hide-on-copy')?.classList.remove('hidden');
            }, 1000);
        });
    }

    document.getElementById('start-btn')?.addEventListener('click', () => {
        netcode.ws.send('start', undefined);
    });
}

netcode.ws.on('playerlist-changed', (currentPlayers) => {
    console.log('Player list changed:', currentPlayers);
    const playerDelta = currentPlayers.filter(nick => !netcode.players.includes(nick));
    if (playerDelta.length > 0) {
        logMessage(`Players joined: ${playerDelta.join(', ')}`);
    }
    const removedPlayers = netcode.players.filter(nick => !currentPlayers.includes(nick));
    if (removedPlayers.length > 0) {
        logMessage(`Players left: ${removedPlayers.join(', ')}`);
    }
    netcode.players = currentPlayers;

    const playerListEl = document.getElementById('player-list');
    if (!playerListEl) {
        console.warn('No player list element found');
        return;
    }
    playerListEl.innerHTML = '';
    netcode.players.forEach((player) => {
        const playerEl = ((document.getElementById('player-template') as HTMLTemplateElement).content.cloneNode(true) as HTMLElement).querySelector('.player-entry') as HTMLElement;
        console.log('Player element:', playerEl);
        playerEl.querySelector('.nickname')!.textContent = player;
        playerEl.querySelector('.kick')!.addEventListener('click', () => {
            alert(`Kick player ${player} not implemented yet`);
        });
        playerListEl.appendChild(playerEl);
    });
});

netcode.ws.on('started', start);

let turnNumber = 0;
const afterMyMove = async (pos: Pos) => {
    console.log('After my move:', pos);
    return new Promise<boolean>((resolve) => {
        netcode.ws.send('my-move', {turn: turnNumber, delta: [pos]});
        const onError = () => {
            netcode.ws.off('error', onError);
            resolve(false);
        }
        const onTheyMoved = () => {
            netcode.ws.off('they-moved', onTheyMoved);
            resolve(true);
        }
        netcode.ws.on('error', onError);
        netcode.ws.on('they-moved', onTheyMoved);
    });
}

function start(data: InitialState) {
    const gameHandlers = startMultiplayer(readInitialStateIntoGameState(data), undefined, netcode.myNickname, afterMyMove);
    document.getElementById('prep-stage')?.remove();
    
    netcode.ws.on('they-moved', (moveDelta: MoveDelta) => {
        console.log('They moved:', moveDelta);
        moveDelta.delta.forEach((pos) => {
            gameHandlers.otherMove(pos);
        });
        turnNumber = moveDelta.turn+1;
    });
}