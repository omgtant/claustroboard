import { loadConfig } from "../config";
import { Config, InitialState, DeckElement, TileSetup } from "../types/types";

export function createStateFromConfig(
    playerCount: number,
	config: Config = loadConfig(),
): InitialState {
	// Helpers
	const randInt = (max: number) => Math.floor(Math.random() * max);
	const shuffleInPlace = <T>(arr: T[]) => {
		for (let i = arr.length - 1; i > 0; i--) {
			const j = randInt(i + 1);
			[arr[i], arr[j]] = [arr[j], arr[i]];
		}
	};

	const width = Math.max(0, Math.floor(config.width));
	const height = Math.max(0, Math.floor(config.height));
	const boardSize = width * height;

	// Build the concrete deck (similar to fillUsingDeck in Go)
	const guaranteed: TileSetup[] = [];
	const choices: TileSetup[] = [];

	for (const d of config.deck as DeckElement[]) {
		const cnt = d.count;
		if (typeof cnt === "number") {
			if (cnt > 0) {
				for (let i = 0; i < cnt; i++) guaranteed.push(d.tile);
			} else if (cnt < 0) {
				choices.push(d.tile);
			}
		} else {
			// undefined count => candidate for random choice pool
			choices.push(d.tile);
		}
	}

	if (guaranteed.length < boardSize) {
		if (choices.length === 0) {
			throw new Error(
				`deck underfills the board (${guaranteed.length} < ${boardSize}) and has no random-choice tiles`
			);
		}
		while (guaranteed.length < boardSize) {
			guaranteed.push(choices[randInt(choices.length)]);
		}
	}

	if (guaranteed.length > boardSize) {
		shuffleInPlace(guaranteed);
		guaranteed.length = boardSize;
	}

	// Shuffle for unbiased placement
	shuffleInPlace(guaranteed);

	// Build 2D board [y][x], using column-major mapping to mirror Go: idx = x*height + y
	const board: TileSetup[][] = Array.from({ length: height }, () =>
		Array<TileSetup>(width)
	);
	for (let x = 0; x < width; x++) {
		for (let y = 0; y < height; y++) {
			const idx = x * height + y;
			board[y][x] = guaranteed[idx];
		}
	}

	// Create players with unique random positions
	const totalCells = width * height;
	const nPlayers = Math.min(playerCount, totalCells);
	const allPositions = Array.from({ length: totalCells }, (_, i) => ({
		x: i % width,
		y: Math.floor(i / width),
	}));
	shuffleInPlace(allPositions);
	const players = Array.from({ length: nPlayers }, (_, i) => ({
		nickname: `Player ${i + 1}`,
		position: allPositions[i],
	}));

	return {
		palette: [],
		board,
		players,
	};
}
