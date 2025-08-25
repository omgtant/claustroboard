import { showError } from "./helpers/showError";
import { WebSocketManager } from "./netcode/lib";
import { joinGame } from "./netcode/ws-ui";
import { Config } from "./types/types";

type Game = {
    code: string;
    players: number;
    config: Config;
    host: string;
}

interface RTTEventMap {
    'update': Game[];
}

const realTimeTableBody = document.getElementById("real-time-table")?.querySelector('tbody')!;
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

let oldGameCodes: string[] = [];
function updateTable(games: Game[] | null) {
	if (!games || games.length === 0) {
		// If no games are available, clear body and show message
		realTimeTableBody.innerHTML = "";

		const row = realTimeTableBody.insertRow();
		const cell = row.insertCell(0);
		cell.className = "text-center text-gray-200 h-24";
		cell.colSpan = 4;
		cell.innerText = "No public games available";
		return;
	}

	// Remove all elements that don't have data-code set
	const withoutCode = Array.from(
		realTimeTableBody.querySelectorAll("tr")
	).filter((row) => !row.dataset.code);
	withoutCode.forEach((row) => {
		row.remove();
	});


	// Remove deleted games
	const toDelete = oldGameCodes.filter(
		(code) => !games.some((game) => game.code === code)
	);
	toDelete.forEach((code) => {
		const row: HTMLTableRowElement | null = realTimeTableBody.querySelector(
			`tr[data-code="${code}"]`
		);
		if (row) {
			row.remove();
		}
	});

	// Add new games and update existing
	games.forEach((game) => {
		if (oldGameCodes.includes(game.code)) {
            const row: HTMLTableRowElement | null = realTimeTableBody.querySelector(
                `tr[data-code="${game.code}"]`
            );
            if (row) {
                row.deleteCell(1);
                row.insertCell(1).innerText = `${game.players}/${game.config.maxPlayers}`;
            }
            return;
        }

		oldGameCodes.push(game.code);

		const row = realTimeTableBody.insertRow();
		row.dataset.code = game.code;
		row.insertCell(0).innerText = game.host;
		row.insertCell(1).innerText = `${game.players}/${game.config.maxPlayers}`;
		row.insertCell(
			2
		).innerText = `${game.config.width}x${game.config.height}`;
		const cell = row.insertCell(3);
		const joinBtn = (
			joinBtnTemplate.content.cloneNode(true) as HTMLElement
		).querySelector("button")!;
		cell.appendChild(joinBtn);
		joinBtn.addEventListener("click", () => {
			joinGame(game.code);
		});
	});
}