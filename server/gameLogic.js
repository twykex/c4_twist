// server/gameLogic.js

function createEmptyBoard(rows = 6, cols = 7) {
    return Array(rows).fill(null).map(() => Array(cols).fill(null));
}

function findLowestEmptyRow(board, col) {
    const rows = board.length;
    for (let r = rows - 1; r >= 0; r--) {
        if (board[r][col] === null) {
            return r;
        }
    }
    return -1; // Column is full
}

function checkWin(board, playerColor) {
    // This function now only needs the board and color,
    // as it checks the entire board state.
    const rows = board.length;
    const cols = board[0].length;
    let winningLine = [];

    // Check Horizontal
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c <= cols - 4; c++) {
            if (board[r][c] === playerColor &&
                board[r][c+1] === playerColor &&
                board[r][c+2] === playerColor &&
                board[r][c+3] === playerColor) {
                winningLine = [{row: r, col: c}, {row: r, col: c+1}, {row: r, col: c+2}, {row: r, col: c+3}];
                return winningLine;
            }
        }
    }

    // Check Vertical
    for (let r = 0; r <= rows - 4; r++) {
        for (let c = 0; c < cols; c++) {
            if (board[r][c] === playerColor &&
                board[r+1][c] === playerColor &&
                board[r+2][c] === playerColor &&
                board[r+3][c] === playerColor) {
                 winningLine = [{row: r, col: c}, {row: r+1, col: c}, {row: r+2, col: c}, {row: r+3, col: c}];
                return winningLine;
            }
        }
    }

    // Check Positive Diagonal (/)
    for (let r = 3; r < rows; r++) {
        for (let c = 0; c <= cols - 4; c++) {
            if (board[r][c] === playerColor &&
                board[r-1][c+1] === playerColor &&
                board[r-2][c+2] === playerColor &&
                board[r-3][c+3] === playerColor) {
                 winningLine = [{row: r, col: c}, {row: r-1, col: c+1}, {row: r-2, col: c+2}, {row: r-3, col: c+3}];
                return winningLine;
            }
        }
    }

    // Check Negative Diagonal (\)
    for (let r = 0; r <= rows - 4; r++) {
        for (let c = 0; c <= cols - 4; c++) {
             if (board[r][c] === playerColor &&
                 board[r+1][c+1] === playerColor &&
                 board[r+2][c+2] === playerColor &&
                 board[r+3][c+3] === playerColor) {
                 winningLine = [{row: r, col: c}, {row: r+1, col: c+1}, {row: r+2, col: c+2}, {row: r+3, col: c+3}];
                 return winningLine;
             }
        }
    }

    return null; // No win found
}

function isBoardFull(board) {
    return board.every(row => row.every(cell => cell !== null));
}

// Applies gravity IN PLACE (modifies the board directly)
function applyGravity(board, col, removedRow) {
     let currentEmptyRow = removedRow;
     for (let r = removedRow - 1; r >= 0; r--) { // Iterate upwards from above removal
         if (board[r][col] !== null) {
             // console.log(`[Gravity] Moving piece from (${r}, ${col}) to (${currentEmptyRow}, ${col})`);
             board[currentEmptyRow][col] = board[r][col];
             board[r][col] = null;
             currentEmptyRow--; // Next empty spot is now higher
         }
     }
}


module.exports = {
    createEmptyBoard,
    findLowestEmptyRow,
    checkWin,
    isBoardFull,
    applyGravity
};