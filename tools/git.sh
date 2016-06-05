#!/bin/bash
echo To install a private git server on a clean ubuntu14.04. updated:20150116
sudo apt-get install git gitweb nginx git nodejs npm mongodb make gcc ssh vim automake inotify-tools build-essential screen nginx php5-cli php5-common php5-cgi php5-curl php5-fpm php5-json php5-mcrypt php5-mysql php5-sqlite php5-dev php-pear php-apc unzip 
sudo useradd --create-home --shell /bin/bash git
sudo chown -R $USER:git /home/git/
sudo mkdir /home/git/.ssh
sudo git clone git://git.kernel.org/pub/scm/git/git.git /home/git/gitweb
cd /home/git/gitweb
make GITWEB_PROJECTROOT="/usr/share/nginx/html/git" prefix=/usr gitweb

cat <<EOF >VirtualHost.txt
<VirtualHost *:80>
    ServerName gitserver
    DocumentRoot /var/www/gitweb
    <Directory /var/www/gitweb>
        Options ExecCGI +FollowSymLinks +SymLinksIfOwnerMatch
        AllowOverride All
        order allow,deny
        Allow from all
        AddHandler cgi-script cgi
        DirectoryIndex gitweb.cgi
    </Directory>
</VirtualHost>
EOF


