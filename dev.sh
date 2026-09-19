#!/usr/bin/env bash
# Try the Nepali language on this Mac - no OS, no VM, no Docker.
#   ./dev.sh                         interactive Nepali shell (try:  ? नेपालको राजधानी कहाँ हो?)
#   ./dev.sh examples/01_hello.nep   run a program
#   ./dev.sh ask "how do I write a loop?"     ask the local AI
#   ./dev.sh fmt file.nep            format a file
#   ./dev.sh studio                  the editor in your browser (recommended: a terminal cannot
#                                    draw Devanagari properly, a browser can)
# The AI models live in ~/.nepali-ai (llm-large = Qwen2.5-1.5B, llm-small = 0.5B).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
(cd "$ROOT/crates/nepali-core" && cargo build --release --features ai-interop -q)
MODEL=${NEPALI_AI_MODEL_DIR:-$HOME/.nepali-ai/llm-large}
if [ -f "$MODEL/model.gguf" ]; then
  export NEPALI_AI_MODEL_PATH="$MODEL/model.gguf" NEPALI_AI_TOKENIZER_PATH="$MODEL/tokenizer.json"
fi
mkdir -p "$HOME/.nepali"
export NEPALI_DB=${NEPALI_DB:-$HOME/.nepali/os.db}
BIN="$ROOT/crates/nepali-core/target/release/nepali-core-cli"
if [ "${1:-}" = "studio" ]; then
  shift
  NEPALI_BIN="$BIN" exec python3 "$ROOT/studio/studio.py" "$@"
fi
exec "$BIN" "$@"
