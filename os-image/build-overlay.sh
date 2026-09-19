#!/usr/bin/env bash
# Adds the Nepali (Devanagari) console, keyboard, font and boot theme to an
# already-built nepalios.iso WITHOUT rebuilding it: a second squashfs layer
# (/live/nepali-overlay.squashfs, which live-boot stacks on top of
# filesystem.squashfs) plus in-place edits to the boot menu files.
#
# usage: ./build-overlay.sh [in.iso] [out.iso] [nepali-binary]
#   ARCH=arm64 ./build-overlay.sh ...   for an arm64 ISO (UEFI/GRUB only).
#   nepali-binary: optional build of the `nepali` shell to drop into
#   /usr/local/bin (e.g. to pick up shell changes without a full rebuild).
set -euo pipefail
cd "$(dirname "$0")"
ARCH=${ARCH:-amd64}
IN=${1:-output/nepalios.iso}
OUT=${2:-output/nepalios-nepali.iso}
BIN=${3:-}
W=$(mktemp -d)
trap 'rm -rf "$W"' EXIT
mkdir -p "$W/out"

xorriso -osirrox on -indev "$IN" \
  -extract /live/filesystem.packages "$W/iso.packages" \
  -extract /live/filesystem.squashfs "$W/base.squashfs" >/dev/null 2>&1
unsquashfs -cat "$W/base.squashfs" etc/environment > "$W/environment"

# Debian packages the base ISO lacks: a minimal X server, lxterminal and
# the GTK editor's Python bindings (GTK/VTE shape Devanagari correctly; the
# kernel console and kmscon can't), Devanagari fonts and the SPICE clipboard
# agent. (Phonetic Roman->Nepali typing is built into the editor itself:
# overlay/usr/local/lib/nepali/translit.py.)
docker run --rm --platform "linux/$ARCH" \
  -v "$W/iso.packages:/iso.packages:ro" -v "$W/out:/out" debian:bookworm bash -c '
  apt-get update -qq >/dev/null 2>&1
  apt-get install -s --no-install-recommends xserver-xorg-core xserver-xorg-input-libinput xinit x11-xserver-utils x11-xkb-utils lxterminal fonts-lohit-deva fonts-dejavu-core fontconfig-config \
    libglib2.0-bin libgdk-pixbuf2.0-bin python3-gi gir1.2-gtk-3.0 gir1.2-vte-2.91 spice-vdagent fonts-noto-core \
    | awk "/^Inst/{print \$2}" | sort > /want
  cut -f1 /iso.packages | sed "s/:.*//" | sort > /have
  comm -23 /want /have > /new
  mkdir -p /out/debs /out/root && cd /out/debs
  apt-get download $(cat /new) >/dev/null 2>&1
  for d in *.deb; do dpkg-deb -x "$d" /out/root; done
  # The base is usr-merged (/lib, /bin, /sbin are symlinks into /usr). A real
  # /sbin or /lib directory in this layer would hide those symlinks and the
  # system would lose /sbin/init - so fold them into /usr.
  cd /out/root
  for d in bin sbin lib lib64; do
    if [ -d "$d" ] && [ ! -L "$d" ]; then
      mkdir -p "usr/$d" && cp -a "$d"/. "usr/$d"/ && rm -rf "$d"
    fi
  done'

cp -R overlay/etc overlay/usr "$W/out/root/"
# Optional: bundle a larger model (a small one can't write this language\
# reliably; Qwen2.5-1.5B-Instruct q4_k_m scored 5/6 vs 3/6 on a code-writing\
# check). Set NEPALI_BUNDLE_MODEL=/path/to/model.gguf.
{
  if [ -n "${NEPALI_BUNDLE_MODEL:-}" ]; then
    grep -v '^NEPALI_AI_MODEL_PATH=' "$W/environment"
    echo "NEPALI_AI_MODEL_PATH=/usr/local/share/nepali-ai/llm-large/model.gguf"
    mkdir -p "$W/out/root/usr/local/share/nepali-ai/llm-large"
    cp "$NEPALI_BUNDLE_MODEL" "$W/out/root/usr/local/share/nepali-ai/llm-large/model.gguf"
  else
    cat "$W/environment"
  fi
  echo "LANG=C.UTF-8"
} > "$W/out/root/etc/environment"

# Learn-by-example programs shown in the editor's example menu.
mkdir -p "$W/out/root/usr/share/nepali/examples"
cp ../examples/[0-9]*.nep ../examples/README.md "$W/out/root/usr/share/nepali/examples/"
cp -R ../examples/lib "$W/out/root/usr/share/nepali/examples/lib"
if [ -n "$BIN" ]; then
  mkdir -p "$W/out/root/usr/local/bin"
  install -m 755 "$BIN" "$W/out/root/usr/local/bin/nepali"
fi
mksquashfs "$W/out/root" "$W/nepali-overlay.squashfs" -comp xz -noappend -quiet

rm -f "$OUT"
python3 make-splash.py "$W/splash.png" 640 480
python3 make-splash.py "$W/splash800.png" 800 600

# GRUB menu (the only bootloader on arm64, and the UEFI path on amd64): rename the
# entries and boot quietly, derived from the ISO's own grub.cfg so kernel names match.
xorriso -osirrox on -indev "$IN" -extract /boot/grub/grub.cfg "$W/grub.orig" >/dev/null 2>&1
sed -E -e 's/Live system \((amd64|arm64)\)/Nepali OS (Nepali language)/' \
    -e 's/Live system \((amd64|arm64) fail-safe mode\)/Nepali OS (fail-safe mode)/' \
    -e '/fail-safe/!s/components username=nepali hostname=nepalios/components username=nepali hostname=nepalios quiet loglevel=3 systemd.show_status=false/' \
    "$W/grub.orig" > "$W/grub.cfg"

MAPS=(-map "$W/nepali-overlay.squashfs" /live/nepali-overlay.squashfs -map "$W/grub.cfg" /boot/grub/grub.cfg)
if [ "$ARCH" = "amd64" ]; then
  MAPS+=(-map overlay/boot-menu/live.cfg /isolinux/live.cfg
         -map overlay/boot-menu/menu.cfg /isolinux/menu.cfg
         -map overlay/boot-menu/stdmenu.cfg /isolinux/stdmenu.cfg
         -map "$W/splash.png" /isolinux/splash.png
         -map "$W/splash800.png" /isolinux/splash800x600.png)
fi
xorriso -indev "$IN" -outdev "$OUT" -boot_image any replay "${MAPS[@]}" -commit >/dev/null
echo "wrote $OUT"
