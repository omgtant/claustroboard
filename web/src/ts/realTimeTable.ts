import { showError } from "./helpers/showError";
import { WebSocketManager } from "./netcode/lib";
import { joinGame } from "./netcode/ws-ui";
import { Config } from "./types/types";

type Game = {
    code: string;
    players: number;
    config: Config;
}

interface RTTEventMap {
    'update': Game[];
}

const realTimeTable = document.getElementById("real-time-table") as HTMLTableElement;
const joinBtnTemplate = document.getElementById("join-btn-template") as HTMLTemplateElement;

const rttwsManager = new WebSocketManager<RTTEventMap>({
    heartbeatInterval: 10000,
    connectionTimeout: 60000,
    enableLogging: true,
    maxReconnectAttempts: 10
});

export default function init() {
    connect();
    rttwsManager.on('update', updateTable);
}

function connect() {
    rttwsManager.connect(`ws://${window.location.host}/api/v1/public-games`).catch(err => {
        showError("couldn't show the public games");
    });
}

function updateTable(games: Game[]) {
    // Clear the existing table rows
    realTimeTable.querySelector('tbody')!.innerHTML = '';

    // Populate the table with the updated game data
    games.forEach(game => {
        const row = realTimeTable.insertRow();
        row.insertCell(0).innerText = game.code;
        row.insertCell(1).innerText = game.players.toString();
        row.insertCell(2).innerText = JSON.stringify(game.config);
        const cell = row.insertCell(3);
        const joinBtn = (joinBtnTemplate.content.cloneNode(true) as HTMLElement).querySelector('button')!;
        cell.appendChild(joinBtn);
        joinBtn.addEventListener('click', () => {
            joinGame(game.code);
        });
    });
}