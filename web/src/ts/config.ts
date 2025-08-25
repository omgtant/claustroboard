import { Config, DeckElement, LobbyPublicity, TileSetup } from "./types/types";

export function getDefaultConfig(): Config {
	return {
		version: 2,
		publicity: LobbyPublicity.Public,
		width: 6,
		height: 6,
		maxPlayers: 10,
		deck: getDefaultDeck(),
	};
}

/**
 * Centralized validation for Config. Throws on invalidity.
 */
export function validateConfig(config: Config): void {
	if (config.version !== 2) {
		throw new Error(`Unsupported config version: ${config.version}`);
	}
	const isPosInt = (n: number) => Number.isInteger(n) && n > 0;
	if (!isPosInt(config.width) || !isPosInt(config.height)) {
		throw new Error("Board dimensions must be positive integers.");
	}
	if (!Number.isInteger(config.maxPlayers) || config.maxPlayers <= 0) {
		throw new Error("maxPlayers must be a positive integer.");
	}
	if (!Array.isArray(config.deck)) {
		throw new Error("Deck must be an array.");
	}
	// Validate lobby publicity
	if (!Object.values(LobbyPublicity).includes(config.publicity)) {
		throw new Error(`Invalid lobby publicity: ${config.publicity}`);
	}
	// Range-specific validations
	validateMaxPlayersRange(config);
	validateBoardSizeLimits(config);
	for (const element of config.deck) {
		if (element.count !== undefined) {
			if (Number.isNaN(element.count) || element.count < 0) {
				throw new Error(
					`${element.tile.tile_type} tile count must be a non-negative number or undefined.`
				);
			}
		}
	}
	const totalTiles = config.width * config.height;
	const deckSize = config.deck.reduce((sum, element) => {
		return sum + (element.count ?? Infinity);
	}, 0);
	if (deckSize < totalTiles) {
		throw new Error(`Deck is too small: ${deckSize} < ${totalTiles}`);
	}
}

/**
 * Ensure maxPlayers is within [2, 10].
 */
function validateMaxPlayersRange(config: Config): void {
	if (config.maxPlayers < 2 || config.maxPlayers > 10) {
		throw new Error("maxPlayers must be between 2 and 10.");
	}
}

/**
 * Ensure board dimensions do not exceed 10 in each axis.
 */
function validateBoardSizeLimits(config: Config): void {
	if (config.width > 10 || config.height > 10) {
		throw new Error("Board dimensions cannot exceed 10x10.");
	}
}

/**
 * Returns the config stored in localstorage.
 * If the config there is too old or doesn't exist, it returns a default config.
 */
export function loadConfig(): Config {
	const storedConfig = localStorage.getItem("gameConfig");
	if (storedConfig) {
		try {
			const parsedConfig = JSON.parse(storedConfig) as Config;
			validateConfig(parsedConfig);
			return parsedConfig;
		} catch (err) {
			console.warn(
				"Invalid stored config found. Replacing with default.",
				err
			);
		}
	}
	return getDefaultConfig();
}

export function getCountFor(
	tileSetup: TileSetup,
	config: Config
): number | undefined {
	const deckElement = config.deck.find((element) =>
		compareTileSetup(element.tile, tileSetup)
	);
	if (!deckElement) {
		throw new Error(`Tile not found in deck: ${JSON.stringify(tileSetup)}`);
	}
	return deckElement.count;
}

export function saveConfig(config: Config) {
	validateConfig(config); // throws on invalidity; let it propagate
	localStorage.setItem("gameConfig", JSON.stringify(config));
}

export function compareTileSetup(a: TileSetup, b: TileSetup): boolean {
	return (
		a.tile_type === b.tile_type &&
		a.color === b.color &&
		JSON.stringify(a.data) === JSON.stringify(b.data)
	);
}

/**
 * Generates all possible tile setups
 */
export function generateAllTileSetups(): TileSetup[] {
	const colors = [0, 1, 2, 3, 4, undefined];
	const energy = [1, 2, 3, 4];

	const layouts: TileSetup[] = energy
		.map((e) =>
			colors.map(
				(color) =>
					({
						tile_type: "Layout",
						color,
						data: { energy: e },
					} as TileSetup)
			)
		)
		.flat();

	const typed: TileSetup[] = (["Teleport", "Zero", "Wall"] as const)
		.map((name) =>
			colors.map((color) => ({ tile_type: name, color } as TileSetup))
		)
		.flat();

	const wildcard: TileSetup = { tile_type: "Wildcard", color: 0 };

	return [...layouts, ...typed, wildcard];
}

/**
 * Provides the default deck count for a given tile setup.
 * Mirrors the previous UI logic so there is a single source of truth.
 */
export function getDefaultCountFor(tile: TileSetup): number {
	if (tile.color === undefined) return 0;
	switch (tile.tile_type) {
		case "Layout":
			// energy is in tile.data.energy (1..4); defaults depend only on color
			return tile.color !== 0 ? 1 : 0;
		case "Teleport":
			return 1; // regardless of color
		case "Zero":
			return tile.color !== 0 ? 1 : 0;
		case "Wall":
			return tile.color !== 0 ? 2 : 0;
		case "Wildcard":
			return 3; // colorless
		default:
			return 0;
	}
}

/**
 * Builds the default deck with all tile setups and their default counts.
 */
export function getDefaultDeck(): DeckElement[] {
	return generateAllTileSetups().map((tile) => ({
		tile,
		count: getDefaultCountFor(tile),
	}));
}
