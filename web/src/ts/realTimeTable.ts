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
    maxReconnectAttempts: 3
});

export default function init() {
    connect();
    rttwsManager.on('update', updateTable);
}

function connect() {
    rttwsManager.connect(`ws://${window.location.host}/api/v1/public-games`).catch(err => {
        showError("couldn't show the public games");
        updateTable(null);
    });
}

function updateTable(games: Game[] | null) {
    // Clear the existing table rows
    realTimeTable.querySelector('tbody')!.innerHTML = '';

    if (!games) {
        // If no games are available, show a message or handle accordingly
        const row = realTimeTable.insertRow();
        const cell = row.insertCell(0);
        cell.className = 'text-center text-gray-200 h-24';
        cell.colSpan = 4;
        cell.innerText = "No public games available";
        return;
    }

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