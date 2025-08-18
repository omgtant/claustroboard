import { getCountFor, getDefaultConfig, loadConfig, saveConfig } from "./config";
import { Tile, TileSetup } from "./types/types";
import { TileColor } from "./types/util";

//#region DOM Elements
const dialogEl = document.getElementById('config-dialog') as HTMLDialogElement;
const closeBtn = document.getElementById('close-config-btn') as HTMLButtonElement;
const openBtn = document.getElementById('open-config-btn') as HTMLButtonElement;
const resetBtn = document.getElementById('reset-btn') as HTMLButtonElement;
const saveBtn = document.getElementById('save-config-btn') as HTMLButtonElement;
const widthInput = document.getElementById('board-width') as HTMLInputElement;
const heightInput = document.getElementById('board-height') as HTMLInputElement;
const maxPlayerCountInput = document.getElementById('max-player-count') as HTMLInputElement;
const preset4x4 = document.getElementById('preset-4x4') as HTMLDivElement;
const preset6x6 = document.getElementById('preset-6x6') as HTMLDivElement;
const preset8x8 = document.getElementById('preset-8x8') as HTMLDivElement;
//#endregion

const tileList: HTMLDivElement = document.querySelector('.tile-list')!;
type TileType = {tileSetup: TileSetup, classes: string[], defaultCount: number}
function _getEveryTileType(): TileType[] {
    const colors = [0, 1, 2, 3, 4];
    const energy = [1, 2, 3, 4];
    const result:TileType[] = [];
    result.push(...energy.map((energy) => {
            return colors.map((color) => {
                return {
                    tileSetup: {tile_type: 'Layout', color: color, data: {energy: energy}},
                    classes: [`tile-layout-${energy}`, `tile-${TileColor[color]}`],
                    defaultCount:  color != 0 ? 1 : 0
                } as TileType
            });
        }).flat());
    const types = [['Teleport', 'tile-teleport'], ['Zero', 'tile-zero'], ['Wall', 'tile-closed']];
    result.push(...types.map(([name, className]) => {
        return colors.map((color) => {
            let count = 0;
            if (color != 0 || name === 'Teleport') count = 1;
            if (color != 0 && name === 'Wall') count = 2;
            return {
                tileSetup: {
                    tile_type: name,
                    color: color
                },
                classes: [className, `tile-${TileColor[color]}`],
                defaultCount: count
            } as TileType
        }) as TileType[];
    }).flat());
    result.push({
        tileSetup: {tile_type: 'Wildcard', color: 0},
        classes: ['tile-wildcard', 'tile-COLORLESS'],
        defaultCount: 3
    });

    return result;
}

export function init() {
    closeBtn.addEventListener('click', () => {
        dialogEl.close();
    });

    openBtn.addEventListener('click', () => {
        dialogEl.showModal();
    });

    resetBtn.addEventListener('click', () => {
        saveConfig(getDefaultConfig());
        readConfig();
    });

    saveBtn.addEventListener('click', () => {
        const config = loadConfig();
        config.width = parseInt(widthInput.value);
        config.height = parseInt(heightInput.value);
        config.maxPlayers = parseInt(maxPlayerCountInput.value);
        document.querySelectorAll('.tile-row').forEach((row) => {
            if (!(row instanceof HTMLElement)) return;
            if (!(row.dataset.tileType)) return;
            const tileType = JSON.parse(row.dataset.tileType);
            config.deck.push({
                tile: tileType,
                count: parseInt(row.querySelector('.count')!.textContent!) || 0
            })
        });
        saveConfig(config);
    });

    widthInput.addEventListener('input', updatePresetHighlights);
    heightInput.addEventListener('input', updatePresetHighlights);
    ["4", "6", "8"].forEach(size => {
        const preset = document.getElementById(`preset-${size}x${size}`) as HTMLDivElement;
        preset.addEventListener('click', () => {
            widthInput.value = size;
            heightInput.value = size;
            updatePresetHighlights();
        });
    });

    readConfig();
    updatePresetHighlights();
}

function readConfig() {
    tileList.innerHTML = '';
    const config = loadConfig();
    widthInput.value = config.width.toString();
    heightInput.value = config.height.toString();
    maxPlayerCountInput.value = config.maxPlayers.toString();
    _getEveryTileType().forEach(tileType => {
        // @ts-ignore
        const tileConfig: HTMLElement = document.getElementById('tile-configuration')!.content.cloneNode(true).querySelector('.tile-row');
        tileConfig.dataset.tileType = JSON.stringify(tileType.tileSetup);
        tileConfig.querySelector('.count')!.textContent = getCountFor(tileType.tileSetup, config)?.toString() || tileType.defaultCount.toString();

        tileConfig.querySelector('.tile')!.classList.add(...tileType.classes);
        tileConfig.querySelector('.left-btn')!.addEventListener('click', () => {
            tileType.defaultCount = Math.max(0, tileType.defaultCount - 1);
            tileConfig.querySelector<HTMLButtonElement>('.left-btn')!.disabled = tileType.defaultCount === 0;
            tileConfig.querySelector<HTMLButtonElement>('.right-btn')!.disabled = tileType.defaultCount === 99;
            tileConfig.querySelector('.count')!.textContent = tileType.defaultCount.toString();
        });
        tileConfig.querySelector('.right-btn')!.addEventListener('click', () => {
            tileType.defaultCount = Math.min(99, tileType.defaultCount + 1);
            tileConfig.querySelector<HTMLButtonElement>('.left-btn')!.disabled = tileType.defaultCount === 0;
            tileConfig.querySelector<HTMLButtonElement>('.right-btn')!.disabled = tileType.defaultCount === 99;
            tileConfig.querySelector('.count')!.textContent = tileType.defaultCount.toString();
        });
        // @ts-ignore
        tileConfig.querySelector('.left-btn')?.firstChild!.classList.add(`tile-${TileColor[tileType.tileSetup.color!]}`);
        // @ts-ignore        
        tileConfig.querySelector('.right-btn')?.firstChild!.classList.add(`tile-${TileColor[tileType.tileSetup.color!]}`);

        tileList?.appendChild(tileConfig);
    });
}

function updatePresetHighlights() {
    if (widthInput.value === "4" && heightInput.value === "4") {
        preset4x4.classList.add('highlight');
    } else {
        preset4x4.classList.remove('highlight');
    }

    if (widthInput.value === "6" && heightInput.value === "6") {
        preset6x6.classList.add('highlight');
    } else {
        preset6x6.classList.remove('highlight');
    }

    if (widthInput.value === "8" && heightInput.value === "8") {
        preset8x8.classList.add('highlight');
    } else {
        preset8x8.classList.remove('highlight');
    }
}
