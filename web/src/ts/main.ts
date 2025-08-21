import { startSingleplayer } from "./game/game";
import { init as netcodeInit } from "./netcode/ws-ui";
import { init as configDialogInit } from "./config-dialog";
import { createStateFromConfig } from "./game/singleplayer";
import { readInitialStateIntoGameState } from "./helpers/helpers";
import { showError } from "./helpers/showError";
try {
	netcodeInit();
	configDialogInit();
	document.getElementById("single-player")?.addEventListener("click", () => {
		try {
			const playerCount = parseInt(
				(
					document.getElementById(
						"player-count-singleplayer"
					) as HTMLInputElement
				).value
			);
			if (isNaN(playerCount)) throw Error("Invalid player count");
			if (playerCount <= 1) throw Error("Number of players must be greater than 1");
			document.getElementById("board-overlay")?.remove();
			startSingleplayer(
				readInitialStateIntoGameState(
					createStateFromConfig(playerCount)
				)
			);
		} catch (error) {
			showError(error.message || error);
		}
	});
} catch (error) {
	showError(error.message || error);
}
