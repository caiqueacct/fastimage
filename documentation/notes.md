https://www.npmjs.com/package/inquirer

[root@AutoImage conf]# ls -ltr /var/www/html/
total 4
lrwxrwxrwx 1 root root   20 May  8  2018 iso -> /u01/exadata_nfs/iso

# tftp Mac
sudo launchctl load -F /System/Library/LaunchDaemons/tftp.plist 
netstat -an | fgrep \*.69
sudo launchctl unload -F /System/Library/LaunchDaemons/tftp.plist 

# Start the required servers
nginx
sudo tftpd -L -s /usr/local/fastimage/tftpboot/
sudo /bin/launchctl unload -w /System/Library/LaunchDaemons/bootps.plist
sudo /usr/local/sbin/dhcpd -d -4 -f -cf /usr/local/etc/dhcpd.conf
# x6 
sudo /usr/local/sbin/dhcpd -d -4 -f -cf /usr/local/etc/dhcpd.conf.legacy

# Extract image content
cd ~/Documents/Projects/fastimage/bin
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
BASE_DIR=/Users/carlosduarte/Documents/Oracle/Clients/2024/KP/2344XL805K

cd $BASE_DIR
CSV_FILE=`ls *preconf*.csv`
open *.html
clear
echo "CSV File: [${CSV_FILE}]"
ls -ltr ${BASE_DIR}/${CSV_FILE}
cd ~/Documents/Projects/fastimage/classes/fastimage
rm ~/.ssh/known_hosts
node main.js ${BASE_DIR}/${CSV_FILE} -ilom ZdlraRack
