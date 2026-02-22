#!/bin/bash
# Sukoon — Cloudflare Tunnel Launch Script
# Starts server, client, and tunnels for temporary sharing

set -e

CLOUDFLARED="${HOME}/bin/cloudflared"
SERVER_PORT=8081
CLIENT_PORT=5173
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
CLIENT_ENV="$PROJECT_DIR/client/.env"
CLIENT_ENV_BACKUP="$PROJECT_DIR/client/.env.backup"

# Check cloudflared is installed
if ! "$CLOUDFLARED" --version &> /dev/null; then
  echo "ERROR: cloudflared not found at $CLOUDFLARED"
  echo "Install it: curl -fsSL https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-darwin-arm64.tgz | tar -xz -C ~/bin/"
  exit 1
fi

cleanup() {
  echo ""
  echo "Shutting down..."
  kill $SERVER_PID $CLIENT_PID $TUNNEL_SERVER_PID $TUNNEL_CLIENT_PID 2>/dev/null || true
  wait $SERVER_PID $CLIENT_PID $TUNNEL_SERVER_PID $TUNNEL_CLIENT_PID 2>/dev/null || true

  # Restore original client .env
  if [ -f "$CLIENT_ENV_BACKUP" ]; then
    mv "$CLIENT_ENV_BACKUP" "$CLIENT_ENV"
    echo "Restored original client .env"
  fi

  echo "All processes stopped."
}
trap cleanup EXIT INT TERM

# Backup original client .env
if [ -f "$CLIENT_ENV" ]; then
  cp "$CLIENT_ENV" "$CLIENT_ENV_BACKUP"
fi

# 1. Start the server with TUNNEL_MODE
echo "Starting server..."
cd "$PROJECT_DIR/server"
TUNNEL_MODE=true npm run dev &
SERVER_PID=$!
sleep 3

# 2. Start the server tunnel and capture URL
echo "Starting server tunnel..."
SERVER_TUNNEL_LOG=$(mktemp)
"$CLOUDFLARED" tunnel --url "http://localhost:$SERVER_PORT" > "$SERVER_TUNNEL_LOG" 2>&1 &
TUNNEL_SERVER_PID=$!

echo "Waiting for server tunnel URL..."
SERVER_TUNNEL_URL=""
for i in $(seq 1 30); do
  SERVER_TUNNEL_URL=$(grep -o 'https://[a-z0-9-]*-[a-z0-9-]*\.trycloudflare\.com' "$SERVER_TUNNEL_LOG" 2>/dev/null | head -1)
  if [ -n "$SERVER_TUNNEL_URL" ]; then
    break
  fi
  sleep 1
done

if [ -z "$SERVER_TUNNEL_URL" ]; then
  echo "ERROR: Could not get server tunnel URL after 30s"
  echo "Logs: $(cat "$SERVER_TUNNEL_LOG")"
  exit 1
fi

echo "Server tunnel: $SERVER_TUNNEL_URL"

# 3. Write tunnel URLs to client .env so Vite picks them up
WS_TUNNEL_URL="wss://${SERVER_TUNNEL_URL#https://}/ws"
echo "VITE_WS_URL=$WS_TUNNEL_URL" > "$CLIENT_ENV"
echo "VITE_API_URL=$SERVER_TUNNEL_URL" >> "$CLIENT_ENV"

# 4. Start the client (Vite reads .env on startup)
echo "Starting client..."
cd "$PROJECT_DIR/client"
npm run dev -- --host &
CLIENT_PID=$!
sleep 3

# 5. Start the client tunnel
echo "Starting client tunnel..."
CLIENT_TUNNEL_LOG=$(mktemp)
"$CLOUDFLARED" tunnel --url "http://localhost:$CLIENT_PORT" > "$CLIENT_TUNNEL_LOG" 2>&1 &
TUNNEL_CLIENT_PID=$!

echo "Waiting for client tunnel URL..."
CLIENT_TUNNEL_URL=""
for i in $(seq 1 30); do
  CLIENT_TUNNEL_URL=$(grep -o 'https://[a-z0-9-]*-[a-z0-9-]*\.trycloudflare\.com' "$CLIENT_TUNNEL_LOG" 2>/dev/null | head -1)
  if [ -n "$CLIENT_TUNNEL_URL" ]; then
    break
  fi
  sleep 1
done

if [ -z "$CLIENT_TUNNEL_URL" ]; then
  echo "ERROR: Could not get client tunnel URL after 30s"
  echo "Logs: $(cat "$CLIENT_TUNNEL_LOG")"
  exit 1
fi

echo ""
echo "=================================================="
echo "  Sukoon is live! Share this link:"
echo ""
echo "  $CLIENT_TUNNEL_URL"
echo ""
echo "  Server tunnel: $SERVER_TUNNEL_URL"
echo "  WebSocket URL: $WS_TUNNEL_URL"
echo "=================================================="
echo ""
echo "Press Ctrl+C to stop all services."
echo ""

# Keep running
wait
