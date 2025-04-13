// server/gameManager.js
// Manages the lifecycle and state storage of active games.

const { createEmptyBoard } = require('./gameLogic'); // Import board creation logic

const games = {}; // In-memory storage for active games { roomId: gameState }
let gameIdCounter = 0; // Simple counter for unique room IDs

/**
 * Creates a new game instance, stores it, and joins players to the room.
 * @param {object} player1Socket - The Socket.IO socket object for player 1.
 * @param {object} player2Socket - The Socket.IO socket object for player 2.
 * @returns {object} The initial gameState object (safe to emit).
 */
function createNewGame(player1Socket, player2Socket) {
    const roomId = `game_${gameIdCounter++}`;
    console.log(`Creating new game in room: ${roomId}`);

    // Define the initial state of the game.
    // IMPORTANT: Do NOT store the raw socket objects in the state that gets emitted.
    const gameState = {
        roomId: roomId,
        board: createEmptyBoard(), // Get an empty board from gameLogic
        players: {
            // Store player-specific game info (color, number) keyed by their socket ID.
            [player1Socket.id]: {
                color: 'red',    // Player 1 is always Red
                number: 1,
                startsNext: false // Player 1 starts first, so P2 starts next
            },
            [player2Socket.id]: {
                color: 'yellow', // Player 2 is always Yellow
                number: 2,
                startsNext: true // Player 2 starts the next game
            }
        },
        playerIds: [player1Socket.id, player2Socket.id], // Keep track of player IDs in this game
        currentPlayerId: player1Socket.id, // Player 1 starts the first game
        turn: 1,
        action: 'PLACE', // First action is always placing a piece
        winner: null,    // Winner ID, null initially
        draw: false,     // Draw state flag
        rematchRequestedBy: new Set() // Stores socket IDs of players requesting a rematch
    };
    games[roomId] = gameState; // Store the game state in our memory storage

    // Have both player sockets join the Socket.IO room for this game.
    player1Socket.join(roomId);
    player2Socket.join(roomId);
    console.log(`Game created between ${player1Socket.id} (P1 Red) and ${player2Socket.id} (P2 Yellow) in room ${roomId}`);

    return gameState; // Return the initial state (safe for emission)
}

/**
 * Retrieves the state of a specific game room.
 * @param {string} roomId - The ID of the room/game.
 * @returns {object | undefined} The gameState object or undefined if not found.
 */
function getGame(roomId) {
    return games[roomId];
}

/**
 * Finds the game state associated with a given player socket ID.
 * @param {string} playerId - The socket ID of the player.
 * @returns {object | undefined} The gameState object or undefined if the player isn't in a game.
 */
function findGameByPlayerId(playerId) {
     // Iterate through all active games and check if the playerIds array includes the player.
     return Object.values(games).find(g => g.playerIds?.includes(playerId));
}

/**
 * Removes a game from the active games storage.
 * @param {string} roomId - The ID of the room/game to remove.
 * @returns {boolean} True if the game was found and removed, false otherwise.
 */
function removeGame(roomId) {
    if (games[roomId]) {
        console.log(`[GameManager] Removing game ${roomId} from memory.`);
        delete games[roomId]; // Remove the game state from the storage object
        return true;
    }
    console.warn(`[GameManager] Attempted to remove non-existent game ${roomId}`);
    return false;
}

/**
 * Resets the state of an existing game object for a rematch.
 * Modifies the passed game object directly (by reference).
 * @param {object} game - The gameState object to reset.
 */
function resetGameForRematch(game) {
     if (!game) return; // Safety check

     console.log(`[GameManager] Resetting game ${game.roomId} for rematch.`);
     // Reset board, win/draw status, turn, action, and rematch requests
     game.board = createEmptyBoard();
     game.winner = null;
     game.draw = false;
     game.turn = 1;
     game.action = 'PLACE';
     game.rematchRequestedBy.clear();

     // Determine who starts the next game based on the 'startsNext' flag
     const player1State = Object.values(game.players).find(p => p.number === 1);
     const player2State = Object.values(game.players).find(p => p.number === 2);
     // Find IDs reliably using the player number stored in the state
     const player1Id = game.playerIds.find(id => game.players[id]?.number === 1);
     const player2Id = game.playerIds.find(id => game.players[id]?.number === 2);

     if (!player1State || !player2State || !player1Id || !player2Id) {
        console.error(`[GameManager] Error resetting rematch for ${game.roomId}: Player state missing.`);
        return; // Cannot proceed if player state is inconsistent
     }

     if (player1State.startsNext) {
         game.currentPlayerId = player1Id;
         player1State.startsNext = false; // Toggle flags for next rematch
         player2State.startsNext = true;
         console.log(`[GameManager] Player 1 (${player1Id}) starts the new game.`);
     } else { // Player 2 starts this time
         game.currentPlayerId = player2Id;
         player1State.startsNext = true;
         player2State.startsNext = false; // Toggle flags for next rematch
          console.log(`[GameManager] Player 2 (${player2Id}) starts the new game.`);
     }
     // The game object passed in has been modified directly.
}


// Export the functions to be used by socketHandlers.js
module.exports = {
    createNewGame,
    getGame,
    findGameByPlayerId,
    removeGame,
    resetGameForRematch
};