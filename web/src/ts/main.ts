import { init as netcodeInit } from "./netcode/ws-ui";
import { init as configDialogInit } from "./config-dialog";
import { singleplayerInit } from "./game/singleplayer";
import { showError } from "./helpers/showError";
import bgInit from "./prettyBg"
import rttInit from "./realTimeTable"
import { initFeedbackDialog as feedbackDialogInit } from "./feedback-dialog";
import { arrowCanvasInit } from "./render/arrowCanvas";
try {
	netcodeInit();
	configDialogInit();
	feedbackDialogInit();
	singleplayerInit();
	bgInit();
	rttInit();
	arrowCanvasInit();
} catch (error) {
	showError(error.message || error);
}
