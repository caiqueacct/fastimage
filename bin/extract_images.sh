#!/bin/bash

echo "Starting extract images..."
ZIP_FILE=$1
ISO_DIR=/usr/local/fastimage/u01/exadata_nfs/iso/
EFI_DIR=/private/tftpboot/efi/

mkdir -p extracttmp
mkdir -p $ISO_DIR
mkdir -p $EFI_DIR
unzip -o ${ZIP_FILE} -d extracttmp
mv extracttmp/cell* ${ISO_DIR}
mv extracttmp/compute* ${ISO_DIR}
mv extracttmp/initrd* ${EFI_DIR}
mv extracttmp/vmlinux* ${EFI_DIR}
