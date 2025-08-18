import { Config, TileSetup } from "./types/types";

export function getDefaultConfig(): Config {
    return {
        version: 1,
        width: 4,
        height: 4,
        maxPlayers: 10,
        deck: [],
        userDefined: false
    };
}

/**
 * Returns the config stored in localstorage.
 * If the config there is too old or doesn't exist, it returns a default config.
 */
export function loadConfig(): Config {
    const storedConfig = localStorage.getItem('gameConfig');
    if (storedConfig) {
        const parsedConfig = JSON.parse(storedConfig) as Config;
        if (parsedConfig.version === 1) {
            return parsedConfig;
        }
    }
    return getDefaultConfig();
}

export function getCountFor(tileSetup: TileSetup, config: Config): number | undefined {
    const deckElement = config.deck.find(element => compareTileSetup(element.tile, tileSetup));
    return deckElement?.count;
}

export function saveConfig(config: Config) {
    config.userDefined = true;
    localStorage.setItem('gameConfig', JSON.stringify(config));
}

export function compareTileSetup(a: TileSetup, b: TileSetup): boolean {
    return a.tile_type === b.tile_type && a.color === b.color && JSON.stringify(a.data) === JSON.stringify(b.data);
}
