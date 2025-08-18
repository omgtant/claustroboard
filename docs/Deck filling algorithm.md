Board size $B_{size} = W\times H$

1. Determine the guaranteed tiles on deck:
	1. Assemble an array $g$ of all tiles that have a defined count, repeating the same tile multiple times
2. If $\text{len}(g) < B_{size}$ assemble an array $r$ of random tiles of size $B_{size} - len(g)$:
	1. Assemble an array $ch$ of all random tiles
	2. Error if $len(ch) = 0$
	3. For each slot in $r$, pick any tile from $ch$ (without removing it from $ch$)
3. If $len(g) > B_{size}$ remove randomly some $len(g) - B_{size}$ elements from $g$.
4. Shuffle the resulting deck