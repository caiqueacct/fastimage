#!/bin/bash

ZIP_FILE=$1
ISO_DIR=/usr/local/fastimage/u01/exadata_nfs/iso/
EFI_DIR=/usr/local/fastimage/tftpboot/efi/

mkdir extracttmp
unzip -o ${ZIP_FILE} -d extracttmp
mv extracttmp/cell* ${ISO_DIR}
mv extracttmp/compute* ${ISO_DIR}
mv extracttmp/initrd* ${EFI_DIR}
mv extracttmp/vmlinux* ${EFI_DIR}