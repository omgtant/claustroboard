import { startSingleplayer } from './game/game';
import { init } from './netcode/ws-ui';

init();
document.getElementById('single-player')?.addEventListener('click', () => {
    document.getElementById('board-overlay')?.remove();
    startSingleplayer();
})