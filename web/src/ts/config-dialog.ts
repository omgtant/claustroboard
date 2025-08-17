import { Tile, TileSetup } from "./types/types";
import { TileColor } from "./types/util";

const dialogEl = document.getElementById('config-dialog') as HTMLDialogElement;
const closeBtn = document.getElementById('close-config-btn') as HTMLButtonElement;
const openBtn = document.getElementById('open-config-btn') as HTMLButtonElement;
const resetBtn = document.getElementById('reset-btn') as HTMLButtonElement;
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
        resetConfig();
    });

    resetConfig()
}

function resetConfig() {
    tileList.innerHTML = '';
    _getEveryTileType().forEach(tileType => {
        // @ts-ignore
        const tileConfig: HTMLElement = document.getElementById('tile-configuration')!.content.cloneNode(true).querySelector('.tile-row');
        tileConfig.dataset.tileType = JSON.stringify(tileType.tileSetup);
        tileConfig.querySelector('.tile')!.classList.add(...tileType.classes);
        tileConfig.querySelector('.count')!.textContent = tileType.defaultCount.toString();
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
    })
}