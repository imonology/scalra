#!/bin/bash
# Just use vim, change the format (:set fileformat=unix) and then write out (:wq) the file.

echo This script installs Scalra and KMS for clean Ubuntu14.04 locally. Updated:20160323
echo 
echo This script is not fully automatic. Some manual operations are necessary. 

WHOAMI=$(whoami)
if [ "root" == "$WHOAMI" ]
then
	echo The account running this script should have sudoer permission. But you should not run this script with sudo directly.
fi
read -p "Press any key to continue..." -n1 -s

echo -n ""
echo "##########"
echo "# Installing NodeJS, System Packages, Creating User and Setup Environment."
echo "##########"

echo -n ""
echo "##########"
echo "Installing system package"
sudo apt-get update
sudo apt-get -y install curl wget
#sudo add-apt-repository ppa:chris-lea/node.js
#curl -sL https://deb.nodesource.com/setup_0.12 | sudo bash -
curl -sL https://deb.nodesource.com/setup | sudo bash -
for i in git nodejs mongodb make gcc ssh vim automake inotify-tools build-essential screen php5-cli php5-common php5-cgi php5-curl php5-mongo php5-fpm php5-json php5-mcrypt php5-mysql php5-sqlite php5-dev php-pear php-apc unzip
#nginx
do
	sudo apt-get -y install $i
done
#sudo ln -sv /usr/bin/nodejs /usr/bin/node # upstream has this alias already

echo -n ""
echo "##########"
echo "Create user account (scalra and git)"
sudo useradd --create-home --shell /bin/bash scalra
sudo adduser scalra sudo
sudo useradd --create-home --shell /bin/bash git
sudo mkdir -pv /home/scalra/users/scalra/ /home/git/.ssh/

echo -n ""
echo "##########"
echo "Clone Scalra"
git config --global credential.helper "cache --timeout=3600000"
sudo rm -rf /home/scalra/users/scalra/Scalra
sudo git clone --depth=1 -b dev https://github.com/imonology/SR.git /home/scalra/users/scalra/Scalra/
cd /home/scalra/users/scalra/Scalra
sudo npm install
cd -
sudo cp -av /home/scalra/users/scalra/Scalra/config.js.example /home/scalra/users/scalra/Scalra/config.js #(並將內部設定改成符合此電腦)
sudo chown -R $USER:scalra /home/scalra
cd /home/scalra/users/scalra/Scalra/dev
npm install memcached
npm install sockjs
npm install fb
npm install twilio
npm install
sudo chown -R $USER:$USER ~/.git*


echo -n ""
echo "##########"
echo "Now linking Scalra to /usr/lib/nodejs/scalra, we should really avoid doing this when Scalra can be installed as nodejs module using \`npm\`"
sudo ln -sv /home/scalra/users/scalra/Scalra /usr/lib/nodejs/scalra
sudo ln -sv /home/scalra/users/scalra/Scalra /usr/lib/nodejs/SR
sudo ln -sv /home/scalra/users/scalra/Scalra /home/scalra/users/scalra/Scalra/dev/node_modules/scalra

#git clone https://github.com/imonology/icpm.git /home/scalra/users/scalra/icpm/
#git clone -b dev https://github.com/imonology/Hydra.git 
#mv -iv Hydra/doc/clone.sh ./
#rm -Rf Hydra

echo -n ""
echo "##########"
echo "Install RockMongo"
sudo apt-get install php-pear php5-dev
sudo pecl install mongo
echo "extension=mongo.so" | sudo tee -a /etc/php5/cgi/php.ini
echo "extension=mongo.so" | sudo tee -a /etc/php5/cli/php.ini
sudo /etc/init.d/lighttpd restart
#sudo rm -rf /usr/share/nginx/html/rockmongo/ /var/www/rkmg/
sudo mkdir /var/www/
git clone --depth=1 https://github.com/iwind/rockmongo.git ~/rkmg/
sudo mv -iv ~/rkmg /var/www/

echo -n ""
echo "##########"
echo "Adding MongoDB dbadmin account"
sudo /etc/init.d/mongodb start
mongo <<EOF
use admin
db.addUser("dbadmin", "dbadmin-pass");
quit();
EOF

echo -n ""
echo "##########"
echo "Tune system in /etc/security/limits.conf and pam"
sudo chmod o+w /etc/security/limits.conf
echo \* soft nofile  99999 | tee -a /etc/security/limits.conf
echo \* hard nofile 111111 | tee -a /etc/security/limits.conf
sudo chmod o-w /etc/security/limits.conf
sudo -S chmod o+w /etc/pam.d/common-session
echo session required pam_limits.so | tee -a /etc/pam.d/common-session
echo $remoteAdminPassword | sudo -S chmod o-w /etc/pam.d/common-session

echo "##########"
echo "Installing Kurento"
echo "Purge KMS5 and upgrade to KMS6"
sudo apt-get -y remove kurento-media-server --purge
sudo apt-get -y install git nodejs software-properties-common cmake
echo "deb http://ubuntu.kurento.org trusty kms6" | sudo tee /etc/apt/sources.list.d/kurento.list
wget -O - http://ubuntu.kurento.org/kurento.gpg.key | sudo apt-key add -
sudo apt-get update
sudo apt-get -y install kurento-media-server-6.0
sudo apt-get -y install openh264-gst-plugins-bad-1.5

echo DAEMON_USER=`whoami` | sudo tee -a /etc/default/kurento-media-server-6.0

cd ~
sudo npm install -g http-server bower
#git clone https://github.com/Kurento/kurento-tutorial-js.git 
git clone https://github.com/lulop-k/kurento-rtsp2webrtc.git
cd kurento-rtsp2webrtc
bower install --allow-root

sudo update-rc.d kurento-media-server-6.0 disable
sudo update-rc.d kurento-media-server disable

echo -n ""
echo "##########"
echo "Now you need to:"
echo "* Modify /home/scalra/users/scalra/SR/config.js"
echo '* Edit /var/www/rkmg/config.php and set $MONGO["servers"][$i]["mongo_auth"] = true; to allow login from rockmongo'
echo "* re-start this terminal prompt "
#echo "* Edit /etc/nginx/sites-enabled/default: change root to 'root /var/www/;', add 'index.php' into index, uncomment php settings to enable php-fpm support"
#echo "* restart nginx, php5-fpm, and mongodb"
echo "* restart mongodb"

