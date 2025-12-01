#!/bin/zsh
# Start the SEAS Choir Node.js/Express app

cd "$(dirname "$0")"

# Start the backend server from the project root using npm start --prefix
npm start --prefix file-upload-app &
SERVER_PID=$!

# Wait a moment for the server to start
sleep 2

# Open the backend server URL in the default browser (adjust port if needed)
open http://localhost:3000

# Wait for the server process to finish
wait $SERVER_PID
