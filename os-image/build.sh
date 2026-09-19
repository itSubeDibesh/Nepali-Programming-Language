#!/usr/bin/env bash
# Builds a real bootable Debian Live ISO with nepali-core baked in as
# the login shell, plus the same real services (fileserver, DNS) this
# project already ships in the Docker image - built with live-build,
# Debian's own standard tool for this, not a hand-rolled bootloader/
# partition/squashfs pipeline. Run inside the privileged builder
# container (see builder.Dockerfile) - debootstrap/chroot/mount need
# real kernel capabilities a normal container doesn't have.
set -euo pipefail

# ARCH=amd64 (default, BIOS+UEFI) or ARCH=arm64 (UEFI only; use builder-arm64.Dockerfile
# and binaries-arm64/ built for arm64).
ARCH=${ARCH:-amd64}
BIN_DIR=${BIN_DIR:-binaries}

# Real, not a workaround for its own sake: debootstrap needs to create
# real device nodes (mknod /dev/null etc.) inside the chroot it builds,
# and macOS's Docker Desktop bind-mount (virtiofs/gRPC-FUSE, whatever
# /build is here) can't represent Unix device nodes at all - confirmed
# live: "mknod: /build/chroot/test-dev-null: Operation not permitted".
# The fix is to do the actual debootstrap/chroot work on the container's
# own native (overlay/ext4-backed) filesystem, which has no such
# limitation, and only copy the *inputs* in and the final *.iso* out
# across the bind-mount boundary - ordinary file copies are fine there,
# it's specifically special files that aren't.
WORKDIR=/root/build
rm -rf "$WORKDIR"
mkdir -p "$WORKDIR"
cp -r "/build/$BIN_DIR" "$WORKDIR/binaries"
cd "$WORKDIR"

mkdir -p cache

ARCH_FLAGS=""
if [ "$ARCH" = "arm64" ]; then
    ARCH_FLAGS="--architecture arm64 --bootloaders grub-efi"
fi

lb config \
    --distribution bookworm \
    --archive-areas "main" \
    $ARCH_FLAGS \
    --binary-images iso-hybrid \
    --bootappend-live "boot=live components username=nepali hostname=nepalios" \
    --debian-installer none \
    --cache true \
    --cache-packages true

# Real packages this OS's own services actually need at runtime - same
# list as the container Dockerfile (see repo root Dockerfile), so a
# booted ISO has real parity with the container image, not a subset.
# python3-pip/unzip added for the same reason they're in the Dockerfile:
# एआई्बोल्नुहोस् (text-to-speech) needs pip-installed torch/transformers
# in this OS's own python3, and unzip extracts the real speaker
# x-vector from its dataset archive (see the AI section below).
mkdir -p config/package-lists
cat > config/package-lists/nepali.list.chroot <<'EOF'
sqlite3
python3
python3-pip
libpython3.11
curl
unzip
redis-server
redis-tools
dnsutils
EOF

# Real AI model weights, baked directly into the ISO - the same real,
# already-verified files the repo root Dockerfile bakes into the
# container image (see CLAUDE.md's AI section), fetched here on the
# builder's own filesystem (real network access) rather than inside the
# chroot, then placed under config/includes.chroot/ so live-build copies
# them straight into the booted system. Booting this ISO directly should
# give working AI with zero extra setup, the same real requirement the
# container image already satisfies - not a subset.
mkdir -p config/includes.chroot/usr/local/share/nepali-ai/llm
mkdir -p config/includes.chroot/usr/local/share/nepali-ai/whisper
mkdir -p config/includes.chroot/usr/local/share/nepali-ai/tts
curl -L -sf -o config/includes.chroot/usr/local/share/nepali-ai/llm/model.gguf \
    "https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF/resolve/main/qwen2.5-0.5b-instruct-q4_k_m.gguf"
curl -L -sf -o config/includes.chroot/usr/local/share/nepali-ai/llm/tokenizer.json \
    "https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct/resolve/main/tokenizer.json"
curl -L -sf -o config/includes.chroot/usr/local/share/nepali-ai/whisper/model.safetensors \
    "https://huggingface.co/openai/whisper-tiny/resolve/main/model.safetensors"
curl -L -sf -o config/includes.chroot/usr/local/share/nepali-ai/whisper/config.json \
    "https://huggingface.co/openai/whisper-tiny/resolve/main/config.json"
curl -L -sf -o config/includes.chroot/usr/local/share/nepali-ai/whisper/tokenizer.json \
    "https://huggingface.co/openai/whisper-tiny/resolve/main/tokenizer.json"
curl -L -sf -o config/includes.chroot/usr/local/share/nepali-ai/whisper/mel_filters.bytes \
    "https://raw.githubusercontent.com/huggingface/candle/main/candle-examples/examples/whisper/melfilters.bytes"
curl -L -sf -o /tmp/xvectors.zip \
    "https://huggingface.co/datasets/Matthijs/cmu-arctic-xvectors/resolve/main/spkrec-xvect.zip"
unzip -q -j /tmp/xvectors.zip "spkrec-xvect/cmu_us_bdl_arctic-wav-arctic_b0090.npy" \
    -d config/includes.chroot/usr/local/share/nepali-ai/tts
mv config/includes.chroot/usr/local/share/nepali-ai/tts/cmu_us_bdl_arctic-wav-arctic_b0090.npy \
    config/includes.chroot/usr/local/share/nepali-ai/tts/speaker.npy
rm -f /tmp/xvectors.zip

# TTS model+vocoder (a full real HF snapshot each, not a hand-picked
# file list) need the huggingface_hub CLI, which needs Python -
# downloaded here with the builder's own system python3 rather than
# waiting for the chroot's python3 to exist yet.
python3 -m pip install --break-system-packages -q huggingface_hub
python3 -c "
from huggingface_hub import snapshot_download
snapshot_download('aryamanstha/speecht5_tts_nepali_oslr43_tokenizermodified_swos', local_dir='config/includes.chroot/usr/local/share/nepali-ai/tts/model')
snapshot_download('microsoft/speecht5_hifigan', local_dir='config/includes.chroot/usr/local/share/nepali-ai/tts/vocoder')
"

# The already-built real binaries (see binaries/, extracted from
# nepali-os:dev's own image - not rebuilt here, this ISO ships the exact
# same compiled artifacts the Docker image was verified with).
mkdir -p config/includes.chroot/usr/local/bin
mkdir -p config/includes.chroot/usr/local/lib/nepali
cp binaries/nepali config/includes.chroot/usr/local/bin/nepali
cp binaries/nepali-fileserver config/includes.chroot/usr/local/bin/nepali-fileserver
cp binaries/nepali-dnsserver config/includes.chroot/usr/local/bin/nepali-dnsserver
cp binaries/nepali-lib/example-plugin.so config/includes.chroot/usr/local/lib/nepali/example-plugin.so
cp binaries/nepali-lib/go-example-plugin.so config/includes.chroot/usr/local/lib/nepali/go-example-plugin.so
chmod +x config/includes.chroot/usr/local/bin/nepali*

# Real login-shell registration inside the built chroot, executed during
# the build (live-build runs config/hooks/live/*.hook.chroot scripts
# chrooted into the actual live filesystem) - same commands the
# container Dockerfile already uses.
mkdir -p config/hooks/live
cat > config/hooks/live/0100-nepali-user.hook.chroot <<'EOF'
#!/bin/sh
set -e
echo /usr/local/bin/nepali >> /etc/shells
if ! id nepali >/dev/null 2>&1; then
    useradd -m -s /usr/local/bin/nepali nepali
fi
mkdir -p /home/nepali/.nepali/files
chown -R nepali:nepali /home/nepali/.nepali
echo 'NEPALI_DB=/home/nepali/.nepali/os.db' >> /etc/environment
echo 'NEPALI_FILES_DIR=/home/nepali/.nepali/files' >> /etc/environment
# Real, baked-in model paths - एआई्सोध्नुहोस्/एआई्सुन्नुहोस्/एआई्बोल्नुहोस्/
# एजेन्ट्_चलाउनुहोस् all work with zero extra setup the moment this ISO
# boots, matching the container image's own real ENV defaults exactly
# (see the repo root Dockerfile).
echo 'NEPALI_AI_MODEL_PATH=/usr/local/share/nepali-ai/llm/model.gguf' >> /etc/environment
echo 'NEPALI_AI_TOKENIZER_PATH=/usr/local/share/nepali-ai/llm/tokenizer.json' >> /etc/environment
echo 'NEPALI_AI_WHISPER_MODEL_PATH=/usr/local/share/nepali-ai/whisper/model.safetensors' >> /etc/environment
echo 'NEPALI_AI_WHISPER_CONFIG_PATH=/usr/local/share/nepali-ai/whisper/config.json' >> /etc/environment
echo 'NEPALI_AI_WHISPER_TOKENIZER_PATH=/usr/local/share/nepali-ai/whisper/tokenizer.json' >> /etc/environment
echo 'NEPALI_AI_WHISPER_MEL_FILTERS_PATH=/usr/local/share/nepali-ai/whisper/mel_filters.bytes' >> /etc/environment
echo 'NEPALI_AI_WHISPER_LANG=ne' >> /etc/environment
echo 'NEPALI_AI_TTS_MODEL_PATH=/usr/local/share/nepali-ai/tts/model' >> /etc/environment
echo 'NEPALI_AI_TTS_VOCODER_PATH=/usr/local/share/nepali-ai/tts/vocoder' >> /etc/environment
echo 'NEPALI_AI_TTS_SPEAKER_EMBEDDING_PATH=/usr/local/share/nepali-ai/tts/speaker.npy' >> /etc/environment
echo 'NEPALI_AI_TTS_OUTPUT_DIR=/home/nepali/.nepali/tts-output' >> /etc/environment
# Mode marker: presence tells `nepali` this is Nepali OS (full OS mode).
echo 'nepali-os=1' > /etc/nepali-os-release
EOF
chmod +x config/hooks/live/0100-nepali-user.hook.chroot

# Real Python TTS pipeline dependencies inside the actual booted
# system's own python3 - same real packages, same --extra-index-url
# pip gotcha fix, as the container Dockerfile (see CLAUDE.md's AI
# section for why --index-url alone breaks this).
cat > config/hooks/live/0200-nepali-ai-deps.hook.chroot <<'EOF'
#!/bin/sh
set -e
pip3 install --break-system-packages --no-cache-dir \
    torch --extra-index-url https://download.pytorch.org/whl/cpu
pip3 install --break-system-packages --no-cache-dir \
    transformers sentencepiece soundfile numpy
EOF
chmod +x config/hooks/live/0200-nepali-ai-deps.hook.chroot

lb build

mkdir -p /build/output
if [ "$ARCH" = "amd64" ]; then OUT=nepalios.iso; else OUT="nepalios-$ARCH.iso"; fi
cp -v live-image-*.iso "/build/output/$OUT"
