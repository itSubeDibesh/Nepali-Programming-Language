# A real Debian Live ISO builder - live-build is Debian's own, standard
# tool for this (what the real Debian Live CDs are built with), not a
# hand-rolled bootloader/partition/squashfs pipeline. Runs privileged
# (needed for debootstrap/chroot/mount during the build) - see
# build.sh for how this is invoked.
FROM debian:bookworm

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        live-build debootstrap syslinux-common isolinux \
        grub-pc-bin grub-efi-amd64-bin xorriso squashfs-tools \
        mtools dosfstools ca-certificates wget && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /build
