

let _ctx: CanvasRenderingContext2D | null = null;

export function arrowCanvasInit() {
    const canvas = document.getElementById('move-arrow-canvas') as HTMLCanvasElement;
    if (!canvas) {
        throw new Error('Canvas element not found');
    }
    _ctx = canvas.getContext("2d");

    // resize the canvas every second
    function resizeCanvas() {
        if (!_ctx) return;
		const rect = canvas.getBoundingClientRect();
		_ctx.canvas.width = rect.width;
		_ctx.canvas.height = rect.height;
    }
    setInterval(() => {
        resizeCanvas();
    }, 500);
    resizeCanvas();

    requestAnimationFrame(draw);
}

export type ArrowArgs = {
    path: { x: number; y: number }[];
    thickness: number;
    color: string;
};

type Arrow = ArrowArgs & { id: string };

type State = {
    arrows: Arrow[];
};

let state: State = {
    arrows: [],
};

function draw(time: number) {
    if (!_ctx) return;

    _ctx.clearRect(0, 0, _ctx.canvas.width, _ctx.canvas.height);

    for (const arrow of state.arrows) {
        drawArrow(arrow, time);
    }

    requestAnimationFrame(draw);
}


function smoothPath(source: { x: number; y: number }[]) {
    if (!source) return [];
    if (source.length < 3) return source;
    const path = [source[0]];
	// Replace nodes in path with two lerped points to each side of that node
	// For smoother corners
	const lerpFactor = 0.85;
	for (let i = 1; i < source.length - 1; i++) {
		const p1 = source[i - 1];
		const p2 = source[i];
		const p3 = source[i + 1];

		const lerpedPoint1 = {
			x: (p2.x - p1.x) * lerpFactor + p1.x,
			y: (p2.y - p1.y) * lerpFactor + p1.y,
		};
		const lerpedPoint2 = {
			x: (p2.x - p3.x) * lerpFactor + p3.x,
			y: (p2.y - p3.y) * lerpFactor + p3.y,
		};
		path.push(lerpedPoint1, lerpedPoint2);
	}
	path.push(source[source.length - 1]);
    return path;
}

function drawArrow(arrow: ArrowArgs, time: number) {
    if (!_ctx) return;

    const w = _ctx.canvas.width;
    const h = _ctx.canvas.height;

    const t = time / 1000;

    _ctx.beginPath();
    _ctx.moveTo(arrow.path[0].x * w, arrow.path[0].y * h);
    for (const point of arrow.path) {
        const sections = 3;
        _ctx.lineTo(point.x * w, point.y * h);
    }
    _ctx.lineWidth = arrow.thickness;
    _ctx.strokeStyle = arrow.color;
    _ctx.stroke();

    drawAnim(arrow, time);
}

function drawAnim(arrow: ArrowArgs, time: number) {
	if (!_ctx) return;

	const w = _ctx.canvas.width;
	const h = _ctx.canvas.height;

	const t = time / 1000;

	const speed = 200; // pixels per second
    const between = 100; // pixels between arrows

	let lengthUntilNow = (t * speed) % between;
    let sumOfPastLengths = 0;
	for (let i = 0; i < arrow.path.length - 1; i++) {
		const p1 = arrow.path[i];
		const p2 = arrow.path[i + 1];

		const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
		const length = Math.hypot((p2.x - p1.x) * w, (p2.y - p1.y) * h);
		
        while (lengthUntilNow < sumOfPastLengths + length) {
            const offset = lengthUntilNow - sumOfPastLengths;
            if (offset >= 0 && offset <= length) {
                drawArrowHead(offset);
            }
            lengthUntilNow += between;
        }
        sumOfPastLengths += length;

        function drawArrowHead(offset: number) {
            if (!_ctx) return;
            const thickness = arrow.thickness * 3;

			_ctx.save();
			_ctx.translate(p1.x * w, p1.y * h);
			_ctx.rotate(angle);

			_ctx.beginPath();
			_ctx.moveTo(offset, 0);
			_ctx.lineTo(offset - thickness, -thickness / 2);
			_ctx.lineTo(offset - thickness, thickness / 2);
			_ctx.closePath();
			_ctx.fillStyle = arrow.color;
			_ctx.fill();

			_ctx.restore();
        }
	}
}

export function addArrow(arrow: ArrowArgs): Arrow {
    const newArrow: Arrow = { ...arrow, id: generateId() };
    state.arrows.push(newArrow);
    newArrow.path = smoothPath(newArrow.path);
    return newArrow;
}

export function deleteArrow(id: string): boolean {
    const index = state.arrows.findIndex(arrow => arrow.id === id);
    if (index !== -1) {
        state.arrows.splice(index, 1);
        return true;
    }
    return false;
}

export function clearArrows(): void {
    state.arrows = [];
}

function generateId(): string {
    return 'arrow-' + Math.random().toString(36).substring(2, 9);
}