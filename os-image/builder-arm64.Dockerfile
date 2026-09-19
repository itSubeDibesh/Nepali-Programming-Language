# ARM64 twin of builder.Dockerfile: builds an arm64 Debian Live ISO (UEFI boot
# via GRUB, no isolinux/BIOS) on an arm64 host, natively - no emulation. Used
# for a fast Nepali OS on Apple Silicon (UTM/QEMU with the hypervisor).
FROM debian:bookworm
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        live-build debootstrap grub-efi-arm64-bin grub-common xorriso squashfs-tools \
        mtools dosfstools ca-certificates wget curl unzip python3 python3-pip && \
    rm -rf /var/lib/apt/lists/*
WORKDIR /build
