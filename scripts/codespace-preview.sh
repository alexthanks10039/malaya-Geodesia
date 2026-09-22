#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

PORT="${PORT:-3000}"

echo "== Malaya Geodesia / Codespace bootstrap =="

if ! command -v node >/dev/null 2>&1; then
  echo "ERROR: Node.js is not installed."
  exit 1
fi

node -e 'const [major]=process.versions.node.split(".").map(Number); if (major < 20) { console.error("ERROR: Node.js >= 20 is required. Found " + process.version); process.exit(1); }'
echo "Node: $(node --version)"
echo "npm:  $(npm --version)"

if [ ! -d node_modules ]; then
  echo "Installing dependencies..."
  npm install
else
  echo "Dependencies already installed. Skipping npm install."
fi

echo "Running TypeScript check..."
npm run lint

echo
echo "Starting realtime development server on port $PORT."
echo "Codespaces should forward the port automatically."
echo "Studio/Dev Mode is part of the same application."
echo

exec npm run dev -- --hostname 0.0.0.0 --port "$PORT"
