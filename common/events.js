// common/events.js
// Shared constants for Socket.IO event names to prevent typos
// and make refactoring easier.

const EVENTS = Object.freeze({
    // ClientToServer events (Client emits, Server listens)
    PLACE_PIECE: 'placePiece',
    REMOVE_PIECE: 'removePiece',
    REQUEST_REMATCH: 'requestRematch',

    // ServerToClient events (Server emits, Client listens)
    CONNECT: 'connect',                     // Standard Socket.IO event
    DISCONNECT: 'disconnect',                 // Standard Socket.IO event
    WAITING: 'waiting',                     // Server tells client they are waiting for opponent
    ASSIGN_PLAYER: 'assignPlayer',            // Server assigns player number, color, and initial state
    GAME_STATE_UPDATE: 'gameStateUpdate',     // Server sends the latest game state (board, turn, action, etc.)
    GAME_OVER: 'gameOver',                  // Server declares game end (win/loss/draw)
    OPPONENT_DISCONNECT: 'opponentDisconnect',  // Server informs client their opponent left
    INVALID_MOVE: 'invalidMove',            // Server rejects a client's move attempt
    SERVER_ERROR: 'error',                  // Standard Socket.IO error event / Custom server errors
    REMATCH_PENDING: 'rematchPending',          // Server confirms rematch request received, waiting for opponent
    OPPONENT_WANTS_REMATCH: 'opponentWantsRematch', // Server informs client their opponent requested a rematch
    REMATCH_CANCELLED: 'rematchCancelled',      // Server informs client rematch is off (e.g., opponent left)
});

// Export the constants for use in Node.js (server-side)
// Client-side will duplicate or use a bundler to access this.
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EVENTS;
}

// If using ES Modules (import/export syntax) in the future:
// export default EVENTS;