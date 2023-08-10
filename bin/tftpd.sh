#!/bin/bash

echo "Starting local tftpd"
set -x
sudo tftpd -L -s /usr/local/fastimage/tftpboot/