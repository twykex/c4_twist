// client/js/main.js
// Handles client-side game logic, Socket.IO communication, and user interactions.

// --- Define Event Constants (Duplicate from common/events.js for browser) ---
const EVENTS = Object.freeze({
    // ClientToServer
    PLACE_PIECE: 'placePiece',
    REMOVE_PIECE: 'removePiece',
    REQUEST_REMATCH: 'requestRematch',

    // ServerToClient
    CONNECT: 'connect',
    DISCONNECT: 'disconnect',
    WAITING: 'waiting',
    ASSIGN_PLAYER: 'assignPlayer',
    GAME_STATE_UPDATE: 'gameStateUpdate',
    GAME_OVER: 'gameOver',
    OPPONENT_DISCONNECT: 'opponentDisconnect',
    INVALID_MOVE: 'invalidMove',
    SERVER_ERROR: 'error', // Standard socket.io error event
    REMATCH_PENDING: 'rematchPending',
    OPPONENT_WANTS_REMATCH: 'opponentWantsRematch',
    REMATCH_CANCELLED: 'rematchCancelled',
});
const THEME_KEY = 'connect4_theme'; // Key for localStorage
// --- End Constants ---

// --- Socket Connection ---
const socket = io();

// --- DOM Elements ---
const lobbyScreen = document.getElementById('lobby-screen');
const gameScreen = document.getElementById('game-screen');
const statusMessage = document.getElementById('status-message');
const playerColorDisplay = document.getElementById('player-color');
const turnInfoDisplay = document.getElementById('turn-info');
const actionPrompt = document.getElementById('action-prompt');
const boardContainer = document.getElementById('board-container'); // Direct board container
const winMessage = document.getElementById('win-message');
const disconnectMessage = document.getElementById('disconnect-message');
const playAgainButton = document.getElementById('play-again-button');
const rematchStatus = document.getElementById('rematch-status');
const themeToggleButton = document.getElementById('theme-toggle');
const gameOverOverlay = document.getElementById('game-over-overlay');
const gameInfoDisplay = document.getElementById('game-info'); // Reference for active highlight

// --- Game State (Client-side) ---
let myPlayerNumber = null;
let myColor = null;
let currentGameState = null;
let myTurn = false;
let currentAction = 'PLACE';
let lastActionSentWasRemove = false; // Flag for removal animation timing

// --- Theme Handling Functions ---
function applyTheme(theme) {
    const bodyClassList = document.body.classList;
    if (theme === 'dark') {
        bodyClassList.remove('light-theme');
        bodyClassList.add('dark-theme');
        themeToggleButton.innerHTML = '☀️'; // Sun icon for "Switch to Light"
        themeToggleButton.setAttribute('aria-label', 'Switch to light theme');
    } else {
        bodyClassList.remove('dark-theme');
        bodyClassList.add('light-theme');
        themeToggleButton.innerHTML = '🌙'; // Moon icon for "Switch to Dark"
        themeToggleButton.setAttribute('aria-label', 'Switch to dark theme');
    }
     // Update canvas colors (calls function in background.js)
     if (typeof updateThemeColors === 'function') {
        updateThemeColors();
    }
}

function toggleTheme() {
    const currentTheme = document.body.classList.contains('dark-theme') ? 'dark' : 'light';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    applyTheme(newTheme);
    localStorage.setItem(THEME_KEY, newTheme);
    console.log(`Theme switched to: ${newTheme}`);
}

function loadInitialTheme() {
    // Default to dark theme if no preference saved
    const savedTheme = localStorage.getItem(THEME_KEY) || 'dark';
    applyTheme(savedTheme);
    console.log(`Initial theme loaded: ${savedTheme}`);
}

// --- Initial Setup ---
loadInitialTheme();
themeToggleButton.addEventListener('click', toggleTheme);

// --- Socket Event Handlers ---
socket.on(EVENTS.CONNECT, () => {
    console.log('Connected to server with ID:', socket.id);
    statusMessage.textContent = 'Connected! Waiting for opponent...';
    // Clear interval if reconnecting
     if (socket.waitingIntervalId) {
        clearInterval(socket.waitingIntervalId);
        delete socket.waitingIntervalId;
     }
});

socket.on(EVENTS.WAITING, () => {
    let dots = '.';
    statusMessage.textContent = 'Waiting for an opponent ';
    // Ensure no duplicate interval
    if (socket.waitingIntervalId) clearInterval(socket.waitingIntervalId);
    socket.waitingIntervalId = setInterval(() => {
        dots += '.';
        if (dots.length > 3) dots = '.';
        statusMessage.textContent = 'Waiting for an opponent ' + dots;
    }, 600);
});

socket.on(EVENTS.ASSIGN_PLAYER, ({ playerNumber, state }) => {
     if (socket.waitingIntervalId) {
        clearInterval(socket.waitingIntervalId);
        delete socket.waitingIntervalId;
     }

    myPlayerNumber = playerNumber;
    myColor = state.players[socket.id]?.color;
    currentGameState = state;
    myTurn = state.currentPlayerId === socket.id;
    currentAction = state.action;

    console.log(`You are Player ${myPlayerNumber} (${myColor})`);
    console.log("Initial Game State:", currentGameState);

    lobbyScreen.style.display = 'none';
    gameScreen.style.display = 'block';

    if (myColor) {
        playerColorDisplay.textContent = myColor.charAt(0).toUpperCase() + myColor.slice(1);
        playerColorDisplay.style.color = myColor === 'red' ? 'var(--theme-red-primary)' : 'var(--theme-yellow-primary)';
    } else {
         playerColorDisplay.textContent = 'N/A';
         playerColorDisplay.style.color = 'inherit';
    }

    renderBoard(currentGameState.board);
    updateTurnInfo();
    if (myTurn) {
        enableInteractions();
    } else {
        disableInteractions();
    }
});

socket.on(EVENTS.GAME_STATE_UPDATE, (newState) => {
    console.log('Received gameStateUpdate from server:', JSON.stringify(newState));

    let pieceToRemoveCoords = null;

    // --- Removal Animation Logic ---
    if (lastActionSentWasRemove && currentGameState && currentGameState.action === 'REMOVE' && newState.action === 'PLACE') {
        const oldBoard = currentGameState.board;
        const newBoard = newState.board;
        for (let r = 0; r < oldBoard.length; r++) {
            for (let c = 0; c < oldBoard[0].length; c++) {
                if (oldBoard[r]?.[c] !== null && newBoard[r]?.[c] === null) {
                     if (oldBoard[r][c] !== myColor) {
                        pieceToRemoveCoords = { row: r, col: c };
                        console.log(`Identified removed piece at (${r}, ${c}) for animation.`);
                        break;
                     }
                }
            }
             if (pieceToRemoveCoords) break;
        }
        lastActionSentWasRemove = false; // Reset flag after processing
    } else {
        lastActionSentWasRemove = false; // Reset if not our removal update
    }
    // --- End Removal Animation Logic ---

    const isNewGame = currentGameState && newState.turn === 1 && currentGameState.turn > 1;
    currentGameState = newState; // Update state *after* comparison
    myTurn = newState.currentPlayerId === socket.id;
    currentAction = newState.action;

    // --- Trigger Animation or Render ---
    if (pieceToRemoveCoords) {
        const boardContainerRef = document.getElementById('board-container');
        const cellElement = boardContainerRef.querySelector(`.board-cell[data-row='${pieceToRemoveCoords.row}'][data-col='${pieceToRemoveCoords.col}']`);
        const pieceElement = cellElement ? cellElement.querySelector('.piece') : null;

        if (pieceElement) {
            pieceElement.classList.add('poofing');
            // Delay render to allow animation
            setTimeout(() => {
                renderBoard(currentGameState.board);
                updateTurnInfo();
                 if (myTurn) enableInteractions(); else disableInteractions();
            }, 250); // Match piecePoof CSS duration
            return; // Stop further execution until timeout
        } else {
             console.warn("Could not find piece element to animate removal.");
             // Fallback to immediate render
             renderBoard(newState.board);
             updateTurnInfo();
        }
    } else {
        // --- Standard Render Path ---
        renderBoard(newState.board);
        updateTurnInfo();
    }

    // --- UI Reset Logic (if not handled by animation timeout) ---
    if (isNewGame) {
        console.log("Rematch started! Resetting UI.");
        gameOverOverlay.classList.remove('visible');
        winMessage.style.display = 'none';
        disconnectMessage.style.display = 'none';
        playAgainButton.style.display = 'none';
        playAgainButton.classList.remove('loading');
        playAgainButton.disabled = false;
        rematchStatus.style.display = 'none';
        rematchStatus.textContent = '';
        clearHighlights();
    } else if (!pieceToRemoveCoords) { // Don't hide overlay if animating removal
         // Ensure these are hidden during normal play
         gameOverOverlay.classList.remove('visible');
         winMessage.style.display = 'none';
         disconnectMessage.style.display = 'none';
    }

    // Enable/disable interactions (unless handled by animation timeout)
    if (!pieceToRemoveCoords) {
        if (myTurn) {
            enableInteractions();
        } else {
            disableInteractions();
        }
    }
});

socket.on(EVENTS.GAME_OVER, ({ winnerId, draw, board, winningLine }) => {
    console.log('Game Over:', { winnerId, draw, winningLine });
    if (board) {
       currentGameState.board = board;
       renderBoard(currentGameState.board);
    }
    myTurn = false;
    disableInteractions(); // Disable board, remove ghost

    if (winningLine && winningLine.length > 0) {
        highlightWinningLine(winningLine);
    }

    const playAgainBtn = document.getElementById('play-again-button'); // Local ref
    const rematchStatusElement = document.getElementById('rematch-status');

    if (draw) {
        winMessage.textContent = "It's a Draw!";
        winMessage.style.color = 'var(--theme-game-over-text-draw)';
    } else if (winnerId === socket.id) {
        winMessage.textContent = "You Win!";
        winMessage.style.color = 'var(--theme-game-over-text-win)';
    } else {
        winMessage.textContent = "You Lose!";
        winMessage.style.color = 'var(--theme-game-over-text-lose)';
    }
    actionPrompt.textContent = "Game Over!";

    // Show overlay and its content
    winMessage.style.display = 'block';
    playAgainBtn.style.display = 'inline-block';
    playAgainBtn.classList.remove('loading');
    playAgainBtn.disabled = false;
    rematchStatusElement.style.display = 'none';
    rematchStatusElement.textContent = '';
    gameOverOverlay.classList.add('visible');
});

socket.on(EVENTS.OPPONENT_DISCONNECT, () => {
    console.log('Opponent disconnected.');
    myTurn = false;
    disableInteractions();
    disconnectMessage.textContent = "Your opponent disconnected. Game over.";
    disconnectMessage.style.display = 'block';
    actionPrompt.textContent = "Game Ended";
    playAgainButton.style.display = 'none';
    rematchStatus.style.display = 'none';
    gameOverOverlay.classList.remove('visible'); // Hide overlay
});

socket.on(EVENTS.INVALID_MOVE, (data) => {
    const message = typeof data === 'string' ? data : data.message;
    const context = typeof data === 'object' ? data : {};
    console.warn('Invalid Move:', message, context);

    const actionPromptRef = document.getElementById('action-prompt');

    // Prioritize specific feedback
    if (context.attemptedCol !== undefined && (message === 'Column is full.' || message === 'Invalid column.')) {
        shakeColumn(context.attemptedCol);
        actionPromptRef.textContent = `Invalid: ${message}`;
        actionPromptRef.classList.add('error-feedback');
    } else if (context.attemptedRow !== undefined && context.attemptedCol !== undefined && (message === 'Cannot remove your own piece.' || message === 'Cannot remove empty spot.')) {
        flashPiece(context.attemptedRow, context.attemptedCol);
        actionPromptRef.textContent = `Invalid: ${message}`;
        actionPromptRef.classList.add('error-feedback');
    } else { // Generic feedback
         actionPromptRef.textContent = `Invalid: ${message}`;
         actionPromptRef.classList.add('error-feedback');
    }

    // Clear feedback and re-enable interactions if still user's turn
    setTimeout(() => {
       actionPromptRef.classList.remove('error-feedback');
       // Update prompt text based on current state (if game didn't end somehow)
       if (currentGameState && currentGameState.currentPlayerId) {
            updateTurnInfo();
       }
       // Re-enable only if it's still supposed to be their turn
        if (myTurn && currentGameState && currentGameState.currentPlayerId === socket.id) {
           enableInteractions();
       }
    }, 1500);
});

socket.on(EVENTS.SERVER_ERROR, (message) => {
    console.error('Server Error:', message);
    disconnectMessage.textContent = `Server Error: ${message}. Please refresh.`;
    disconnectMessage.style.display = 'block';
    disableInteractions(); // Stop game
    gameOverOverlay.classList.remove('visible'); // Hide overlay
});

socket.on(EVENTS.DISCONNECT, (reason) => {
    console.log(`Disconnected from server: ${reason}`);
     if (socket.waitingIntervalId) {
        clearInterval(socket.waitingIntervalId);
        delete socket.waitingIntervalId;
     }
     // Show disconnect only if game was actively being played
     if (gameScreen.style.display !== 'none' && !gameOverOverlay.classList.contains('visible') && !disconnectMessage.style.display) {
        disconnectMessage.textContent = "You have been disconnected.";
        disconnectMessage.style.display = 'block';
        actionPrompt.textContent = "Connection Lost";
        disableInteractions();
        playAgainButton.style.display = 'none';
        rematchStatus.style.display = 'none';
    } else if (lobbyScreen.style.display !== 'none') {
         statusMessage.textContent = 'Disconnected. Please refresh.';
    }
});

// --- Rematch Event Handlers ---
socket.on(EVENTS.REMATCH_PENDING, () => {
    console.log('Rematch request sent, waiting for opponent.');
    rematchStatus.textContent = 'Rematch requested. Waiting for opponent...';
    rematchStatus.style.display = 'block';
    playAgainButton.classList.add('loading');
    playAgainButton.disabled = true;
});

socket.on(EVENTS.OPPONENT_WANTS_REMATCH, () => {
    console.log('Opponent wants a rematch!');
    rematchStatus.textContent = 'Opponent wants a rematch! Click "Play Again" to accept.';
    rematchStatus.style.display = 'block';
    playAgainButton.classList.remove('loading');
    playAgainButton.disabled = false; // Enable to accept
});

socket.on(EVENTS.REMATCH_CANCELLED, () => {
     console.log('Rematch cancelled by opponent disconnect.');
     rematchStatus.textContent = 'Rematch cancelled (opponent disconnected).';
     rematchStatus.style.display = 'block';
     playAgainButton.classList.remove('loading');
     playAgainButton.disabled = true;
     playAgainButton.style.display = 'inline-block'; // Keep visible but disabled
});

// --- Game Action Emitters ---
playAgainButton.addEventListener('click', () => {
    // Ensure game state exists and has a room ID before emitting
    if (currentGameState && currentGameState.roomId) {
        console.log('Play Again button clicked. Sending requestRematch.');
        socket.emit(EVENTS.REQUEST_REMATCH, { roomId: currentGameState.roomId });
        playAgainButton.classList.add('loading'); // Show loading spinner
        rematchStatus.textContent = 'Requesting rematch...'; // Update status
        rematchStatus.style.display = 'block';
    } else {
        console.error('Cannot request rematch, game state or room ID missing.');
    }
});

function handleColumnClick(event) {
    // Check if interaction is allowed
    if (!myTurn || currentAction !== 'PLACE' || !currentGameState) {
         console.log(`Click blocked: myTurn=${myTurn}, currentAction=${currentAction}, gameStateExists=${!!currentGameState}`);
         // Optional: Add quick visual feedback for blocked click
         return;
    }
    console.log("handleColumnClick fired!");

    const colIndex = parseInt(event.currentTarget.dataset.col);
    // Basic validation client-side (server validates definitively)
    if (currentGameState.board[0]?.[colIndex] !== null) {
        console.log("Client-side check: Column appears full.");
        shakeColumn(colIndex); // Give feedback immediately
        return;
    }

    console.log(`Attempting to place piece in column: ${colIndex}`);

    disableInteractions(); // Disable clicks, remove ghost
    lastActionSentWasRemove = false; // Reset removal flag

    console.log(`Emitting '${EVENTS.PLACE_PIECE}' to server. Room: ${currentGameState?.roomId}, Col: ${colIndex}`);
    socket.emit(EVENTS.PLACE_PIECE, { roomId: currentGameState.roomId, col: colIndex });
}

function handlePieceClick(event) {
    // Check if interaction is allowed
    if (!myTurn || currentAction !== 'REMOVE' || !currentGameState) {
        console.log(`Click blocked: myTurn=${myTurn}, currentAction=${currentAction}, gameStateExists=${!!currentGameState}`);
        return;
    }
    console.log("handlePieceClick fired!");

    const cell = event.currentTarget;
    const rowIndex = parseInt(cell.dataset.row);
    const colIndex = parseInt(cell.dataset.col);
    const pieceColor = currentGameState.board[rowIndex]?.[colIndex]; // Check target piece color from state

    if (!pieceColor) {
         console.log(`Clicked presumably empty removable cell? (${rowIndex}, ${colIndex})`);
         return; // Should not happen if UI syncs correctly
    }

    const myColorFromServer = currentGameState.players[socket.id]?.color;
    // Check if it's an opponent's piece
    if (myColorFromServer && pieceColor !== myColorFromServer) {
        console.log(`Attempting to remove opponent piece at: (${rowIndex}, ${colIndex})`);
        disableInteractions(); // Disable further clicks
        lastActionSentWasRemove = true; // Set flag for animation tracking
        console.log(`Emitting '${EVENTS.REMOVE_PIECE}' to server. Room: ${currentGameState?.roomId}, Row: ${rowIndex}, Col: ${colIndex}`);
        socket.emit(EVENTS.REMOVE_PIECE, { roomId: currentGameState.roomId, row: rowIndex, col: colIndex });
    } else {
         // Clicked own piece or something went wrong
         console.log(`Cannot remove piece at: (${rowIndex}, ${colIndex}) - Is own piece or error.`);
         lastActionSentWasRemove = false; // Reset flag on invalid click
         flashPiece(rowIndex, colIndex); // Provide visual feedback
    }
}