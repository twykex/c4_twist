# Connect 4 - The Twist! ✨

<p align="center">
  <!-- IMPORTANT: Replace this with an actual screenshot or GIF! -->
  <!-- Create a 'docs' folder in your project root, add demo.gif there -->
  <img src="./docs/demo.gif" alt="Gameplay Demo" width="700"/>
</p>

A classic game of Connect 4 built for the modern web, featuring real-time multiplayer gameplay over WebSockets and a challenging strategic twist! Challenge an opponent, drop your pieces, and aim for four-in-a-row, but beware – every few turns, you'll get the power to remove one of their pieces from the board!

Built with Node.js, Socket.IO, and vanilla JavaScript.

---

## 🎮 Features

*   **Real-time Multiplayer:** Play against another person over the network.
*   **Classic Connect 4 Rules:** Standard 6x7 board, win by connecting 4 horizontally, vertically, or diagonally.
*   **The Removal Twist!** Every 3rd turn (after placing your piece), gain the ability to remove one opponent's piece from *anywhere* on the board.
*   **Gravity Physics:** Pieces fall naturally into the lowest available slot, both during placement and after a removal causes gaps.
*   **Slick Modern UI:** Clean interface with smooth animations and visual feedback.
*   **Dynamic Background:** Engaging animated particle background using HTML Canvas.
*   **Light/Dark Theme:** Toggle between themes for visual comfort, with preferences saved locally.
*   **Visual Feedback:**
    *   Piece drop animations.
    *   Hover previews (ghost pieces).
    *   Turn indicators (UI highlights).
    *   Winning line highlighting.
    *   Removal phase overlay.
    *   Non-intrusive feedback for invalid moves (shake/flash).
*   **Rematch Functionality:** Option to play again with the same opponent after a game concludes.
*   **Basic Accessibility:** Includes ARIA roles and labels for improved screen reader support.
*   **Responsive Design:** Adapts to various screen sizes.
*   **Organized Codebase:** Server logic separated into modules (`gameManager`, `gameLogic`, `socketHandlers`).

---

## 🔄 The Twist Explained

The core mechanic that changes the game:

1.  Turns proceed normally: Player 1 places, Player 2 places, Player 1 places...
2.  **After** completing Turn 3, Player 1 gets a **second action**: `REMOVE`.
3.  During the `REMOVE` action, Player 1 can click on **any one** of Player 2's pieces on the board to remove it.
4.  **Gravity:** Any pieces directly above the removed piece will fall down to fill the empty space(s).
5.  The turn then passes to Player 2 for their `PLACE` action (Turn 4).
6.  **After** completing Turn 6, Player 2 gets the `REMOVE` action against Player 1's pieces.
7.  This Place -> Place -> Place & Remove cycle continues every 3 turns for the respective player.

---

## 🔧 Tech Stack

*   **Backend:**
    *   Node.js
    *   Express (for basic server setup & static file serving)
    *   Socket.IO (for real-time WebSocket communication)
*   **Frontend:**
    *   HTML5
    *   CSS3 (including CSS Variables, Flexbox, Grid, Animations)
    *   Vanilla JavaScript (DOM Manipulation, Event Handling, Canvas API)
    *   Socket.IO Client
*   **Shared:**
    *   Event Constants (`common/events.js`)

---

## 🚀 Getting Started

Follow these steps to run the game locally:

1.  **Prerequisites:**
    *   Node.js and npm (or yarn) installed: [https://nodejs.org/](https://nodejs.org/)
    *   Git installed: [https://git-scm.com/](https://git-scm.com/)
2.  **Clone the Repository:**
    ```bash
    git clone https://github.com/twykex/c4_twist.git
    cd c4_twist
    ```
3.  **Install Dependencies:**
    ```bash
    npm install
    ```
4.  **Run the Server:**
    ```bash
    node server/server.js
    ```
    You should see output indicating the server is listening on a port (e.g., `Server listening on *:3000`).
5.  **Play the Game:**
    *   Open your web browser and navigate to `http://localhost:3000`.
    *   Open a **second** browser tab or window (or an incognito window) and navigate to `http://localhost:3000` again.
    *   The first two connections will be automatically paired to start a game!

---

## ▶️ How to Play

1.  Once connected and paired with an opponent, the game board will appear.
2.  Players take turns (`Red` vs `Yellow`/`Cyan`). Your assigned color and whose turn it is are displayed.
3.  On your `PLACE` turn, hover over the top of a column to see a preview, then click to drop your piece.
4.  On your `REMOVE` turn (every 3rd turn after placing), opponent pieces will be highlighted. Click one to remove it. Pieces above will fall down.
5.  The first player to get 4 of their pieces in a row (horizontally, vertically, or diagonally) wins!
6.  If the board fills up with no winner, the game is a draw.
7.  After the game ends, click "Play Again?" to request a rematch. If both players agree, a new game starts (starting player alternates).

---

## 📁 Project Structure
connect4-twist/
├── client/ # Frontend code (runs in browser)
│ ├── index.html # Main page structure
│ ├── css/
│ │ └── style.css # All visual styling & themes
│ └── js/
│ ├── main.js # Client main logic, Socket events, Core interactions
│ ├── ui.js # DOM manipulation, Rendering, Visual feedback
│ └── background.js # Animated canvas background logic
├── common/ # Shared code/constants
│ └── events.js # Socket.IO event name constants
├── server/ # Backend code (runs on Node.js)
│ ├── server.js # Entry point: Express/Socket.IO setup, Server start
│ ├── gameManager.js # Game state creation, storage, management
│ ├── gameLogic.js # Core game rules, win/draw checks, gravity
│ └── socketHandlers.js # Handling specific socket events from clients
├── node_modules/ # Dependencies (ignored by git)
├── .gitignore # Specifies intentionally untracked files
├── package-lock.json # Records exact dependency versions
├── package.json # Project metadata and dependencies
└── README.md # This file
---

## 🔮 Future Enhancements

**Immediate Next Steps:**

*   Improve server-side error handling and client feedback.
*   Thoroughly test edge cases (disconnects, rapid actions).
*   Enhance accessibility (focus management, keyboard navigation).
*   Implement a basic Room ID system for joining specific games.

**Longer Term Goals:**

*   Advanced Lobby: User accounts, stats, game listings, chat.
*   Gameplay Variations: Standard mode toggle, different board sizes.
*   Single Player Mode (AI opponent).
*   Spectator Mode.
*   Database integration for persistent state.
*   Deployment to a cloud platform.

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check [issues page](https://github.com/twykex/c4_twist/issues). Please adhere to standard coding practices and consider opening an issue first to discuss major changes.

---

## 📜 License

Distributed under the MIT License. See `LICENSE` file for more information.
*(**Note**: You should add a file named `LICENSE` to your project root containing the MIT license text if you choose this license)*

---
