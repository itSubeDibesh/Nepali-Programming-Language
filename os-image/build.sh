#!/usr/bin/env bash
# Builds a real bootable Debian Live ISO with nepali-core baked in as
# the login shell, plus the same real services (fileserver, DNS) this
# project already ships in the Docker image - built with live-build,
# Debian's own standard tool for this, not a hand-rolled bootloader/
# partition/squashfs pipeline. Run inside the privileged builder
# container (see builder.Dockerfile) - debootstrap/chroot/mount need
# real kernel capabilities a normal container doesn't have.
set -euo pipefail

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
cp -r /build/binaries "$WORKDIR/binaries"
cd "$WORKDIR"

mkdir -p cache

lb config \
    --distribution bookworm \
    --archive-areas "main" \
    --binary-images iso-hybrid \
    --bootappend-live "boot=live components username=nepali hostname=nepalios" \
    --debian-installer none \
    --cache true \
    --cache-packages true

# Real packages this OS's own services actually need at runtime - same
# list as the container Dockerfile (see repo root Dockerfile), so a
# booted ISO has real parity with the container image, not a subset.
mkdir -p config/package-lists
cat > config/package-lists/nepali.list.chroot <<'EOF'
sqlite3
python3
libpython3.11
curl
redis-server
redis-tools
dnsutils
EOF

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
EOF
chmod +x config/hooks/live/0100-nepali-user.hook.chroot

lb build

mkdir -p /build/output
cp -v live-image-*.iso /build/output/nepalios.iso
