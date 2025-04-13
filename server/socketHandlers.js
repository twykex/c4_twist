// server/socketHandlers.js
// Handles specific Socket.IO events for connected clients.
// Uses gameManager for state and gameLogic for rules.

const gameManager = require('./gameManager'); // Manages game creation, storage, retrieval
const { findLowestEmptyRow, checkWin, isBoardFull, applyGravity } = require('./gameLogic'); // Core game rules
const EVENTS = require('../common/events'); // Shared event constants

let ioInstance; // Will hold the reference to the central io object from server.js

/**
 * Initializes the handlers with the io instance.
 * @param {object} io - The Socket.IO server instance.
 */
function initializeHandlers(io) {
    ioInstance = io; // Store the io instance for later use (emitting events)
}

/**
 * Handles a new client connection. Sets up listeners for game-related events for that client.
 * @param {object} socket - The Socket.IO socket object for the newly connected client.
 */
function handleConnection(socket) {
    console.log(`User connected: ${socket.id}`);

    // --- Simple Lobby Logic ---
    // Check if there's already a player waiting.
    if (global.waitingPlayerSocket) {
        // A player is waiting, start a new game!
        const player1Socket = global.waitingPlayerSocket;
        const player2Socket = socket;
        // Create the game state using the manager (also joins sockets to room)
        const game = gameManager.createNewGame(player1Socket, player2Socket);
        global.waitingPlayerSocket = null; // Clear the waiting spot

        // Emit the 'assignPlayer' event to each player with their details and the initial game state.
        player1Socket.emit(EVENTS.ASSIGN_PLAYER, { playerNumber: 1, state: game });
        player2Socket.emit(EVENTS.ASSIGN_PLAYER, { playerNumber: 2, state: game });
    } else {
        // No player waiting, make this socket the waiting player.
        global.waitingPlayerSocket = socket;
        console.log(`Player ${socket.id} is waiting for an opponent.`);
        socket.emit(EVENTS.WAITING); // Inform the client they are waiting
    }

    // --- Register Event Listeners for this specific socket ---
    socket.on(EVENTS.PLACE_PIECE, (data) => handlePlacePiece(socket, data));
    socket.on(EVENTS.REMOVE_PIECE, (data) => handleRemovePiece(socket, data));
    socket.on(EVENTS.REQUEST_REMATCH, (data) => handleRequestRematch(socket, data));
    // Listen for the standard 'disconnect' event for this socket
    socket.on(EVENTS.DISCONNECT, () => handleDisconnect(socket));
}


// --- Handler Implementations ---

/**
 * Handles a 'placePiece' event from a client.
 * Validates the move, updates the board, checks for win/draw, determines the next state,
 * and broadcasts the update.
 * @param {object} socket - The client's socket object.
 * @param {object} data - Data from the client { roomId, col }.
 */
function handlePlacePiece(socket, { roomId, col }) {
    const game = gameManager.getGame(roomId);
    console.log(`[Socket] Received ${EVENTS.PLACE_PIECE} from ${socket.id} for room ${roomId}, col ${col}`);

    // --- Validations ---
    if (!game) return socket.emit(EVENTS.SERVER_ERROR, 'Game not found.'); // Should not happen if client behaves
    if (game.currentPlayerId !== socket.id) return socket.emit(EVENTS.INVALID_MOVE, { message: 'Not your turn.' });
    if (game.action !== 'PLACE') return socket.emit(EVENTS.INVALID_MOVE, { message: `Cannot place during ${game.action}.` });
    // Ensure col is a valid number within board bounds
    if (typeof col !== 'number' || col < 0 || col >= game.board[0].length) {
         return socket.emit(EVENTS.INVALID_MOVE, { message: 'Invalid column.', attemptedCol: col });
    }

    // --- Game Logic ---
    const row = findLowestEmptyRow(game.board, col);
    if (row === -1) return socket.emit(EVENTS.INVALID_MOVE, { message: 'Column is full.', attemptedCol: col });

    const playerColor = game.players[socket.id]?.color;
    if (!playerColor) return socket.emit(EVENTS.SERVER_ERROR, 'Player color not found.'); // Internal state error

    game.board[row][col] = playerColor; // Update board state
    console.log(`[Logic] Piece placed at (${row}, ${col}) for ${playerColor}`);

    const winningLine = checkWin(game.board, playerColor); // Check win condition
    const draw = !winningLine && isBoardFull(game.board); // Check draw condition

    // --- Handle Game Over ---
    if (winningLine) {
        game.winner = socket.id; // Set winner
        console.log(`Game Over! Winner: ${socket.id} (${playerColor}) in room ${roomId}`);
        // Emit GAME_OVER to everyone in the room with final details
        ioInstance.to(roomId).emit(EVENTS.GAME_OVER, { winnerId: socket.id, draw: false, board: game.board, winningLine: winningLine });
        gameManager.removeGame(roomId); // Cleanup the finished game
        return; // Stop processing
    }
    if (draw) {
        game.draw = true; // Set draw flag
        console.log(`Game Over! Draw in room ${roomId}`);
        ioInstance.to(roomId).emit(EVENTS.GAME_OVER, { winnerId: null, draw: true, board: game.board, winningLine: null });
        gameManager.removeGame(roomId); // Cleanup the finished game
        return; // Stop processing
    }

    // --- Determine Next State (if game not over) ---
    game.turn++;
    const nextPlayerId = game.playerIds.find(id => id !== socket.id);
    if (!nextPlayerId) { // Should not happen in a 2-player game
        console.error(`[Logic Error] Could not find next player in game ${roomId}`);
        return socket.emit(EVENTS.SERVER_ERROR, 'Internal server error: Opponent not found.');
    }

    // --- TWIST LOGIC ---
    // Check if the turn *that just finished* was a multiple of 3 (e.g., turn 3, 6, 9...)
    const isRemoveTurn = (game.turn - 1) % 3 === 0;

    if (isRemoveTurn) {
        // It becomes the *same* player's turn again, but for the REMOVE action
        game.currentPlayerId = socket.id;
        game.action = 'REMOVE';
        console.log(`[Logic] Transitioning to REMOVE action for player ${socket.id} on turn ${game.turn}`);
    } else {
        // Normal turn progression to the other player
        game.currentPlayerId = nextPlayerId;
        game.action = 'PLACE';
        console.log(`[Logic] Transitioning to PLACE action for player ${game.currentPlayerId} on turn ${game.turn}`);
    }

    // --- Broadcast Update ---
    // Send the entire updated game state to both players in the room
    ioInstance.to(roomId).emit(EVENTS.GAME_STATE_UPDATE, game);
    console.log(`[Socket] Broadcast ${EVENTS.GAME_STATE_UPDATE} for ${roomId} (After Place)`);
}

/**
 * Handles a 'removePiece' event from a client.
 * Validates the move, updates the board (removes piece and applies gravity),
 * determines the next state, and broadcasts the update.
 * @param {object} socket - The client's socket object.
 * @param {object} data - Data from the client { roomId, row, col }.
 */
function handleRemovePiece(socket, { roomId, row, col }) {
     const game = gameManager.getGame(roomId);
     console.log(`[Socket] Received ${EVENTS.REMOVE_PIECE} from ${socket.id} for room ${roomId} at (${row}, ${col})`);

     // --- Validations ---
     if (!game) return socket.emit(EVENTS.SERVER_ERROR, 'Game not found.');
     if (game.currentPlayerId !== socket.id) return socket.emit(EVENTS.INVALID_MOVE, { message: 'Not your turn.' });
     if (game.action !== 'REMOVE') return socket.emit(EVENTS.INVALID_MOVE, { message: `Cannot remove during ${game.action}.` });
      // Ensure row/col are valid numbers within board bounds
     if (typeof row !== 'number' || typeof col !== 'number' ||
         row < 0 || row >= game.board.length || col < 0 || col >= game.board[0].length) {
         return socket.emit(EVENTS.INVALID_MOVE, { message: 'Invalid coordinates.', attemptedRow: row, attemptedCol: col });
     }

     const targetPieceColor = game.board[row][col];
     const myColor = game.players[socket.id]?.color;
     if (!myColor) return socket.emit(EVENTS.SERVER_ERROR, 'Player color not found.');

     if (!targetPieceColor) return socket.emit(EVENTS.INVALID_MOVE, { message: 'Cannot remove empty spot.', attemptedRow: row, attemptedCol: col });
     if (targetPieceColor === myColor) return socket.emit(EVENTS.INVALID_MOVE, { message: 'Cannot remove your own piece.', attemptedRow: row, attemptedCol: col });
     // If it passes checks, it must be the opponent's piece

     // --- Game Logic ---
     console.log(`[Logic] Removing piece at (${row}, ${col}) belonging to ${targetPieceColor}`);
     game.board[row][col] = null; // Remove the piece from the board state

     applyGravity(game.board, col, row); // Apply gravity in the affected column (modifies board directly)

     // --- Determine Next State ---
     // After removing, it's always the *other* player's turn to PLACE
     const nextPlayerId = game.playerIds.find(id => id !== socket.id);
      if (!nextPlayerId) { // Should not happen
        console.error(`[Logic Error] Could not find next player after removal in game ${roomId}`);
        return socket.emit(EVENTS.SERVER_ERROR, 'Internal server error: Opponent not found.');
    }
     game.currentPlayerId = nextPlayerId;
     game.action = 'PLACE';
     // Turn number does not increment for the removal action itself.

     console.log(`[Logic] Transitioning to PLACE action for player ${game.currentPlayerId} on turn ${game.turn}`);

     // --- Broadcast Update ---
     ioInstance.to(roomId).emit(EVENTS.GAME_STATE_UPDATE, game);
     console.log(`[Socket] Broadcast ${EVENTS.GAME_STATE_UPDATE} for ${roomId} (After Remove)`);
}

/**
 * Handles a 'requestRematch' event from a client.
 * Records the request and initiates a rematch if both players agree.
 * @param {object} socket - The client's socket object.
 * @param {object} data - Data from the client { roomId }.
 */
function handleRequestRematch(socket, { roomId }) {
     const game = gameManager.getGame(roomId);
     console.log(`[Socket] Received ${EVENTS.REQUEST_REMATCH} from ${socket.id} for room ${roomId}`);

     // Game might have been removed already if other player disconnected immediately after game over
     if (!game) {
        console.warn(`[Rematch] Game ${roomId} not found (likely removed). Cannot rematch.`);
        return; // Ignore request silently or send specific error
     }

     // Can only request rematch if game is actually over
     if (!game.winner && !game.draw) {
        console.warn(`[Rematch] Game ${roomId} is still in progress.`);
        return socket.emit(EVENTS.SERVER_ERROR, 'Game is still in progress.');
     }

     game.rematchRequestedBy.add(socket.id); // Record the request
     const opponentId = game.playerIds.find(id => id !== socket.id);

     // Check if both players have now requested a rematch
     if (game.rematchRequestedBy.size === 2) {
         console.log(`[Rematch] Both players agreed in room ${roomId}. Resetting game.`);
         gameManager.resetGameForRematch(game); // Reset game state via manager
         // Send the reset game state to start the new game
         ioInstance.to(roomId).emit(EVENTS.GAME_STATE_UPDATE, game);
         console.log(`[Socket] Rematch started in room ${roomId}, sent initial update.`);
     } else {
         // Only one player requested so far, inform both players
         console.log(`[Rematch] Waiting for opponent ${opponentId} in room ${roomId}`);
         socket.emit(EVENTS.REMATCH_PENDING); // Tell requester they are waiting

         // Find the opponent's socket object to emit directly to them
         const opponentSocket = ioInstance.sockets.sockets.get(opponentId);
         if (opponentSocket) {
             opponentSocket.emit(EVENTS.OPPONENT_WANTS_REMATCH); // Tell opponent about the request
             console.log(`[Socket] Notified ${opponentId} that ${socket.id} wants rematch.`);
         } else {
              console.warn(`[Rematch] Opponent socket ${opponentId} not found.`);
              // Might happen if opponent disconnected just before request processed
         }
     }
}

/**
 * Handles a client disconnecting from the server.
 * Cleans up lobby state or notifies opponent and removes game state if applicable.
 * @param {object} socket - The socket object of the disconnected client.
 */
function handleDisconnect(socket) {
    console.log(`[Socket] User disconnected: ${socket.id}`);

    // --- Handle Lobby Disconnect ---
    if (global.waitingPlayerSocket && global.waitingPlayerSocket.id === socket.id) {
        global.waitingPlayerSocket = null; // Clear the waiting spot
        console.log('[Lobby] Waiting player disconnected.');
        return; // No game cleanup needed
    }

    // --- Handle In-Game Disconnect ---
    const game = gameManager.findGameByPlayerId(socket.id); // Find which game they were in
    if (game) {
        console.log(`[Game] Player ${socket.id} disconnected from game ${game.roomId}.`);
        const opponentId = game.playerIds.find(id => id !== socket.id);

        // Clear any pending rematch request from the disconnected player
         if (game.rematchRequestedBy?.has(socket.id)) {
            game.rematchRequestedBy.delete(socket.id);
            console.log(`[Rematch] Cleared rematch request from disconnected player ${socket.id}`);
         }

        // Notify the opponent if they are still connected
        const opponentSocket = ioInstance.sockets.sockets.get(opponentId);
        if (opponentSocket) {
            console.log(`[Socket] Notifying opponent ${opponentId} of disconnect.`);
            opponentSocket.emit(EVENTS.OPPONENT_DISCONNECT); // Send notification

             // If the opponent was waiting for *this* player to accept a rematch, cancel it
             if (game.rematchRequestedBy?.size === 1 && game.rematchRequestedBy.has(opponentId)) {
                 console.log(`[Rematch] Notifying ${opponentId} that rematch was cancelled.`);
                 opponentSocket.emit(EVENTS.REMATCH_CANCELLED);
             }
        } else {
            console.log(`[Game] Opponent ${opponentId} already disconnected or not found.`);
        }

        // Remove the game state regardless of opponent connection status
        gameManager.removeGame(game.roomId);
    } else {
        // Player wasn't waiting and wasn't found in any active game
        console.log(`[Socket] Disconnected user ${socket.id} was not waiting or in an active game.`);
    }
}


// Export the necessary functions to be used by server.js
module.exports = {
    initializeHandlers, // Function to set the io instance
    handleConnection    // Function to handle new client connections
};