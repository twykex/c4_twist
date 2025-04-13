// server/server.js
// Main entry point for the Node.js server.
// Sets up Express, Socket.IO, serves client files, and delegates connection handling.

const express = require('express');
const http = require('http');
const { Server } = require("socket.io"); // Import Server class from socket.io
const path = require('path');

// Import custom modules
const socketHandlers = require('./socketHandlers'); // Handles events for connected sockets
const EVENTS = require('../common/events'); // Shared event constants (ensure path is correct)

// --- Server Setup ---
const app = express(); // Create an Express application
const server = http.createServer(app); // Create an HTTP server using the Express app
const io = new Server(server, {
    // Optional: Configure Cross-Origin Resource Sharing (CORS)
    // Needed if your frontend is served from a different domain/port than the server.
    // Example:
    // cors: {
    //   origin: "http://localhost:8080", // Allow requests from this frontend origin
    //   methods: ["GET", "POST"]       // Allow these HTTP methods
    // }
});

const PORT = process.env.PORT || 3000; // Use environment variable for port or default to 3000

// --- Simple global state for waiting player ---
// This is a basic approach. For scalability, a more robust waiting list/matchmaking
// system within gameManager or a separate module would be better.
global.waitingPlayerSocket = null;

// --- Serve Static Client Files ---
// Construct the absolute path to the 'client' directory
const clientPath = path.join(__dirname, '../client');
console.log(`Serving static files from: ${clientPath}`);
// Use Express middleware to serve files from the 'client' directory (HTML, CSS, JS)
app.use(express.static(clientPath));

// --- Main Route ---
// Define the handler for the root URL ('/')
app.get('/', (req, res) => {
  // Send the main index.html file to the client
  res.sendFile(path.join(clientPath, 'index.html'));
});

// --- Initialize Socket.IO Handlers ---
// Pass the 'io' instance to the socketHandlers module so it can emit to rooms/clients
socketHandlers.initializeHandlers(io);

// --- WebSocket Connection Logic ---
// Set up a listener for the standard 'connection' event from Socket.IO
// When a new client connects, this event fires with the client's socket object.
io.on('connection', socketHandlers.handleConnection); // Delegate handling to socketHandlers.js


// --- Start Server ---
// Start the HTTP server and make it listen on the configured port.
server.listen(PORT, () => {
    console.log(`Server listening on *:${PORT}`); // Log confirmation that the server is running
});