# NepaliOS bootable ISO

A real, bootable Debian Live ISO with `nepali-core` baked in as the
login shell, plus the same real services (fileserver, DNS) *and* the
same real AI models (LLM, Whisper speech-to-text, SpeechT5
text-to-speech - see `CLAUDE.md`'s AI section) the container image
(repo root `Dockerfile`) ships - booting this ISO gives working AI with
zero extra setup, the same real requirement the container image already
satisfies, not a subset. Built with `live-build` - Debian's own standard
tool for this (what real Debian Live CDs are built with), not a
hand-rolled bootloader/partition/squashfs pipeline.

## Build

```bash
# 1. Build the app image for amd64 (the ISO targets real x86_64
#    hardware/VMs, cross-compiled here via QEMU emulation if you're on
#    Apple Silicon - this step is slow, real Rust deps being compiled).
cd ..  # repo root
docker build --platform linux/amd64 -t nepali-os:amd64 .

# 2. Extract the compiled binaries from that image.
cd os-image
mkdir -p binaries
CID=$(docker create --platform linux/amd64 nepali-os:amd64)
docker cp $CID:/usr/local/bin/nepali binaries/nepali
docker cp $CID:/usr/local/bin/nepali-fileserver binaries/nepali-fileserver
docker cp $CID:/usr/local/bin/nepali-dnsserver binaries/nepali-dnsserver
docker cp $CID:/usr/local/lib/nepali binaries/nepali-lib
docker rm $CID

# 3. Build the ISO builder image (installs live-build + debootstrap +
#    grub/isolinux/xorriso - amd64 packages, so this also needs
#    --platform linux/amd64 on Apple Silicon).
docker build --platform linux/amd64 -f builder.Dockerfile -t nepali-os-builder .

# 4. Run the real build. --privileged is required: debootstrap creates
#    real device nodes (mknod) inside the chroot it builds, which needs
#    real kernel capabilities a normal container doesn't have.
docker run --rm --privileged --platform linux/amd64 \
    -v "$(pwd)":/build \
    nepali-os-builder \
    bash /build/build.sh
```

Output: `output/nepalios.iso` (~340MB before the AI models were baked
in; expect several GB now that the same real LLM/Whisper/TTS weights
and `torch`/`transformers` the container image bakes in are included
too - see `build.sh`'s real `curl`/`huggingface_hub`/`pip3` steps).

**Why the build happens on the container's own filesystem, not the
bind mount** (see `build.sh`): macOS's Docker Desktop bind mount can't
represent Unix device nodes - `debootstrap` needs to create real
`/dev/null` etc. inside the target chroot, and hit a real, reproduced
failure (`mknod: ... Operation not permitted`) when attempted directly
on the bind-mounted `/build`. Fixed by copying inputs in, doing the
actual `debootstrap`/`lb build` work on `/root/build` (the container's
native, overlay/ext4-backed filesystem), and only copying the final
`.iso` back out across the bind-mount boundary - ordinary file copies
are fine there, it's specifically special files that aren't.

## Verify

```bash
qemu-system-x86_64 -m 2048 -cdrom output/nepalios.iso -boot d
```

Verified for real during development, not just built and assumed to
work: real GRUB boot menu (`Debian GNU/Linux 12 (bookworm) amd64`),
real boot to `nepalios login: nepali (automatic login)`, landing
directly in the real `nep:/home/nepali $` shell prompt - the actual
`nepali-core` interpreter/shell, not a placeholder. `uname -a` inside
the booted VM returned a real `Linux nepalios 6.1.0-53-amd64 ...
x86_64 GNU/Linux` (real external-command routing working), and `which
nepali-fileserver` resolved to the real installed binary at
`/usr/local/bin/nepali-fileserver`.


## Nepali Studio, typing and theme (no rebuild needed)

`build-overlay.sh` upgrades an already-built ISO in about a minute instead of
the ~1 hour full build. It adds a second squashfs layer that live-boot stacks
on the base system, and patches the boot menu in place.

```bash
cd os-image
# optional: NEPALI_BUNDLE_MODEL=/path/to/qwen2.5-1.5b-instruct-q4_k_m.gguf  (bigger AI)
./build-overlay.sh output/nepalios.iso output/nepalios-nepali.iso [amd64-nepali-binary]
./run-qemu.sh output/nepalios-nepali.iso
```

What it gives you:

- **Nepali Studio** (`overlay/usr/local/bin/nepali-studio`, GTK) is the desktop:
  editor, output, an embedded terminal, an AI pane, an examples menu, and a
  clickable keyword cheat sheet. GTK lays out Devanagari properly - a terminal's
  fixed cell grid cannot (gaps, broken vowel signs), which is why the plain Linux
  console and kmscon were dropped.
- **Typing without Devanagari**: Ctrl+Space switches to phonetic mode
  (`overlay/usr/local/lib/nepali/translit.py`): `namaste` becomes नमस्ते, and a
  finished word that is a language keyword becomes the real keyword
  (`bhana` -> भनौँ, `lambai` -> लम्बाइ). `|` types the sentence end `।`. Every
  builtin also has a Latin name (`ai_sodhnuhos`), so whole programs work on any
  keyboard. Unit tests: `python3 -m unittest discover -s tests`.
- **AI** that knows the language and the OS (see CLAUDE.md), default model
  Qwen2.5-1.5B when bundled.
- Nepal-flag boot menu, quiet boot, Nepali prompt and messages.

Verified in QEMU on the real ISO: Devanagari renders correctly; typing only ASCII
(`rakha x = 5 |`, `bhana("namaste sansaar", x + 1) |`) produced the Devanagari
program and F5 printed `नमस्ते सन्सार 6`. Not verified: UEFI boot of the patched
ISO, real hardware. Copy/paste with the Mac is impossible in QEMU's `cocoa`
window (no clipboard support); use UTM for that.


## ARM64 build (fast on Apple Silicon)

The x86_64 ISO runs under CPU emulation on an M-series Mac (slow: minutes for one AI
answer). An arm64 ISO runs with the hypervisor at near-native speed.

```bash
# 1. arm64 binaries (native build, ~10 min): docker build -f <Dockerfile of crates/nepali-core> ...
#    plus fileserver/dnsserver/plugins from an arm64 image into os-image/binaries-arm64/
docker build -f builder-arm64.Dockerfile -t nepali-os-builder-arm64 .
docker run --rm --privileged -e ARCH=arm64 -e BIN_DIR=binaries-arm64 -v "$(pwd)":/build nepali-os-builder-arm64 bash /build/build.sh
ARCH=arm64 NEPALI_BUNDLE_MODEL=~/.nepali-ai/llm-large/model.gguf ./build-overlay.sh output/nepalios-arm64.iso output/nepalios-nepali-arm64.iso /path/to/arm64/nepali
```

**Run it on a Mac** (UEFI only; verified with QEMU + Apple's hypervisor):

```bash
qemu-system-aarch64 -M virt -accel hvf -cpu host -m 6144 -smp 6 \
  -bios "$(brew --prefix)/share/qemu/edk2-aarch64-code.fd" \
  -device virtio-gpu-pci -device qemu-xhci -device usb-kbd -device usb-tablet \
  -drive if=none,id=cd,media=cdrom,file=output/nepalios-nepali-arm64.iso,readonly=on \
  -device virtio-scsi-pci -device scsi-cd,drive=cd,bootindex=0 -nic user
```

**UTM** (`/Applications/UTM.app`): New VM -> **Virtualize** -> Linux -> pick the arm64 ISO;
6-8 GB RAM, 4-6 cores, display virtio-gpu (or virtio-ramfb), tick "UEFI boot"; Shared
network. Press Enter at the GRUB menu; the Studio desktop appears after ~45 s. UTM's SPICE
display is what makes host copy/paste possible (the ISO ships the SPICE agent; untested).

**How the GUI is reached**: nothing to open - the Studio *is* the desktop (autologin, no
password). Text consoles: Ctrl+Alt+F2..F6 (they print Roman letters automatically, since
the Linux console cannot draw Devanagari). Ctrl+T opens the shell inside the Studio.
