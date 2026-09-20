#!/usr/bin/env bash
# ==============================================================================
# Production Deployment & Hardening Script for nepali.dibe.sh
# Run this on the server as a user with sudo access.
# ==============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "==> [1/6] Checking dependencies (Node.js, Cargo, PM2, Nginx)..."
command -v node  >/dev/null 2>&1 || { echo "Node.js required. Install via nvm or nodesource."; exit 1; }
command -v npm   >/dev/null 2>&1 || { echo "npm required."; exit 1; }
command -v cargo >/dev/null 2>&1 || { echo "Cargo/Rust required: https://rustup.rs"; exit 1; }

# Install PM2 if not present
if ! command -v pm2 >/dev/null 2>&1; then
  echo "Installing PM2 globally..."
  npm install -g pm2
fi

echo "==> [2/6] Creating log directory with restricted permissions..."
sudo mkdir -p /var/log/nepali-studio
sudo chmod 750 /var/log/nepali-studio
sudo chown -R "$USER:$USER" /var/log/nepali-studio 2>/dev/null || true

echo "==> [3/7] Building Rust Native Release Binary (with AI engine)..."
cd "$ROOT_DIR"
export PYO3_USE_ABI3_FORWARD_COMPATIBILITY=1
cargo build --release --manifest-path crates/nepali-core/Cargo.toml --bin nepali-core-cli --no-default-features --features ai-interop,python-interop,rust-interop,js-interop,cache,studio,db

echo "==> [4/7] Installing binary to /usr/local/bin/nepali..."
sudo cp -f "$ROOT_DIR/crates/nepali-core/target/release/nepali-core-cli" /usr/local/bin/nepali
sudo chmod +x /usr/local/bin/nepali
echo "  ✓ /usr/local/bin/nepali installed (version: $(nepali --version 2>/dev/null || echo 'unknown'))"

echo "==> [5/7] Provisioning Native GGUF AI Model..."
AI_DIR="/usr/local/share/nepali-ai/llm"
sudo mkdir -p "$AI_DIR"
if [ ! -f "$AI_DIR/model.gguf" ]; then
  echo "  Downloading Qwen2.5-0.5B GGUF Model (~470MB)..."
  sudo curl -L -sf -o "$AI_DIR/model.gguf" \
    "https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF/resolve/main/qwen2.5-0.5b-instruct-q4_k_m.gguf"
  sudo curl -L -sf -o "$AI_DIR/tokenizer.json" \
    "https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct/resolve/main/tokenizer.json"
  echo "  ✓ AI Model provisioned at $AI_DIR"
else
  echo "  ✓ AI Model already exists at $AI_DIR"
fi

echo "==> [6/7] Building Studio (standalone server for web deployment)..."
cd "$ROOT_DIR/studio"
npm ci 2>/dev/null || npm install
# NEXT_PUBLIC_WEB_STUDIO=true bakes isWebStudio()=true into the client bundle
HOSTED_STUDIO=true NEXT_PUBLIC_WEB_STUDIO=true npm run build
echo "  ✓ Studio production build complete"

echo "==> [7/7] Starting PM2 process manager..."
pm2 reload "$SCRIPT_DIR/ecosystem.config.cjs" --env production 2>/dev/null \
  || pm2 start "$SCRIPT_DIR/ecosystem.config.cjs" --env production
pm2 save
pm2 startup --no-daemon 2>/dev/null || true

echo ""
echo "======================================================================"
echo "  Nepali Studio Web Deployment Ready!"
echo "  Domain: https://nepali.dibe.sh"
echo ""
echo "  Next: Configure Nginx"
echo "    sudo cp $SCRIPT_DIR/nginx/nepali-studio.conf /etc/nginx/sites-available/nepali-studio"
echo "    sudo ln -sf /etc/nginx/sites-available/nepali-studio /etc/nginx/sites-enabled/"
echo "    sudo nginx -t && sudo systemctl reload nginx"
echo ""
echo "  Then get a free SSL cert:"
echo "    sudo certbot --nginx -d nepali.dibe.sh -d www.nepali.dibe.sh"
echo "======================================================================"
