export default function init() {
	// Pretty background
	function toggleBg(force: boolean) {
		document.body.classList.toggle("bg-animated", force);
	}

	document
		.getElementById("toggle-bg")!
		.addEventListener("change", (event) => {
			toggleBg((event.target as HTMLInputElement).checked);
		});
	toggleBg(
		(document.getElementById("toggle-bg")! as HTMLInputElement).checked
	);

	const maxLayers = 15;
	const elCount = 10;

	const squares: HTMLDivElement[] = [];
	for (let i = 0; i < elCount; i++) {
		const square = document.createElement("div");
		const tile = document.createElement("div");
		
		const kind = getRandomKindClass();
		const color = getRandomColorClass(kind);

		tile.className = `tile ${color} ${kind} tile-type-2 bg-animated:opacity-100 opacity-0 transition-opacity`;
		square.appendChild(tile);
		square.className = `!fixed transform-3d max-md:hidden`;

		const layer = Math.floor(Math.random() * maxLayers);
		square.dataset.layer = layer.toString();
		square.style.scale = (
			1 +
			((maxLayers - layer) * 1) / maxLayers
		).toString();

		const x = Math.random() * 75 + 12.5;
		square.style.left = x + "%";
		square.dataset.baseX = x.toString();

		const y = Math.random() * 75 + 12.5;
		square.style.top = y + "%";
		square.dataset.baseY = y.toString();

		square.style.rotate = Math.random() * 360 + "deg";

		square.style.zIndex = (-100 - layer * 10).toString();
		square.style.filter = `brightness(35%) saturate(60%)`;

		squares.push(square);
		document.body.appendChild(square);
	}

	function floatSquares() {
		const time = Date.now() * 0.0005; // Slower animation

		squares.forEach((square) => {
			const layer = parseInt(square.dataset.layer!);
			const baseX = parseFloat(square.dataset.baseX!);
			const baseY = parseFloat(square.dataset.baseY!);

			const floatX = Math.sin(time * 0.8 + layer) * 3;
			const floatY = Math.cos(time + layer * 0.7) * 3;

			// Only apply floating if no mouse parallax is active
			square.style.left = baseX + floatX + "%";
			square.style.top = baseY + floatY + "%";

			// Rotation
			square.style.rotate =
				"1 1 1 " + Math.cos(time * 0.1 + layer * 0.7) * 360 + "deg";
		});

		requestAnimationFrame(floatSquares);
	}

	floatSquares();
}

function getColorClasses(kind: string) {
	if (kind.startsWith("tile-layout"))
		return ["tile-RED", "tile-GREEN", "tile-BLUE", "tile-YELLOW"];
	if (kind === "tile-wildcard") {
		return ["tile-COLORLESS"];
	}
	return [
		"tile-RED",
		"tile-GREEN",
		"tile-BLUE",
		"tile-YELLOW",
		"tile-COLORLESS",
	];
}

function getRandomColorClass(kind: string) {
	const classes = getColorClasses(kind);
	return classes[Math.floor(Math.random() * classes.length)];
}

function getRandomKindClass() {
	const kinds = [
		"tile-layout-1",
		"tile-layout-2",
		"tile-layout-3",
		"tile-layout-4",
		"tile-zero",
		"tile-teleport",
		"tile-wildcard",
	];
	return kinds[Math.floor(Math.random() * kinds.length)];
}
