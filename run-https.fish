#!/usr/bin/env fish

# Helper script to serve the demo over HTTPS using ngrok
# Usage: ./run-https.fish

echo "🚀 Starting local server on port 8000..."

# Start the local server in the background
npx http-server -p 8000 &
set server_pid $last_pid

# Wait a moment for the server to start
sleep 2

echo "✅ Server running at http://localhost:8000"
echo ""
echo "🔒 Starting ngrok tunnel to expose over HTTPS..."
echo ""

# Start ngrok (assumes ngrok is installed and authenticated)
# If not installed: brew install ngrok/ngrok/ngrok
# If not authenticated: ngrok config add-authtoken <your-token>
ngrok http 8000

# When ngrok exits (Ctrl+C), clean up the background server
echo ""
echo "🛑 Stopping local server..."
kill $server_pid 2>/dev/null
echo "✅ Done"
