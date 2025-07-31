https://www.npmjs.com/package/inquirer

[root@AutoImage conf]# ls -ltr /var/www/html/
total 4
lrwxrwxrwx 1 root root   20 May  8  2018 iso -> /u01/exadata_nfs/iso

# IMPORTANT NOTES
# Check if the laptop IP is the same configured for the nginx: "httpServer": "http://192.168.1.251",
# The new servers come with secure boot enable. Disable secure boot before run the process

# tftp Mac
sudo launchctl unload -F /System/Library/LaunchDaemons/tftp.plist 
sudo launchctl load -F /System/Library/LaunchDaemons/tftp.plist 
netstat -an | fgrep \*.69

# nginx
/opt/homebrew/etc/nginx/nginx.conf

# Start the required servers
sudo nginx -g "daemon off;" 
<!-- sudo tftpd -L -s /usr/local/fastimage/tftpboot/ -->
sudo /bin/launchctl unload -w /System/Library/LaunchDaemons/bootps.plist
# Mac 13
sudo /opt/homebrew/sbin/dhcpd -d -4 -f -cf /usr/local/etc/dhcpd.conf
# Mac 15
sudo /opt/homebrew/opt/isc-dhcp/sbin/dhcpd -d -4 -f -cf /opt/homebrew/etc/dhcpd.conf

# x6 
sudo /opt/homebrew/sbin/dhcpd -d -4 -f -cf /usr/local/etc/dhcpd.conf.legacy

# Extract image content
cd ~/Documents/Projects/fastimage/bin
ls -ltr ~/Downloads/V*.zip
ls ~/Downloads/V*.zip | while read i
do
echo "Extracting ${i}"
./extract_images.sh ${i}
done

ls -ltr /usr/local/fastimage/u01/exadata_nfs/iso/

# Re-image the servers
# If required change the settings from the ILOM on file @/classes/fastimage/config/config.json
ps -ef | grep tftpd
ps -ef | grep dhcpd
ps -ef | grep nginx
BASE_DIR=$(pwd)

cd $BASE_DIR
CSV_FILE=`ls *preconf*.csv`
open *.html
clear
echo "CSV File: [${CSV_FILE}]"
ls -ltr ${BASE_DIR}/${CSV_FILE}
cd ~/Documents/Projects/fastimage/classes/fastimage
rm ~/.ssh/known_hosts
<!-- node main.js ${BASE_DIR}/${CSV_FILE} -ilom reimage -->
node main.js ${BASE_DIR}/${CSV_FILE} -ilom Custom

<!-- BOOT MENU -->
<!-- Copyright (C) 2023, 2024 Oracle and/or its affiliates.                          
Version 2.22.1294. Copyright (C) 2024 AMI                                       
BIOS Date: 11/25/2024 10:36:57 Ver: 90010600                                    
Press F2 to run Setup (CTRL+E on serial keyboard)                               
Press F8 for BBS Popup (CTRL+P on serial keyboard)                              
Press F12 for network boot (CTRL+N on serial keyboard)  -->