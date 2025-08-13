type Tile = {
    position: { x: number; y: number };
    is_open: boolean;
    color: number;
}

type LayoutTile = Tile & {
    move_number: number
}