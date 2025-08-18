import { Config, DeckElement, TileSetup } from "./types/types";

export function getDefaultConfig(): Config {
    return {
        version: 1,
        width: 4,
        height: 4,
        maxPlayers: 10,
        deck: getDefaultDeck()
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
    if (!deckElement) {
        throw new Error(`Tile not found in deck: ${JSON.stringify(tileSetup)}`);
    }
    return deckElement.count;
}

export function saveConfig(config: Config) {
    // Check that deck is sufficiently large for the board
    const totalTiles = config.width * config.height;
    const deckSize = config.deck.reduce((sum, element) => {
        console.log(sum, element);
        return sum + (element.count ?? Infinity);
    }, 0);
    if (deckSize < totalTiles) {
        throw new Error(`Deck is too small: ${deckSize} < ${totalTiles}`);
    }
    localStorage.setItem('gameConfig', JSON.stringify(config));
}

export function compareTileSetup(a: TileSetup, b: TileSetup): boolean {
    return a.tile_type === b.tile_type && a.color === b.color && JSON.stringify(a.data) === JSON.stringify(b.data);
}

/**
 * Returns a list of all tile setups available in the game (no UI concerns, no counts).
 */
export function generateAllTileSetups(): TileSetup[] {
    const colors = [0, 1, 2, 3, 4];
    const energy = [1, 2, 3, 4];

    const layouts: TileSetup[] = energy
        .map(e => colors.map(color => ({ tile_type: 'Layout', color, data: { energy: e } } as TileSetup)))
        .flat();

    const typed: TileSetup[] = ([
        'Teleport',
        'Zero',
        'Wall',
    ] as const)
        .map(name => colors.map(color => ({ tile_type: name, color } as TileSetup)))
        .flat();

    const wildcard: TileSetup = { tile_type: 'Wildcard', color: 0 };

    return [...layouts, ...typed, wildcard];
}

/**
 * Provides the default deck count for a given tile setup.
 * Mirrors the previous UI logic so there is a single source of truth.
 */
export function getDefaultCountFor(tile: TileSetup): number {
    const color = tile.color ?? 0;
    switch (tile.tile_type) {
        case 'Layout':
            // energy is in tile.data.energy (1..4); defaults depend only on color
            return color !== 0 ? 1 : 0;
        case 'Teleport':
            return 1; // regardless of color
        case 'Zero':
            return color !== 0 ? 1 : 0;
        case 'Wall':
            return color !== 0 ? 2 : 0;
        case 'Wildcard':
            return 3; // colorless
        default:
            return 0;
    }
}

/**
 * Builds the default deck with all tile setups and their default counts.
 */
export function getDefaultDeck(): DeckElement[] {
    return generateAllTileSetups().map(tile => ({ tile, count: getDefaultCountFor(tile) }));
}
