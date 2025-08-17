import { startSingleplayer } from './game/game';
import { init as netcodeInit} from './netcode/ws-ui';
import { init as configDialogInit } from './config-dialog';

netcodeInit();
configDialogInit();
document.getElementById('single-player')?.addEventListener('click', () => {
    document.getElementById('board-overlay')?.remove();
    startSingleplayer();
})