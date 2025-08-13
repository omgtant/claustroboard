
# Human-readable rules

## Variables

$N$ - the size of the square board. Usually $N=4$
$P$ - the number of players. Usually $P = 2$, $P < N\cdot N$, $P \neq NP$

## Preparation

$P$ small markers indicating player pawns are prepared.

A deck of $N\cdot N$ cards is prepared. Each card should have two visual features that make cards distinguishable. These features will be called **color** and **symbol**.

The **symbol** has to be one of the numbers: 1, 2, 3, 4, or optionally any other icon.
The **color** has to be one of five possible values, one of which is always colorless (for example colorless, red, yellow, green, blue).

The cards are shuffled and are laid face up in an $N \times N$ grid. They now represent game board tiles.

The player pawns are placed randomly on the grid. No players may share a tile.

Player turn order is determined arbitrarily.

## Turn

When a player's turn comes, the number on the card below them determines their energy $X$. The player has to perform $X$ steps, where each step is a move to an open neighboring tile. Any tile may be visited at most once within a turn. A tile with another player on it may not be visited.

If the player can't make $X$ steps, they lose.

After the player moved $X$ steps, the tile they started the turn on is closed. If the tile they landed on is a special tile, they trigger its effect (possibly having to make a choice).

## Determining the winner

The order of winning is the reverse of the order of losing.