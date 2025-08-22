import { getCountFor, getDefaultConfig, loadConfig, saveConfig, generateAllTileSetups, getDefaultCountFor } from "./config";
import { Config, LobbyPublicity, Tile, TileSetup } from "./types/types";
import { TileColor } from "./types/util";

//#region DOM Elements
const dialogEl = document.getElementById('config-dialog') as HTMLDialogElement;
const closeBtn = document.getElementById('close-config-btn') as HTMLButtonElement;
const openBtn = document.getElementById('open-config-btn') as HTMLButtonElement;
const exportBtn = document.getElementById('export-config-btn') as HTMLButtonElement;
const importBtn = document.getElementById('import-config-input') as HTMLInputElement;
const resetBtn = document.getElementById('reset-btn') as HTMLButtonElement;
const allZerosBtn = document.getElementById('set-zeros') as HTMLButtonElement;
const saveBtn = document.getElementById('save-config-btn') as HTMLButtonElement;
const widthInput = document.getElementById('board-width') as HTMLInputElement;
const heightInput = document.getElementById('board-height') as HTMLInputElement;
const maxPlayerCountInput = document.getElementById('max-player-count') as HTMLInputElement;
const preset4x4 = document.getElementById('preset-4x4') as HTMLDivElement;
const preset6x6 = document.getElementById('preset-6x6') as HTMLDivElement;
const preset8x8 = document.getElementById('preset-8x8') as HTMLDivElement;
const error = document.querySelector('.error-message') as HTMLParagraphElement;
//#endregion

const tileList: HTMLDivElement = document.querySelector('.tile-list')!;
type TileType = {tileSetup: TileSetup, classes: string[], defaultCount: number}
function _getEveryTileType(): TileType[] {
    // Build purely from shared game config logic; this function only adds UI classes.
    return generateAllTileSetups().map(tileSetup => {
        const classes: string[] = [];
        switch (tileSetup.tile_type) {
            case 'Layout':
                classes.push(`tile-layout-${tileSetup.data?.energy}`);
                break;
            case 'Teleport':
                classes.push('tile-teleport');
                break;
            case 'Zero':
                classes.push('tile-zero');
                break;
            case 'Wall':
                classes.push('tile-closed');
                break;
            case 'Wildcard':
                classes.push('tile-wildcard');
                break;
        }
        classes.push(`tile-${TileColor[tileSetup.color ?? -1]}`);

        return {
            tileSetup,
            classes,
            defaultCount: getDefaultCountFor(tileSetup)
        } as TileType;
    });
}

export function init() {
    closeBtn.addEventListener('click', () => {
        dialogEl.close();
    });

    openBtn.addEventListener('click', () => {
        dialogEl.showModal();
    });

    resetBtn.addEventListener('click', () => {
        readConfig(getDefaultConfig());
    });

    allZerosBtn.addEventListener('click', () => {
        Array.from(document.querySelectorAll('.tile-row')).forEach(row => {
            if (!(row instanceof HTMLElement)) return;
            row.dataset.count = '0';
            row.querySelector('.count')!.textContent = '0';
        });
    });

    saveBtn.addEventListener('click', () => {
        try {
            const config = getCurrentConfig();
            saveConfig(config);
            error.textContent = '';
            saveBtn.classList.add('success-btn');
            setTimeout(() => {
                saveBtn.classList.remove('success-btn');
            }, 2000);
        } catch (err) {
            error.textContent = err.message;
        }
    });

    exportBtn.addEventListener('click', exportConfig);

    importBtn.addEventListener('change', (event) => {
        const file = (event.target as HTMLInputElement).files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const config = JSON.parse(e.target?.result as string);
                readConfig(config);
                alert("Success! Don't forget to Save.");
            };
            reader.readAsText(file);
        }
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

function readConfig(config: Config = loadConfig()) {
    tileList.innerHTML = '';
    widthInput.value = config.width.toString();
    heightInput.value = config.height.toString();
    maxPlayerCountInput.value = config.maxPlayers.toString();
    console.log(config.publicity);
    (dialogEl.querySelector(`input[value=${config.publicity}]`)! as HTMLInputElement).checked = true
    _getEveryTileType().forEach(tileType => {
        // @ts-ignore
        const tileConfig: HTMLElement = document.getElementById('tile-configuration')!.content.cloneNode(true).querySelector('.tile-row');
        const count: HTMLParagraphElement = tileConfig.querySelector('.count')!;
        tileConfig.dataset.tileType = JSON.stringify(tileType.tileSetup);
        try {
            tileConfig.dataset.count = getCountFor(tileType.tileSetup, config)?.toString() ?? '?';
        } catch (err) {
            tileConfig.dataset.count = tileType.defaultCount.toString() ?? '0';
        }
        count!.textContent = tileConfig.dataset.count;
        tileConfig.querySelector('.tile')!.classList.add(...tileType.classes);
        tileConfig.querySelector('.left-btn')!.addEventListener('click', () => {
            tileConfig.dataset.count = Math.max(-1, parseInt(tileConfig.dataset.count!) - 1).toString();
            if (tileConfig.dataset.count === '-1') tileConfig.dataset.count = '?';
            tileConfig.querySelector<HTMLButtonElement>('.left-btn')!.disabled = tileConfig.dataset.count === '?';
            tileConfig.querySelector<HTMLButtonElement>('.right-btn')!.disabled = tileConfig.dataset.count === '99';
            count!.textContent = tileConfig.dataset.count;
        });
        tileConfig.querySelector('.right-btn')!.addEventListener('click', () => {
            if (tileConfig.dataset.count === '?') {
                tileConfig.dataset.count = '-1';
            }
            tileConfig.dataset.count = Math.min(99, parseInt(tileConfig.dataset.count!) + 1).toString();
            tileConfig.querySelector<HTMLButtonElement>('.left-btn')!.disabled = tileConfig.dataset.count === '?';
            tileConfig.querySelector<HTMLButtonElement>('.right-btn')!.disabled = tileConfig.dataset.count === '99';
            count!.textContent = tileConfig.dataset.count;
        });
        count!.addEventListener('focusout', (e) => {
            count!.textContent = count!.textContent!.replace(/[^0-9]/g, "");
            if (parseInt(count!.textContent!) > 99) {
                count!.textContent = '99';
            }
            if (parseInt(count!.textContent!) < 0) {
                count!.textContent = '?';
            }
            if (count!.textContent === '') {
                count!.textContent = '0';
            }
            tileConfig.dataset.count = count!.textContent!;
        });
        // @ts-ignore
        tileConfig.querySelector('.left-btn')?.firstChild!.classList.add(`tile-${TileColor[tileType.tileSetup.color ?? -1]}`);
        // @ts-ignore
        tileConfig.querySelector('.right-btn')?.firstChild!.classList.add(`tile-${TileColor[tileType.tileSetup.color ?? -1]}`);

        tileList?.appendChild(tileConfig);
    });
    updatePresetHighlights();
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

function getCurrentConfig() {
    const config = loadConfig();
	config.width = parseInt(widthInput.value);
	config.height = parseInt(heightInput.value);
	config.maxPlayers = parseInt(maxPlayerCountInput.value);
    config.publicity = (dialogEl.querySelector('input[name="lobby-publicity"]:checked') as HTMLInputElement).value as LobbyPublicity;
	config.deck = Array.from(document.querySelectorAll(".tile-row")).map(
		(row) => {
			if (!(row instanceof HTMLElement)) return;
			if (!row.dataset.tileType) return;
			const tileType = JSON.parse(row.dataset.tileType);
			try {
				return {
					tile: tileType,
					count: parseInt(row.dataset.count!) ?? undefined,
				};
			} catch (err) {
				error.textContent = err.message;
			}
		}
	) as { tile: TileSetup; count: number | undefined }[];
    return config;
}

function exportConfig() {
	const config = getCurrentConfig();
	const json = JSON.stringify(config, null, 2);
	const blob = new Blob([json], { type: "application/json" });
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = "config.json";
	a.click();
	URL.revokeObjectURL(url);
}
