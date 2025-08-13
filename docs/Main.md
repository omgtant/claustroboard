
# Human-readable rules

## Variables

$N$ - the size of the square board. Usually $N=4$
$P$ - the number of players. Usually $P = 2$, $P < N\cdot N$, $P \neq NP$

## Preparation

$P$ small markers representing players are prepared.

A deck of $N\cdot N$ cards is prepared. Each card should have two visual features that make cards distinguishable. These features will be called **color** and **symbol**.

The **symbol** has to be one of the numbers: 1, 2, 3, 4, or optionally any other icon.
The **color** has to be one of five possible values, one of which is always colorless (for example colorless, red, yellow, green, blue).

The cards are shuffled and are laid face up in an $N \times N$ grid. They now represent game board tiles.

The players are placed randomly on the grid. No players may share a tile.

Player turn order is determined arbitrarily.

## Turn

When a player's turn comes, the number on the card below them determines their energy $X$. The player has to perform $X$ steps, where each step is a move to an open neighboring tile. Any tile may be visited at most once within a turn. A tile with another player on it may not be visited.

If the player can't make $X$ steps, they lose.

After the player moved $X$ steps, the tile they started the turn on is closed. If the tile they landed on is a special tile, they trigger its effect (possibly having to make a choice).

## Determining the winner

The order of winning is the reverse of the order of losing.

# Algorithmic description

1. Shuffle $N\cdot N$ cards, make an $N \times N$ grid, determine **valid** positions and order of turns for the $P$ players.
	- *(valid positions determined via tiles' "can start on me?" method. panic if there are less valid cards than players)*
2. For each card in arbitrary order:
	- Trigger the tile global turn start hook, turn=0
3. For each player in turn order:
	- Trigger the tile player land hook
4. Until $P-1$ players lost:
	- For each card in arbitrary order:
		- Trigger the tile global turn start hook
	- For each active player in turn order:
		- Trigger the tile player-occupied turn start hook.
			- The returned valid move candidates are then filtered through candidate.(can land on me?)
		- If $P-1$ players already lost, mark the player as the winner. Break.
		- If the player doesn't have a valid card to reach to, petrify the player. Continue.
		- Let the player chose a valid card to move to. *The intermediate visits are determined programatically and are not controlled by the player*
		- For the tile the player chose, trigger the tile player land hook
		- Close the card the player started the turn on
5. Congratulate the winners.

# Tile types

## Abstract tile

Internally has access to the game state, possibly via injection.

**Properties**
- position
	- x ($0$ to $N-1$)
	- y ($0$ to $N-1$)
- is open (true, false)
- color (0,1,2,3,4)

**Hooks**
- on turn start (self, turn number, state) -> void *(turn number can already be fetched from the state tho, not sure)*
- on player-occupied turn start (self, player, turn number, state) -> valid moves list
- on player landing (self, player, state) -> void

**Methods**
- can land on me? (self, player, state) -> bool
- can start on me? (self, state) -> bool
## Layout tile (inherits Abstract tile)

**Properties**
- move number (1, 2, 3, 4 (5?))

**Implementations**
- on turn start - nothing
- on player-occupied turn start - traverse from this card via dfs only visiting open cards, return all cards that are reachable within `move number` moves.
- on player landing - nothing
- can land on me? - true
- can start on me? - true

## Teleport tile (inherits Abstract tile)

**Implementations**
- on player-occupied turn start - panic
- on player landing - let the player choose any card such that `(my.color == 0 || my.color == candidate.color) && can land on candidate`. teleport the player to that tile, and trigger the `on player landing` of that tile
- can land on me? - not if the player is standing on another teleport tile rn
- can start on me? - false

## Wall tile (inherits Abstract tile)

**Implementations**
- on turn start - if turn is 0, close
- on player-occupied turn start - panic
- on player landing - panic
- can land on me? - false
- can start on me? - false

## Wildcard tile (inherits Abstract tile)

the color is always 0

**Implementations**
- on turn start - nothing
- on player-occupied turn start - dfs, return all cards reachable with 4 moves or less
- on player landing - nothing
- can land on me? - true
- can start on me? - true

## Zero tile (inherits Abstract tile)

**Implementations**
- on turn start - nothing
- on player-occupied turn start - panic
- on player landing - swap all players **positions** in turn order, while preserving the turn order itself (so the next player still moves next). for the player that ends up on this tile, copy the player's old tile and replace this tile with that.
- can land on me? - true
- can start on me? - false *?*


