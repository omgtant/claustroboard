import { loadConfig } from "../config";
import { startMultiplayer } from "../game/game";
import {
	readInitialStateIntoGameState,
	validateNickname,
} from "../helpers/helpers";
import { hideError, showError } from "../helpers/showError";
import { logMessage } from "../render/render";
import { EventMap, InitialState, MoveDelta, Netcode } from "../types/types";
import { Pos } from "../types/util";
import { WebSocketManager } from "./lib";

export let netcode: Netcode = {
	gameCode: "",
	myNickname: "",
	players: [] as string[],
	ws: new WebSocketManager<EventMap>({
		heartbeatInterval: 10000,
		connectionTimeout: 60000,
		enableLogging: true,
	}),
};

function getNickname() {
	const nicknameEl: HTMLInputElement | null = document.getElementById(
		"nickname"
	) as HTMLInputElement | null;
	const err = document.getElementById("nickname-err");
	if (!err) throw Error("No error field");
	console.log("Nickname element:", nicknameEl);
	if (!nicknameEl) {
		err.textContent = "No nickname element";
		return;
	}
	const succError = validateNickname(nicknameEl.value);
	if (!succError[0]) {
		err.textContent = succError[1];
		return;
	}

	return { nickname: nicknameEl.value };
}

function getGameCode() {
	const gameCodeEl: HTMLInputElement | null = document.getElementById(
		"game-code"
	) as HTMLInputElement | null;
	if (!gameCodeEl) {
		throw new Error("No game code element found");
	}
	return gameCodeEl.value;
}

export function init() {
	const newGame = document.getElementById("new-game");
	if (newGame) newGame.addEventListener("click", newGameBtn);
	else throw new Error("No new game button found");

	const join: HTMLButtonElement = document.getElementById(
		"join"
	)! as HTMLButtonElement;
	if (join)
		join.addEventListener("click", () => {
			joinBtn();
			join.disabled = true;
			setTimeout(() => {
				join.disabled = false;
			}, 1000);
		});
	else throw new Error("No join button found");

	const searchQuery = new URLSearchParams(window.location.search);
	const gameCode = searchQuery.get("c");
	if (gameCode) {
		document.getElementById("game-code")!.setAttribute("value", gameCode);
	}
	const nickname = searchQuery.get("n");
	if (nickname) {
		document.getElementById("nickname")!.setAttribute("value", nickname);
	}
	if (gameCode && nickname) {
		if (searchQuery.get("start")) {
			joinGame(gameCode);
			console.log("Starting game automatically");
			document.getElementById("prep-stage")?.remove();
			netcode.ws.send("start", undefined);
		}
	}
}

function newGameBtn() {
	const plData = getNickname();
	if (!plData) return;

	(document.getElementById('new-game') as HTMLButtonElement).disabled = true;

	createGame(plData.nickname);
}

async function createGame(nickname: string) {
	netcode.ws.once("created", (data) => {
		netcode.gameCode = data.code;
		console.log("Game created with code:", netcode.gameCode);
		initPrepState();
	});

	const config = loadConfig();
	const configStr = `&config=${encodeURIComponent(JSON.stringify(config))}`;

	netcode.ws
		.connect(
			`/api/v1/start-game?nickname=${encodeURIComponent(
				nickname
			)}${configStr}`
		)
		.then(() => {
			netcode.myNickname = nickname;
		})
		.catch((error) => {
			console.error(error);
			showError("try again later");
		});
}
function joinBtn() {
	const gameCode = getGameCode();
	if (!gameCode) {
		console.warn("No game code provided");
		return;
	}

	joinGame(gameCode);
}

export async function joinGame(gameCode: string) {
	const plData = getNickname();
	if (!plData) return;
	const { nickname } = plData;

	netcode.ws
		.connect(
			`/api/v1/join/${encodeURIComponent(
				gameCode
			)}?nickname=${encodeURIComponent(nickname)}`
		)
		.then(() => {
			netcode.myNickname = nickname;
			netcode.gameCode = gameCode;
			hideError();
			initPrepState();
		})
		.catch((error) => {
			console.log(error);
			showError("game not found");
		});
}

function initPrepState() {
	document.getElementById("create-join")?.remove();
	document.getElementById("prep-stage")?.classList.remove("hidden");

	window.history.pushState({}, "", `/?c=${netcode.gameCode}`);

	const gameLinkEl = document.getElementById("game-link");
	if (gameLinkEl) {
		gameLinkEl.textContent = `${window.location.origin}/?c=${netcode.gameCode}`;
		gameLinkEl.setAttribute("href", gameLinkEl.textContent);
	} else {
		console.warn("No game code element found");
	}

	const copyBtn = document.getElementById("copy-link");
	if (copyBtn) {
		if (!navigator.clipboard) return;
		copyBtn.classList.remove("hidden");
		copyBtn.addEventListener("click", (e) => {
			e.preventDefault();
			navigator.clipboard.writeText(gameLinkEl?.textContent || "");
			copyBtn.querySelector(".hide-on-copy")?.classList.add("hidden");
			setTimeout(() => {
				copyBtn
					.querySelector(".hide-on-copy")
					?.classList.remove("hidden");
			}, 1000);
		});
	}

	const lobbySwitch = document
		.getElementById("prep-stage")
		?.querySelector(".lobby-switch");
	if (lobbySwitch) {
		let switchValue = (
			lobbySwitch.querySelector("input:checked") as HTMLInputElement
		)?.value;
		lobbySwitch.addEventListener("change", (e) => {
			const target = e.target as HTMLInputElement;
			if (target.name === "lobby-publicity") {
				netcode.ws
					.sendAndWait("lobby-publicity", target.value, {
						successEvent: "lobby-publicity-changed",
						errorEvent: "error",
					})
					.then((newPublicity: string) => {
						switchValue = newPublicity;
					})
					.catch(() => {
						showError("No permission to change lobby publicity");
						(
							lobbySwitch.querySelectorAll(
								'input[type="radio"]'
							) as NodeListOf<HTMLInputElement>
						).forEach((input: HTMLInputElement) => {
							input.checked = input.value === switchValue;
						});
					});
			}
		});
	}

	document.getElementById("start-btn")?.addEventListener("click", () => {
		netcode.ws
			.sendAndWait("start", undefined, {
				successEvent: "started",
				errorEvent: "error",
			})
			.catch(() => {
				showError("No permission to start the game");
			});
	});

	setUpReloadOnClose();
}

netcode.ws.on("playerlist-changed", (currentPlayers) => {
	console.log("Player list changed:", currentPlayers);
	const playerDelta = currentPlayers.filter(
		(nick) => !netcode.players.includes(nick)
	);
	if (playerDelta.length > 0) {
		logMessage(`Players joined: ${playerDelta.join(", ")}`);
	}
	const removedPlayers = netcode.players.filter(
		(nick) => !currentPlayers.includes(nick)
	);
	if (removedPlayers.length > 0) {
		logMessage(`Players left: ${removedPlayers.join(", ")}`);
	}
	netcode.players = currentPlayers;

	const playerListEl = document.getElementById("player-list");
	if (!playerListEl) {
		console.warn("No player list element found");
		return;
	}
	playerListEl.innerHTML = "";
	netcode.players.forEach((player) => {
		const playerEl = (
			(
				document.getElementById(
					"player-template"
				) as HTMLTemplateElement
			).content.cloneNode(true) as HTMLElement
		).querySelector(".player-entry") as HTMLElement;
		console.log("Player element:", playerEl);
		playerEl.querySelector(".nickname")!.textContent = player;
		playerEl.querySelector(".kick")!.addEventListener("click", () => {
			netcode.ws.send("kick", player);
		});
		playerListEl.appendChild(playerEl);
	});
});

netcode.ws.on("started", started);

let turnNumber = 0;
const afterMyMove = async (pos: Pos) => {
	console.log("After my move:", pos);
	return netcode.ws
		.sendAndWait(
			"my-move",
			{ turn: turnNumber, move: pos },
			{ successEvent: "they-moved", errorEvent: "error" }
		)
		.then(() => true)
		.catch(() => false);
};

function voteRematch(vote: boolean) {
	netcode.ws.send("vote-rematch", vote);
}

function started(data: InitialState) {
	const gameHandlers = startMultiplayer(
		readInitialStateIntoGameState(data),
		undefined,
		netcode.myNickname,
		afterMyMove,
		voteRematch
	);
	document.getElementById("prep-stage")?.remove();

	const theyMoved = (moveDelta: MoveDelta) => {
		console.log("They moved:", moveDelta);
		gameHandlers.otherMove(moveDelta.move);
		turnNumber = moveDelta.turn + 1;
	};
	netcode.ws.on("they-moved", theyMoved);

	let curPlayers = [...netcode.players]; // A copy because the other handler might run first
	const playerlistChanged = (newPlayers: string[]) => {
		const leftPlayers = curPlayers.filter(
			(nick) => !newPlayers.includes(nick)
		);
		leftPlayers.forEach((nick) => gameHandlers.playerLeft(nick));
		curPlayers = newPlayers;
	};
	netcode.ws.on("playerlist-changed", playerlistChanged);

	const rematchVotesChanged = (votedPlayers: string[]) => {
		gameHandlers.rematchVotesChanged(votedPlayers);
	};
	netcode.ws.on("rematch-votes-changed", rematchVotesChanged);

	const cleanup = () => {
		netcode.ws.off("they-moved", theyMoved);
		netcode.ws.off("playerlist-changed", playerlistChanged);
		netcode.ws.off("rematch-votes-changed", rematchVotesChanged);
		netcode.ws.off("started", cleanup);
	};

	setTimeout(() => {
		// Without the timeout, the cleanup function will be called immediately
		netcode.ws.on("started", cleanup);
	}, 0);
}

function setUpReloadOnClose() {
	netcode.ws.on("connection:close", () => {
		window.location.reload();
	});

	netcode.ws.on("close", () => {
		window.location.reload();
	});
}

netcode.ws.on("lobby-publicity-changed", (newPublicity: string) => {
	(
		document
			.getElementById("prep-stage")
			?.querySelector(`[value="${newPublicity}"]`) as HTMLInputElement
	).checked = true;
});
