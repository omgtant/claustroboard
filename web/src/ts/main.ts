import { init as netcodeInit } from "./netcode/ws-ui";
import { init as configDialogInit } from "./config-dialog";
import { singleplayerInit } from "./game/singleplayer";
import { showError } from "./helpers/showError";
try {
	netcodeInit();
	configDialogInit();
	singleplayerInit();
} catch (error) {
	showError(error.message || error);
}
