// client/js/ui.js
// Handles rendering the game board, updating UI elements,
// managing interaction listeners, and visual feedback.

// --- State (Keep track of listeners and UI elements) ---
let columnClickListeners = []; // Stores { element, type, listener } for column interactions
let pieceClickListeners = [];  // Stores { element, type, listener } for piece removal clicks
let currentGhostPiece = null; // Reference to the currently displayed ghost piece element

// --- Rendering Functions ---

/**
 * Renders the entire game board based on the provided state.
 * Includes hover areas and pieces. Sets ARIA attributes.
 * @param {Array<Array<string|null>>} boardState - 2D array representing the board.
 */
function renderBoard(boardState) {
    console.log("UI: renderBoard called");
    const boardAreaRef = document.getElementById('board-area');
    const boardContainerRef = document.getElementById('board-container');

    // Clear dynamic elements before rendering
    const existingHoverContainer = boardAreaRef.querySelector('.column-hover-area-container');
    if (existingHoverContainer) {
        existingHoverContainer.remove();
    }
    boardContainerRef.innerHTML = ''; // Clear previous board cells

    // Handle potential null/undefined board state gracefully
    if (!boardState || !Array.isArray(boardState) || boardState.length === 0 || !Array.isArray(boardState[0])) {
        console.error("RenderBoard called with invalid boardState:", boardState);
        // Optionally display an error message on the board area
        boardContainerRef.textContent = "Error rendering board state.";
        return;
    }

    const rows = boardState.length;
    const cols = boardState[0].length;

    // --- Create Hover Areas ---
    const hoverAreaContainer = document.createElement('div');
    hoverAreaContainer.classList.add('column-hover-area-container');

    for (let j = 0; j < cols; j++) {
        const hoverArea = document.createElement('div');
        hoverArea.classList.add('column-hover-area');
        hoverArea.dataset.col = j;
        hoverArea.setAttribute('role', 'button');
        hoverArea.setAttribute('aria-label', `Place piece in column ${j + 1}`); // Initial label

        const hoverIndicator = document.createElement('div');
        hoverIndicator.classList.add('hover-indicator');
        hoverIndicator.setAttribute('aria-hidden', 'true');
        hoverArea.appendChild(hoverIndicator);

        hoverAreaContainer.appendChild(hoverArea);
    }
    // Insert hover areas before the main board container within the board area
    boardAreaRef.insertBefore(hoverAreaContainer, boardContainerRef);

    // --- Create Board Cells ---
    boardContainerRef.setAttribute('aria-label', `Connect 4 game board, ${rows} rows by ${cols} columns`);

    boardState.forEach((rowArr, i) => {
        const rowDiv = document.createElement('div');
        rowDiv.classList.add('board-row');
        rowDiv.setAttribute('role', 'row');

        rowArr.forEach((cell, j) => {
            const cellDiv = document.createElement('div');
            cellDiv.classList.add('board-cell');
            cellDiv.dataset.row = i;
            cellDiv.dataset.col = j;
            cellDiv.setAttribute('role', 'gridcell');

            // Determine cell state for accessibility label
            const cellState = cell ? `${cell} piece` : 'empty';
            cellDiv.setAttribute('aria-label', `Cell ${i + 1}, ${j + 1}: ${cellState}`);

            // Create piece element if cell is not empty
            if (cell) {
                cellDiv.classList.add(cell); // Add color class (e.g., 'red', 'yellow')
                const pieceDiv = document.createElement('div');
                pieceDiv.classList.add('piece');
                pieceDiv.setAttribute('aria-hidden', 'true'); // Visual element
                cellDiv.appendChild(pieceDiv);
            }
            rowDiv.appendChild(cellDiv);
        });
        boardContainerRef.appendChild(rowDiv);
    });
}

/**
 * Updates turn information display, action prompt, highlights, overlays,
 * and ARIA labels based on the current game state.
 */
function updateTurnInfo() {
    console.log("UI: updateTurnInfo called");
    // Get references to all necessary UI elements
    const turnInfoDisplayRef = document.getElementById('turn-info');
    const actionPromptRef = document.getElementById('action-prompt');
    const boardAreaRef = document.getElementById('board-area');
    const boardContainerRef = document.getElementById('board-container');
    const overlay = document.getElementById('remove-overlay');
    const gameInfoRef = document.getElementById('game-info');

    // Ensure critical game state elements exist
    if (!currentGameState || !currentGameState.players || !currentGameState.board || !currentGameState.playerIds) {
        console.warn("updateTurnInfo called with incomplete game state:", currentGameState);
        // Maybe reset prompts to a default waiting state?
        actionPromptRef.textContent = 'Waiting for game state...';
        return;
    }

    const isMyTurn = currentGameState.currentPlayerId === socket.id;
    const currentPlayerId = currentGameState.currentPlayerId;
    const currentPlayer = currentGameState.players[currentPlayerId];
    const currentPlayerColor = currentPlayer?.color || 'N/A';
    const turnNumber = currentGameState.turn;

    // Update Text Content
    turnInfoDisplayRef.textContent = `Player ${currentPlayerColor.toUpperCase()} (Turn ${turnNumber})`;
    if (isMyTurn) {
        actionPromptRef.textContent = `Your turn: ${currentGameState.action === 'PLACE' ? 'Place your piece!' : 'ACTION: Remove an opponent\'s piece!'}`;
        actionPromptRef.style.fontWeight = 'bold';
    } else {
        actionPromptRef.textContent = `Waiting for ${currentPlayerColor.toUpperCase()}...`;
        actionPromptRef.style.fontWeight = 'normal';
    }
    actionPromptRef.classList.remove('error-feedback'); // Clear any previous error styling

    // Update Player Info Highlight (Top Bar)
    gameInfoRef.classList.remove('active-turn-red', 'active-turn-yellow');
    if (currentPlayerColor === 'red') {
        gameInfoRef.classList.add('active-turn-red');
    } else if (currentPlayerColor === 'yellow') {
         gameInfoRef.classList.add('active-turn-yellow');
    }

    // Update Remove Action Overlay Visibility
    if (isMyTurn && currentGameState.action === 'REMOVE') { // Show overlay only if it's YOUR remove turn
        overlay.classList.add('visible');
    } else {
        overlay.classList.remove('visible');
    }

    // Update Hover Area Indicators & ARIA Labels
    const hoverAreas = boardAreaRef.querySelectorAll('.column-hover-area');
    hoverAreas.forEach(area => {
        area.classList.remove('hover-red', 'hover-yellow');
        const col = parseInt(area.dataset.col);
        let label = `Place piece in column ${col + 1}`;

        if (isMyTurn && currentGameState.action === 'PLACE' && myColor) {
            area.classList.add(`hover-${myColor}`);
        }
        // Update ARIA label based on game state
        if (currentGameState.board[0]?.[col] !== null) { // Check top row exists and is full
            label += ' (Column full)';
            area.setAttribute('aria-disabled', 'true');
        } else if (!isMyTurn || currentAction !== 'PLACE') { // Check if place is allowed
             label += ' (Cannot place now)';
             area.setAttribute('aria-disabled', 'true');
        } else {
             area.removeAttribute('aria-disabled'); // Ensure enabled
        }
        area.setAttribute('aria-label', label);
    });

    // Update Removable Class & ARIA on Cells
    const allCells = boardContainerRef.querySelectorAll('.board-cell');
    allCells.forEach(cell => {
        cell.classList.remove('removable'); // Clear previous state
        // Set base ARIA attributes (role/label describing content)
        const r = parseInt(cell.dataset.row);
        const c = parseInt(cell.dataset.col);
        const cellContent = currentGameState.board[r]?.[c]; // Get content safely
        const cellState = cellContent ? `${cellContent} piece` : 'empty';
        cell.setAttribute('role', 'gridcell');
        cell.setAttribute('aria-label', `Cell ${r + 1}, ${c + 1}: ${cellState}`);
    });

    if (isMyTurn && currentGameState.action === 'REMOVE') {
        const opponentColor = myColor === 'red' ? 'yellow' : 'red';
        allCells.forEach(cell => {
           // Check if cell contains an opponent's piece
           if (cell.classList.contains(opponentColor)) {
               cell.classList.add('removable');
               // Update ARIA for removable cells
               cell.setAttribute('role', 'button');
               const r = cell.dataset.row;
               const c = cell.dataset.col;
               cell.setAttribute('aria-label', `Remove opponent ${opponentColor} piece at row ${parseInt(r)+1}, column ${parseInt(c)+1}`);
           }
        });
    }
}

// --- Interaction Handling ---

/**
 * Enables appropriate interactions (column clicks for PLACE, piece clicks for REMOVE)
 * based on the current game state and whose turn it is.
 */
function enableInteractions() {
    disableInteractions(); // Always clear existing listeners first
    const boardAreaRef = document.getElementById('board-area');
    console.log(`UI: Enabling interactions for action: ${currentAction}`);

    if (currentAction === 'PLACE' && myTurn) {
        const hoverAreas = boardAreaRef.querySelectorAll('.column-hover-area');
        hoverAreas.forEach(area => {
            const col = parseInt(area.dataset.col);
            // Only add listener if the column is not full
            if (currentGameState && currentGameState.board[0]?.[col] === null) {
                 const clickListener = handleColumnClick;
                 area.addEventListener('click', clickListener);
                 columnClickListeners.push({ element: area, type: 'click', listener: clickListener });

                 const mouseEnterListener = () => showGhostPiece(col);
                 const mouseLeaveListener = removeGhostPiece;

                 area.addEventListener('mouseenter', mouseEnterListener);
                 area.addEventListener('mouseleave', mouseLeaveListener);
                 columnClickListeners.push({ element: area, type: 'mouseenter', listener: mouseEnterListener });
                 columnClickListeners.push({ element: area, type: 'mouseleave', listener: mouseLeaveListener });

                 area.classList.remove('not-allowed');
                 area.style.cursor = 'pointer';
                 area.removeAttribute('aria-disabled');
            } else {
                 // Column is full, visually disable
                 area.style.cursor = 'not-allowed';
                 area.classList.add('not-allowed');
                 area.setAttribute('aria-disabled', 'true');
            }
        });
        console.log("UI: Place interactions ENABLED");
    } else if (currentAction === 'REMOVE' && myTurn) {
        const boardContainerRef = document.getElementById('board-container');
        const opponentColor = myColor === 'red' ? 'yellow' : 'red';
        const opponentPieces = boardContainerRef.querySelectorAll(`.board-cell.${opponentColor}`); // Select cells with opponent pieces
        opponentPieces.forEach(pieceCell => {
             const listener = handlePieceClick;
             pieceCell.addEventListener('click', listener);
             pieceClickListeners.push({ element: pieceCell, type: 'click', listener: listener });
             // Visual 'removable' class and ARIA attributes are handled by updateTurnInfo
        });
         removeGhostPiece(); // Ensure ghost piece is gone
         console.log("UI: Remove interactions ENABLED");
    } else {
        console.log("UI: No interactions enabled (not player's turn or invalid action).");
    }
}

/**
 * Disables all game interactions by removing event listeners and clearing visual states.
 */
function disableInteractions() {
    console.log("UI: Disabling interactions");
    const boardAreaRef = document.getElementById('board-area');
    const boardContainerRef = document.getElementById('board-container');

    // Remove column listeners (stored with type)
    columnClickListeners.forEach(({ element, type, listener }) => {
        element.removeEventListener(type, listener);
        element.style.cursor = 'default';
        element.classList.remove('not-allowed');
        element.removeAttribute('aria-disabled');
    });
    columnClickListeners = []; // Clear the listener array

    // Remove piece click listeners
    pieceClickListeners.forEach(({ element, type, listener }) => {
       element.removeEventListener('click', listener);
       // ARIA roles reset by updateTurnInfo/renderBoard
   });
    pieceClickListeners = []; // Clear the listener array

    // Clear visual states
    boardContainerRef.querySelectorAll('.removable').forEach(cell => cell.classList.remove('removable'));
    boardAreaRef.querySelectorAll('.column-hover-area').forEach(area => {
       area.classList.remove('hover-red', 'hover-yellow', 'not-allowed');
       area.style.cursor = 'default';
       // ARIA label reset by updateTurnInfo
    });

    removeGhostPiece(); // Ensure ghost piece is removed
}

// --- Ghost Piece Functions ---

/**
 * Finds the lowest row index in a column that is empty (null).
 * Performs check client-side for immediate hover feedback.
 * @param {Array<Array<string|null>>} board - The current board state.
 * @param {number} col - The column index to check.
 * @returns {number} The row index, or -1 if the column is full or invalid.
 */
function findClientSideLowestEmptyRow(board, col) {
    if (!board || !Array.isArray(board)) return -1;
    const rows = board.length;
    if (col < 0 || col >= (board[0]?.length || 0)) return -1; // Check column bounds

    for (let r = rows - 1; r >= 0; r--) {
        // Ensure row exists and cell is exactly null
        if (board[r] !== undefined && board[r][col] === null) {
            return r;
        }
    }
    return -1; // Column is full
}

/**
 * Displays a semi-transparent "ghost" piece in the target cell on hover.
 * @param {number} colIndex - The column index being hovered over.
 */
function showGhostPiece(colIndex) {
    // Only show ghost if it's the player's turn to place
    if (!currentGameState || !myColor || currentAction !== 'PLACE' || !myTurn) return;

    removeGhostPiece(); // Clear any previous ghost piece

    const targetRow = findClientSideLowestEmptyRow(currentGameState.board, colIndex);
    if (targetRow !== -1) { // Check if column has space
        const boardContainerRef = document.getElementById('board-container');
        // Find the specific cell element
        const targetCell = boardContainerRef.querySelector(`.board-cell[data-row='${targetRow}'][data-col='${colIndex}']`);

        if (targetCell) {
            currentGhostPiece = document.createElement('div');
            currentGhostPiece.classList.add('ghost-piece', myColor); // Add base and color class
            currentGhostPiece.setAttribute('aria-hidden', 'true'); // Hide from screen readers
            targetCell.appendChild(currentGhostPiece); // Add to the target cell
        }
    }
}

/**
 * Removes the currently displayed ghost piece element from the DOM.
 */
function removeGhostPiece() {
    if (currentGhostPiece) {
        currentGhostPiece.remove(); // Remove the element
        currentGhostPiece = null; // Clear the reference
    }
}

// --- Feedback & Highlight Functions ---

/**
 * Adds a 'winning-cell' class to the cells forming the winning line.
 * @param {Array<{row: number, col: number}>} winningCells - Coordinates of the winning cells.
 */
function highlightWinningLine(winningCells) {
    console.log("UI: Highlighting winning line:", winningCells);
    const boardContainerRef = document.getElementById('board-container');

    if (!winningCells || !Array.isArray(winningCells)) return;

    winningCells.forEach(cellCoord => {
        // Find the cell element using data attributes
        const cellElement = boardContainerRef.querySelector(`.board-cell[data-row='${cellCoord.row}'][data-col='${cellCoord.col}']`);
        if (cellElement) {
            cellElement.classList.add('winning-cell'); // Add class for CSS styling
            console.log(`Added winning-cell class to (${cellCoord.row}, ${cellCoord.col})`);
        } else {
             console.warn(`Could not find cell element for winning coordinate:`, cellCoord);
        }
    });
}

/**
 * Removes the 'winning-cell' class from all cells (used for rematch).
 */
function clearHighlights() {
    console.log("UI: Clearing winning highlights");
    const boardContainerRef = document.getElementById('board-container');
    boardContainerRef.querySelectorAll('.winning-cell').forEach(cell => {
        cell.classList.remove('winning-cell');
    });
}

/**
 * Applies a shake animation class to a column's hover area for feedback.
 * @param {number} colIndex - The index of the column to shake.
 */
function shakeColumn(colIndex) {
    console.log(`UI: Shaking column ${colIndex}`);
    const boardAreaRef = document.getElementById('board-area');
    // Find the hover area element above the column
    const hoverArea = boardAreaRef.querySelector(`.column-hover-area[data-col='${colIndex}']`);
    if (hoverArea) {
        hoverArea.classList.add('column-shake');
        // Remove the class after the animation completes
        setTimeout(() => {
             hoverArea.classList.remove('column-shake');
        }, 500); // Match CSS animation duration for 'shake'
    }
}

/**
 * Applies a flashing animation class to a piece for invalid move feedback.
 * @param {number} rowIndex - The row index of the piece.
 * @param {number} colIndex - The column index of the piece.
 */
function flashPiece(rowIndex, colIndex) {
     console.log(`UI: Flashing piece at (${rowIndex}, ${colIndex})`);
     const boardContainerRef = document.getElementById('board-container');
     // Find the specific cell
     const cell = boardContainerRef.querySelector(`.board-cell[data-row='${rowIndex}'][data-col='${colIndex}']`);
     if (cell) {
         // Find the piece element *inside* the cell
         const piece = cell.querySelector('.piece');
         if (piece) {
            // Add class to the piece itself for the animation
            piece.classList.add('flash-error');
            // Remove the class after the animation completes
            setTimeout(() => {
                 piece.classList.remove('flash-error');
            }, 600); // Match CSS animation duration for 'flash-red-effect'
         } else {
              // Fallback: Briefly change cell background if piece isn't there (e.g., empty cell click)
             cell.style.backgroundColor = 'var(--theme-error-color)'; // Use error color variable
             setTimeout(()=> { cell.style.backgroundColor = ''}, 600); // Reset background
             console.warn("Flash target cell has no piece element?");
         }
     }
}