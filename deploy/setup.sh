#!/usr/bin/env bash
# ==============================================================================
# Production Deployment & Hardening Script for Nepali Programming Language Studio
# ==============================================================================
set -euo pipefail

echo "==> [1/5] Checking dependencies (Node.js, Cargo, PM2, Nginx)..."
command -v node >/dev/null 2>&1 || { echo "Node.js required but not installed. Aborting."; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "npm required but not installed. Aborting."; exit 1; }
command -v cargo >/dev/null 2>&1 || { echo "Cargo/Rust required but not installed. Aborting."; exit 1; }

# Install PM2 if not present
if ! command -v pm2 >/dev/null 2>&1; then
  echo "Installing PM2 globally..."
  npm install -g pm2
fi

echo "==> [2/5] Creating dedicated log directories with restricted permissions..."
sudo mkdir -p /var/log/nepali-studio
sudo chmod 750 /var/log/nepali-studio
sudo chown -R $USER:$USER /var/log/nepali-studio 2>/dev/null || true

echo "==> [3/5] Building Rust Native Release Binary & WASM Engine..."
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$ROOT_DIR"
cargo build --release -p nepali-core

if [ -f "$ROOT_DIR/crates/nepali-wasm/Cargo.toml" ] && command -v wasm-pack >/dev/null 2>&1; then
  echo "Building WASM bundle with wasm-pack..."
  cd "$ROOT_DIR/crates/nepali-wasm"
  wasm-pack build --target web --out-dir "$ROOT_DIR/studio/wasm-pkg"
fi

echo "==> [4/5] Installing Studio NPM packages & generating optimized production build..."
cd "$ROOT_DIR/studio"
npm ci || npm install
HOSTED_STUDIO=true npm run build

echo "==> [5/5] Starting PM2 process in cluster mode..."
pm2 reload "$SCRIPT_DIR/ecosystem.config.cjs" --env production || pm2 start "$SCRIPT_DIR/ecosystem.config.cjs" --env production
pm2 save

echo "======================================================================"
echo "  Nepali Studio Production Deployment Ready!"
echo "  Next Step: Copy Nginx configuration to /etc/nginx/sites-available/"
echo "  sudo cp $SCRIPT_DIR/nginx/nepali-studio.conf /etc/nginx/sites-available/nepali-studio"
echo "  sudo ln -sf /etc/nginx/sites-available/nepali-studio /etc/nginx/sites-enabled/"
echo "  sudo nginx -t && sudo systemctl reload nginx"
echo "======================================================================"
