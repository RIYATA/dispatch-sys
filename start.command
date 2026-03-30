#!/bin/bash
cd "$(dirname "$0")"

echo "========================================"
echo "   Dispatch App Launcher"
echo "========================================"

# Visual indicator
echo "Checking environment..."

# 1. Clear Port 3000 if in use
PORT=3000
if lsof -i :$PORT > /dev/null; then
    echo "⚠️  Port $PORT is currently in use. Cleaning up..."
    lsof -ti :$PORT | xargs kill -9
    echo "✅ Port $PORT released."
else
    echo "✅ Port $PORT is free."
fi

# 2. Launch Browser (background process)
echo "🚀 Launching browser..."
(sleep 3 && open "http://localhost:3000") &

# 3. Start Server
echo "Starting development server..."
echo "----------------------------------------"
npm run dev -- -H 0.0.0.0

# 4. Prevent immediate close on error
echo ""
echo "========================================"
echo "❌ Server stopped Unexpectedly!"
echo "Press any key to close this window..."
read -n 1
