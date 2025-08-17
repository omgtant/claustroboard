# Main menu actions

- Create a new game
  - public (matchmaking)
  - private
- Join a new game
  - matchmaking
  - private (with code)
- Play a solo game

# Presentation as tabs

In any scenario, a nickname input is displayed close to join/create/play CTAs.

## Matchmaking

### Option 1
- Real-time table of existing matchmaking lobbies with their options
  - Click row to enter
- Button to create a new game
  - Simplified dialog to customize a curated set of game options (board size, available tiles, maximum number of players...)
- Starts the lobby screen with the list of players (+kick button) and a button to start the game.

### Option 2
- Single CTA which joins an existing/creates a new matchmaking lobby
- Lobby with a timer once N players are in and voting-based game options (eg. tile blacklists), some other options are standardized (ie. board size, based on the number of players or fixed)

## Private game

Dialog with a create button + a gamecode input and a join button. Both get you to a lobby with the list of players. The host (first player connected in chronological order, adjusted to disconnects) can kick players, customize the game's options and start the game.

## Solo

Workflow of alternating between an option dialog (akin to the private game options) and a solo browser-based game.
