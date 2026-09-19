#!/usr/bin/env bash
# Boots the Nepali OS ISO in QEMU on a Mac (x86 emulated on Apple Silicon: slow,
# and the AI is much slower than on real hardware).
#   usage: ./run-qemu.sh [path/to/nepalios-nepali.iso]
#
# At the boot menu press Enter. The Nepali Studio editor is the desktop.
#   Ctrl+Space  switch English <-> phonetic Nepali typing (namaste -> नमस्ते)
#   F5 run   Ctrl+T terminal   Ctrl+E editor   Ctrl+L AI question box
#
# Copy/paste with the Mac: QEMU's own window (the only display type available
# in Homebrew's build here, `cocoa`) cannot share a clipboard with the guest.
# For that, run the same ISO in UTM (https://mac.getutm.app), which uses SPICE;
# the ISO ships the SPICE clipboard agent. Without it, type with Roman input or
# use the Studio's example menu instead of pasting.
cd "$(dirname "$0")"
ISO=${1:-output/nepalios-nepali.iso}
exec qemu-system-x86_64 -m 4096 -smp 4 -vga std -usb -device usb-tablet \
  -nic user,hostfwd=tcp::8080-:8080 -cdrom "$ISO" -boot d
