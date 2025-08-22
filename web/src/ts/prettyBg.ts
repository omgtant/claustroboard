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
	const elCount = 15;

	const squares: HTMLDivElement[] = [];
	for (let i = 0; i < elCount; i++) {
		const square = document.createElement("div");
		const tile = document.createElement("div");
		tile.className = `tile 
        tile-layout-${Math.floor(Math.random() * 3) + 1} tile-${
			["RED", "GREEN", "BLUE", "YELLOW"][Math.floor(Math.random() * 4)]
		} tile-type-2 bg-animated:opacity-100 opacity-0 transition-opacity`;
		square.appendChild(tile);
		square.className = `!fixed`;

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
				parseFloat(square.style.rotate!) + 0.01 + "deg";
		});

		requestAnimationFrame(floatSquares);
	}

	floatSquares();
}