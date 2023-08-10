#!/bin/bash

set -x
sudo /bin/launchctl unload -w /System/Library/LaunchDaemons/bootps.plist
sudo /usr/local/sbin/dhcpd -d -4 -f -cf /usr/local/etc/dhcpd.conf