# A real Debian Live ISO builder - live-build is Debian's own, standard
# tool for this (what the real Debian Live CDs are built with), not a
# hand-rolled bootloader/partition/squashfs pipeline. Runs privileged
# (needed for debootstrap/chroot/mount during the build) - see
# build.sh for how this is invoked.
FROM debian:bookworm

# curl/unzip: real downloads of the AI model weights baked into the ISO
# (see build.sh) - the same real files the repo root Dockerfile bakes
# into the container image, fetched here on the builder's own
# filesystem before being placed under config/includes.chroot/ so
# live-build copies them straight into the ISO. python3/python3-pip:
# the TTS model+vocoder are fetched via huggingface_hub's
# snapshot_download (a real full repo snapshot, not a hand-picked file
# list), which needs Python on the builder itself, before the target
# chroot's own python3 even exists yet.
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        live-build debootstrap syslinux-common isolinux \
        grub-pc-bin grub-efi-amd64-bin xorriso squashfs-tools \
        mtools dosfstools ca-certificates wget curl unzip \
        python3 python3-pip && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /build
