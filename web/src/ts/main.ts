import { init as netcodeInit } from "./netcode/ws-ui";
import { init as configDialogInit } from "./config-dialog";
import { singleplayerInit } from "./game/singleplayer";
import { showError } from "./helpers/showError";
import bgInit from "./prettyBg"
import { initFeedbackDialog as feedbackDialogInit } from "./feedback-dialog";
try {
	netcodeInit();
	configDialogInit();
	feedbackDialogInit();
	singleplayerInit();
	bgInit();
} catch (error) {
	showError(error.message || error);
}
