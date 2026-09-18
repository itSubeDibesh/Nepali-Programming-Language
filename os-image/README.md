# NepaliOS bootable ISO

A real, bootable Debian Live ISO with `nepali-core` baked in as the
login shell, plus the same real services (fileserver, DNS) the
container image (repo root `Dockerfile`) ships. Built with `live-build`
- Debian's own standard tool for this (what real Debian Live CDs are
built with), not a hand-rolled bootloader/partition/squashfs pipeline.

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

Output: `output/nepalios.iso` (~340MB).

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
