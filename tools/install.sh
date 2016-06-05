#!/bin/bash
# updated: 20141205 mochechan
# The computer invoked this script must have sshpass.  sudo apt-get -y install sshpass #用於: 遠端未裝 ssh public key 前，自動輸入密碼 
# sudo apt-get install git
# todo: 解決目前只能相容 f3jr, ubuntu 14.04LTS


############ configuration
SRmode=localhost
SRIP=$1
remoteAdminUsername=$2
scalraAccount=$3
scalraPassword=$4
############ end of configuration


############ to detect OS type on this computer
platform='unknown'
unamestr=`uname`
if [[ "$unamestr" == 'Linux' ]]; then
   platform='linux'
elif [[ "$unamestr" == 'FreeBSD' ]]; then
   platform='freebsd'
elif [ "$OSTYPE" == "darwin14" ]; then
  platform="OSX"
fi
echo OS type: $platform 
echo SR-install: checking localhost information 
lsb_release -a 
#dpkg -l | grep -in sshpass
sshpass -V 
if [ $? -gt 0 ]; then
    
    for i in `seq 1 1000`;
    do
        sudo apt-get -y -q -q install sshpass 
        if [ $? -eq 0 ]; then 
            break;
        fi
        echo "Failed. Trying again..." >&2
        sleep 3
    done
else
    echo The sshpass is already installed.
fi
############ end of detection.


############ functions 
function ec {
    errorlevel=$?
    echo Current errorlevel: $errorlevel 
    if [ "$errorlevel" -gt "0" ]; then 
        echo SR-install: The current errorlevel code is invalid. Please check. 
        exit 99;
    else 
        echo SR-install: 
    fi
}

function cp2 {
    echo copying "$1"  
    rsync -avz -e ssh "$1" $remoteAdminUsername@$SRIP:~/ 
    rsync -avz -e ssh "$1" $SRaccount@$SRIP:~/
    rsync -avz -e ssh "$1" scalra@src.scalra.com:~/users/scalra/Scalra/tools/ 
}

function quit {
  echo PLEASE NOTSRE:
  echo 1. This script is going to install Scalra, or SR, for a new ubuntu server. $(date) 
  echo 2. The server with sshd can be either local or remote. 
  echo 3. Installation period sould be in about 30 minutes. 
  echo Usage: $(which $0) RemoteIP administratorName scalraAccount scalraPassword 
  exit 99;
}
############ end of functions


############ probe remote server
if [ "$SRIP" == "" ]; then
    echo No server ip/fqdn 
    quit
fi
ping -c 2 $SRIP 
#ec # Just comment this line if remote server cannot be pinged. 

ssh-keygen -v -f "/home/a/.ssh/known_hosts" -R $SRIP # to remove trust 
echo SR-install: remote administrator username: $remoteAdminUsername
read -s -p "SR-install: Please Enter remote administrator password: " remoteAdminPassword #遠端管理者密碼 sudoer
ec

#todo: 解決 read 輸入特殊字元，例如密碼有 ; / ( ) 這類 bash 吃不下的字元，就會出狀況 

echo SR-install: checking remote server information 
sshpass -p "$remoteAdminPassword" ssh -o StrictHostKeyChecking=no $remoteAdminUsername@$SRIP "( hostname --all-fqdns ; hostname --all-ip-addresses ; lsb_release -a ; uname -a) "
ec
############ probe remote server


############ probe SR
#todo: 測試看是否已安裝 SR 目前拿不定用什麼方法判斷比較好 
sshpass -p "$remoteAdminPassword" ssh -o StrictHostKeyChecking=no $remoteAdminUsername@$SRIP "( ls /home/scalra/ ) "
if [ $? -gt 0 ]; then
  echo The scalra account is never to be created. Installation is continue. 
else 
  echo The scalra account is already created. Installation is aborted.
  exit 99;
fi

#echo to do determing OS type on remote computer
############ end of probe SR


echo SR-install: 請注意上述訊息是否異常，含 hostname IP address 等, 若異常則在此中斷。
echo SR-install: Please check previous message, including hostname, IP address. Break this script if any abnormal occurring. 

#source _bashrc 


############ install administrator ssh keys to remote server
echo SR-install: to install authorized_keys for administrator ssh 
if [ -f ~/.ssh/id_rsa ]; then
    echo private key exists, using current public key directly
else
    echo private key not found, generating a new key pair now, please press enter about 3 times
    ssh-keygen -t rsa -N "" -f ~/.ssh/id_rsa -v 
    #ssh-keygen -v 
fi
sshpass -p "$remoteAdminPassword" ssh-copy-id -o StrictHostKeyChecking=no $remoteAdminUsername@$SRIP #copy public key to the remote server
ec


############ to enlarge limitations
# http://stackoverflow.com/questions/5321432/simple-nodejs-http-proxy-fails-with-too-many-open-files/5323112#5323112
echo
echo increase file handler settings 
ssh  $remoteAdminUsername@$SRIP "grep 'soft nofile' /etc/security/limits.conf "
if [ $? -gt 0 ]; then
    echo soft nofile not found 
else
    echo soft nofile exists
fi

ssh  $remoteAdminUsername@$SRIP "echo $remoteAdminPassword | sudo -S chmod o+w /etc/security/limits.conf "
ssh  $remoteAdminUsername@$SRIP "echo \* soft nofile  99999 | tee -a /etc/security/limits.conf "  
ssh  $remoteAdminUsername@$SRIP "echo \* hard nofile 111111 | tee -a /etc/security/limits.conf "  
ssh  $remoteAdminUsername@$SRIP "echo $remoteAdminPassword | sudo -S chmod o-w /etc/security/limits.conf "

ssh  $remoteAdminUsername@$SRIP "echo $remoteAdminPassword | sudo -S chmod o+w /etc/pam.d/common-session "
ssh  $remoteAdminUsername@$SRIP "echo session required pam_limits.so | tee -a /etc/pam.d/common-session " 
ssh  $remoteAdminUsername@$SRIP "echo $remoteAdminPassword | sudo -S chmod o-w /etc/pam.d/common-session "
############ end of enlarge


echo 
echo SR-install: 執行 sudo apt-get 安裝一些必要的...

for i in `seq 1 1000`;
do
    ssh $remoteAdminUsername@$SRIP "echo $remoteAdminPassword | sudo -S apt-get -y -q --quiet update " 
    if [ $? -eq 0 ]; then
        break;
    fi
    echo "Failed. Trying again..." >&2
    sleep 3
done
    
#for i in `seq 1 1000`; 
#do
#    ssh $remoteAdminUsername@$SRIP "echo $remoteAdminPassword | sudo -S apt-get -y -q --quiet upgrade " 
#    if [ $? -eq 0 ]; then
#        break;
#    fi
#    echo "Failed. Trying again..." >&2
#    sleep 3
#done

#for i in `seq 1 1000`;
#do
#    ssh $remoteAdminUsername@$SRIP "echo $remoteAdminPassword | sudo -S apt-get -y -q --quiet dist-upgrade " 
#    if [ $? -eq 0 ]; then
#        break;
#    fi 
#    echo "Failed. Trying again..." >&2
#    sleep 3
#done

for i in `seq 1 1000`;
do
    ssh $remoteAdminUsername@$SRIP "echo $remoteAdminPassword | sudo -S apt-get -y -q -q --install-recommends --auto-remove --fix-broken --quiet install screen git nodejs npm mongodb mongodb-server ncdu vim make gcc unzip inotify-tools psmisc "
    if [ $? -eq 0 ]; then 
        break;
    fi
    echo "Failed. Trying again..." >&2
    sleep 3
done


#centos: yum -y update 
#centos: yum -y install screen 
#centos: yum -y groupinstall "Development Tools"
#centos: yum -y install curl-devel

#mkdir -pv installing 
#cd installing
# wget https://www.kernel.org/pub/software/scm/git/git-2.0.2.tar.xz
# ./configure
# make 
# make install 
# wget http://nodejs.org/dist/v0.11.9/node-v0.11.9.tar.gz

# 下載最新穩定版 
# wget http://nodejs.org/dist/v0.10.29/node-v0.10.29.tar.gz
#  tar -zxf node-v0.10.29.tar.gz 
# cd node-v0.10.29 
# ./configure
# make 
# make install 



############ 處理 scalra 帳號 
# todo: 支援直接使用既有的 scalra account, 而不建一個 

echo
echo SR-install: Creating SR account for the remote server
if [ "$scalraAccount" == "" ]; then
    SRaccount=scalra #SR 帳戶
else 
    SRaccount=$scalraAccount
fi

ssh $remoteAdminUsername@$SRIP " id $SRaccount " #判斷是否帳號已存在 
if [ $? -gt 0 ]; then
    echo no scalra account, creating a new scalra account 
else
    echo "This SR account exists. Please keyin new password for consequent installations. "
    echo "$SRpassword"
    #todo 如果已存在，直接用現有的
    ssh $remoteAdminUsername@$SRIP "echo $remoteAdminPassword | sudo -S passwd $SRaccount"
    
fi

if [ "$scalraPassword" == "" ]; then
    SRpassword=scalra #SR 帳戶的密碼
else
    SRpassword=$scalraPassword
fi

# todo: 試一下目前能否登入 scalra account 


SRpass=$(perl -e 'print crypt($ARGV[0], "password")' $SRpassword)
ssh $remoteAdminUsername@$SRIP "echo $remoteAdminPassword | sudo -S useradd --create-home --shell /bin/bash --password $SRpass $SRaccount " #新增 SR 帳號 
sshpass -p "$SRpassword" ssh-copy-id -o StrictHostKeyChecking=no $SRaccount@$SRIP #to install authorized_keys for ssh


# todo: 若是 vmware 則另外加入 chan account 
#echo adding chan account 
#CHANpass=$(perl -e 'print crypt($ARGV[0], "password")' CHAN)
#ssh $remoteAdminUsername@$SRIP "echo $remoteAdminPassword | sudo -S useradd --create-home --shell /bin/bash --password $CHANpass chan " 
#sshpass -p "CHAN" ssh-copy-id -o StrictHostKeyChecking=no chan@$SRIP

echo 
echo SR-install: copy _bashrc to remote server SR account
#rsync -avz -e ssh --ignore-existing _bashrc $SRaccount@$SRIP:~/_bashrc #優點:利用 scp 但避免蓋掉已存在檔案
cp2 _bashrc
ssh $SRaccount@$SRIP "cat ~/_bashrc | tee -a ~/.bashrc " 

############ end of 處理 scalra account 


############ git clone 
#todo: 以下若已有檔案，則 1) 跳過 2) 刪掉重 git clone 
echo SR-install: cloning SR source code 
cp2 _ssh_github
ssh $SRaccount@$SRIP "mkdir --verbose --parents .ssh ~/users/ "
ssh $remoteAdminUsername@$SRIP "echo $remoteAdminPassword | sudo -S cp -av _ssh_github/* /home/scalra/.ssh/" 
ssh $remoteAdminUsername@$SRIP "mv -v _ssh_github/* .ssh/"
#rsync -avz -e ssh _ssh_github/* $SRaccount@$SRIP:~/.ssh/

#ssh $SRaccount@$SRIP "(cd users/ ; git clone https://$githubUsername:$githubPassword@github.com/imonology/SR-Projects.git . )" #

ssh $SRaccount@$SRIP "(cd users/ ; git clone git@github.com:imonology/SR-Projects.git . --verbose)"
if [ "$?" -eq "0" ]; then 
  githubssh=yes
else 
  githubssh=no
fi

if [ "$githubssh" == "no" ]; then
  read -p "SR-install: Please Enter github account: " githubUsername 
  read -s -p "SR-install: Please Enter github password: " githubPassword 
  ssh $SRaccount@$SRIP "(cd users/ ; git clone https://$githubUsername:$githubPassword@github.com/imonology/SR-Projects.git . --verbose)" #
fi

ssh $SRaccount@$SRIP "mkdir --verbose --parents ~/users/scalra/Scalra/ "


if [ "$githubssh" == "yes" ]; then
  ssh $SRaccount@$SRIP "(cd users/scalra/Scalra/ ; git clone git@github.com:imonology/Scalra.git . --verbose)" 
elif [ "$githubssh" == "no" ]; then
  ssh $SRaccount@$SRIP "(cd users/ ; git clone https://$githubUsername:$githubPassword@github.com/imonology/Scalra.git . --verbose)" #
else
  echo FATAL ERROR.
  exit 99;
fi

ssh $SRaccount@$SRIP "rm -Rf --verbose ~/users/scalra/icpm/ "
ssh $SRaccount@$SRIP "mkdir --verbose --parents ~/users/scalra/icpm/ "

if [ "$githubssh" == "yes" ]; then
  ssh $SRaccount@$SRIP "(cd users/scalra/icpm/ ; git clone git@github.com:imonology/icpm.git . --verbose)" 
elif [ "$githubssh" == "no" ]; then 
  ssh $SRaccount@$SRIP "(cd users/scalra/icpm/ ; git clone https://$githubUsername:$githubPassword@github.com/imonology/icpm.git . --verbose)" 
else
  echo FATAL ERROR.
  exit 99;
fi



ssh $SRaccount@$SRIP "cd ~/users/scalra/icpm/ ; cp -v config.inc.js.default config.inc.js; npm install; npm install jsonfile ncp "

############ 
echo SR-install: to pull config.js for SR
ssh $SRaccount@$SRIP "(cd users/scalra/Scalra/ ; cp -v config.js.example config.js )" #
ssh $SRaccount@$SRIP "(cd users/scalra/Scalra/ ; perl -pi -e 's/var mode = \'localhost\'\;/var mode = \'src\'\;/g' ~/users/scalra/Scalra/config.js )" #


echo 
echo SR-install: to create symbol links
ssh $remoteAdminUsername@$SRIP "echo $remoteAdminPassword |sudo -S ln -sv /usr/bin/nodejs /usr/bin/node " 
ssh $remoteAdminUsername@$SRIP "echo $remoteAdminPassword |sudo -S mkdir --verbose --parents /usr/local/lib/node_modules /usr/local/lib/nodejs /usr/local/lib/node " 
#ssh $remoteAdminUsername@$SRIP "echo $remoteAdminPassword |sudo -S ln -sv /home/scalra/users/syhu/Scalra /usr/local/lib/node_modules/scalra " 
#ssh $remoteAdminUsername@$SRIP "echo $remoteAdminPassword |sudo -S ln -sv /home/scalra/users/syhu/Scalra /usr/lib/node/scalra " 
ssh $remoteAdminUsername@$SRIP "echo $remoteAdminPassword |sudo -S ln -sv /home/scalra/users/scalra/Scalra /usr/lib/nodejs/scalra " # ubuntu14.04

# ln -sv /Users/a/users/syhu/Scalra /Users/a/.node_modules/scalra # OSX 10.9 


echo 
echo SR-install: npm install 
ssh  $remoteAdminUsername@$SRIP "echo $remoteAdminPassword | sudo -S npm install -g forever " 
#ssh  $SRaccount@$SRIP "(cd ~/users/syhu/Scalra/dev/ ; npm install -l )" #todo: 每個目錄都跑一次 
ssh  $SRaccount@$SRIP "(cd ~/users/scalra/icpm/ ; npm install -l )" 
#ssh  $SRaccount@$SRIP "(cd ~/users/ ; npm install -l )" 
#ssh  $SRaccount@$SRIP "find -type d -name package.json -exec npm install --prefix {} \;"
#ssh  $SRaccount@$SRIP "find -type d -name node_modules -exec npm update --prefix {} \;"

# 某些系統(centos)要執行下一行才能動 
#echo 'export NODE_PATH="'$(npm root -g)'"' >> ~/.bash_profile && . ~/.bash_profile



echo SR-instal: refine 
#ssh  $remoteAdminUsername@$SRIP "echo $remoteAdminPassword | sudo -S npm -g install express express-generator supervisor"
#ssh  $remoteAdminUsername@$SRIP "echo $remoteAdminPassword | sudo -S npm -g update" #新安裝的 SR 不必更新 


# todo:
# 1. /users/syhu/Scalra/curr/settings.js 中, 把 'test' 的設定設成東風 IP (原本指向的是 MiCloud IP)
# 2. /users/yooho/YoohoFarm/settings.js 中的 domain 直接改為東風 IP (原本是: SR.Settings.MODE + '.scalra.com', 但明顯這是錯的)
# 3. /users/yooho/YoohoFarm/settings.js 中 的 apps 設定中 item 的 local_name 解除註解 (這先前也發生過, app server 讀不到 local_name 而無法連上 lobby 原因)



#todo: MongoDB DB Data Init
echo
echo 執行 mongo 
cp2 mongodb_.js
ssh  $SRaccount@$SRIP "mongo --version"
ssh  $SRaccount@$SRIP "mongo < mongodb_.js" # 插入某些必要資料
ssh  $remoteAdminUsername@$SRIP "mongo < mongodb_.js" 

echo todo: 要先檢查 httpd, nginx 等環境 sudo netstat -ntupl | grep ':80 '
ssh  $remoteAdminUsername@$SRIP "echo $remoteAdminPassword | sudo -S netstat -ntupl | grep ':80 ' "
if [ "$?" -eq "0" ]; then
  echo port 80 is in use
else 
  echo port 80 is not in use
fi


############ to install nginx, rockmongo 
# todo: 從這裡判斷是否要另外安裝 nginx 
echo installing rockmongo 
for i in `seq 1 10`;
do
    ssh  $remoteAdminUsername@$SRIP "echo $remoteAdminPassword | sudo -S apt-get -y -q -q install php5-cli php5-common php5-cgi php5-curl php5-fpm php5-json php5-mcrypt php5-mysql php5-sqlite php5-dev php-pear php-apc nginx"
    if [ $? -eq 0 ]; then
        break;
    fi
    echo "Failed. Trying again..." 
    sleep 3
done
cp2 info.php 
#ssh  $remoteAdminUsername@$SRIP "wget http://rockmongo.com/downloads/go?id=14 -O rkmg.zip "
ssh  $remoteAdminUsername@$SRIP "git clone https://github.com/iwind/rockmongo.git "
cp2 rockmongo-1.1.7.zip
ssh  $remoteAdminUsername@$SRIP "echo $remoteAdminPassword | sudo -S mkdir -pv /usr/share/nginx/html/ " 
ssh  $remoteAdminUsername@$SRIP "echo $remoteAdminPassword | sudo -S unzip rkmg.zip -d /usr/share/nginx/html/" 
ssh  $remoteAdminUsername@$SRIP "echo $remoteAdminPassword | sudo -S mv -v ../scalra/info.php /usr/share/nginx/html/info.php"
ssh  $remoteAdminUsername@$SRIP "echo $remoteAdminPassword | sudo -S mv -v info.php /usr/share/nginx/html/info.php"
ssh  $remoteAdminUsername@$SRIP "echo $remoteAdminPassword | sudo -S pecl install mongo" 
ssh  $remoteAdminUsername@$SRIP "echo $remoteAdminPassword | sudo -S unzip rockmongo-1.1.7.zip -d /usr/share/nginx/html/" 
ssh  $remoteAdminUsername@$SRIP "echo $remoteAdminPassword | sudo -S mv -nv rockmongo /usr/share/nginx/html/" 
ssh  $remoteAdminUsername@$SRIP "echo $remoteAdminPassword | sudo -S chmod o+w /etc/php5/fpm/php.ini "
ssh  $remoteAdminUsername@$SRIP "echo \"extension=mongo.so\" | tee -a /etc/php5/fpm/php.ini"
ssh  $remoteAdminUsername@$SRIP "echo $remoteAdminPassword | sudo -S chmod o-w /etc/php5/fpm/php.ini "

ssh  $remoteAdminUsername@$SRIP "echo $remoteAdminPassword | sudo -S service nginx restart"
ssh  $remoteAdminUsername@$SRIP "echo $remoteAdminPassword | sudo -S service php5-fpm restart"

# https://www.digitalocean.com/community/tutorials/how-to-install-linux-nginx-mysql-php-lemp-stack-on-ubuntu-12-04
############ end of rockmongo


############ rc.local 
echo SR-install: auto-start socketpolicy, gateway and monitor server 
ssh $remoteAdminUsername@$SRIP "grep -v '^exit 0$' /etc/rc.local | tee -a rc.local_ " 
ssh $remoteAdminUsername@$SRIP "echo /home/scalra/users/scalra/Scalra/socketpolicy/socketpolicy.pl \>\> /tmp/socketpolicy.log 2\>\>/tmp/socketpolicy.err \& | tee -a rc.local_ " 
ssh $remoteAdminUsername@$SRIP "echo | tee -a rc.local_ "
ssh $remoteAdminUsername@$SRIP "echo su --command \'\(cd /home/scalra/users/scalra/Scalra/curr/ \; ./start\)\' scalra \& | tee -a rc.local_ "
ssh $remoteAdminUsername@$SRIP "echo su --command \'\(cd /home/scalra/users/scalra/icpm/ \; ./startsrv.sh\)\' scalra \& | tee -a rc.local_ "

ssh $remoteAdminUsername@$SRIP "echo | tee -a rc.local_ "
ssh $remoteAdminUsername@$SRIP "echo exit 0 | tee -a rc.local_ "

ssh $remoteAdminUsername@$SRIP "echo $remoteAdminPassword | sudo -S chmod o+w /etc/rc.local " 
ssh $remoteAdminUsername@$SRIP "cat rc.local_ | tee /etc/rc.local " 
ssh $remoteAdminUsername@$SRIP "echo $remoteAdminPassword | sudo -S chmod o-w /etc/rc.local " 
############ end of rc.local

############ erasing installation footprinting
echo erasing command history 
ssh  $SRaccount@$SRIP "rm -v ~/.bash_history ~/_bashrc ~/mongodb_.js " 
#ssh  $SRaccount@$SRIP "rm -Rfv ~/users/.git/ " 
ssh  $remoteAdminUsername@$SRIP "rm -v ~/.bash_history ~/rc.local_ " 
############ end of erasing

echo copy latest installation 
cp2 $(which $0)
cp2 FFinstall.sh


echo
echo required manual fix: ssh $remoteAdminUsername@$SRIP
echo @# run: sudo ./FFinstall.sh by yourself 
#echo to compile and to install ffmpeg with most required functions 
#ssh $remoteAdminUsername@$SRIP "echo $remoteAdminPassword | sudo -S ./FFinstall.sh "

#echo @# sudo vi +/src /home/scalra/users/syhu/Scalra/config.js 修改 var mode = 
ssh $remoteAdminUsername@$SRIP "echo $remoteAdminPassword | sudo -S perl -pi -e \"s/var mode = \'src\'\;/var mode = \'$SRmode\'\;/g\" /home/scalra/users/scalra/Scalra/config.js "

#echo @# sudo vi +/cgi.fix_pathinfo /etc/php5/fpm/php.ini 修改成 cgi.fix_pathinfo=0 
# http://stackoverflow.com/questions/525592/find-and-replace-inside-a-text-file-from-a-bash-command
#ssh $remoteAdminUsername@$SRIP "echo $remoteAdminPassword | sudo -S chmod o+w /etc/php5/fpm/php.ini "
ssh $remoteAdminUsername@$SRIP "echo $remoteAdminPassword | sudo -S perl -pi -e 's/\;cgi.fix_pathinfo=1/cgi.fix_pathinfo=0/g' /etc/php5/fpm/php.ini "
#ssh $remoteAdminUsername@$SRIP "echo $remoteAdminPassword | sudo -S chmod o-w /etc/php5/fpm/php.ini "

#echo @# sudo vi +/index.html /etc/nginx/sites-available/default 在有作用的 server{ 範圍中的 location ~ \.php$ { 解除註解 及 With php5-fpm: 的三項解除註解 並確認有效: sudo service nginx restart  sudo service php5-fpm restart
#ssh $remoteAdminUsername@$SRIP "echo $remoteAdminPassword | sudo -S perl -pi -e 's/index.htm;/index.htm index.php;/g' /etc/nginx/sites-available/default "
cp2 etc-nginx-sites-available-default
ssh $remoteAdminUsername@$SRIP "echo $remoteAdminPassword | sudo -S mv -v /etc/nginx/sites-available/default /etc/nginx/sites-available/default.backup "
ssh $remoteAdminUsername@$SRIP "echo $remoteAdminPassword | sudo -S mv -v etc-nginx-sites-available-default /etc/nginx/sites-available/default "
ssh $remoteAdminUsername@$SRIP "echo $remoteAdminPassword | sudo -S service php5-fpm restart "
ssh $remoteAdminUsername@$SRIP "echo $remoteAdminPassword | sudo -S service nginx restart "

#echo @# sudo vi +/mongo_auth /usr/share/nginx/html/rockmongo-1.1.7/config.php # config.php 這一行要設成  = true; # $MONGO["servers"][$i]["mongo_auth"] = true;//enable mongo authentication?
#ssh $remoteAdminUsername@$SRIP "echo $remoteAdminPassword | sudo -S chmod o+w /usr/share/nginx/html/rockmongo/config.php "
ssh $remoteAdminUsername@$SRIP "echo $remoteAdminPassword | sudo -S perl -pi -e 's/mongo_auth\"\] = false/mongo_auth\"\] = true/g' /usr/share/nginx/html/rockmongo/config.php "
#ssh $remoteAdminUsername@$SRIP "echo $remoteAdminPassword | sudo -S chmod o-w /usr/share/nginx/html/rockmongo/config.php "
#ssh $remoteAdminUsername@$SRIP "echo $remoteAdminPassword | sudo -S chmod o+w /usr/share/nginx/html/rockmongo-1.1.7/config.php "
ssh $remoteAdminUsername@$SRIP "echo $remoteAdminPassword | sudo -S perl -pi -e 's/mongo_auth\"\] = false/mongo_auth\"\] = true/g' /usr/share/nginx/html/rockmongo-1.1.7/config.php "
#ssh $remoteAdminUsername@$SRIP "echo $remoteAdminPassword | sudo -S chmod o-w /usr/share/nginx/html/rockmongo-1.1.7/config.php "

#echo @# sudo vi +/#auth /etc/mongodb.conf 取消註解 
#ssh $remoteAdminUsername@$SRIP "echo $remoteAdminPassword | sudo -S chmod o+w /etc/mongodb.conf "
ssh $remoteAdminUsername@$SRIP "echo $remoteAdminPassword | sudo -S perl -pi -e 's/\#auth = true/auth = true/g' /etc/mongodb.conf "
#ssh $remoteAdminUsername@$SRIP "echo $remoteAdminPassword | sudo -S chmod o-w /etc/mongodb.conf "

echo Checklist after installed: 
echo 1. ssh 登入時系統是否有要求重開機，若有則 sudo shutdown -r now 
echo 2. monitor 是否能開啟正常, socket policy 是否有正常運作 
echo 3. project server 是否能連得上 mongodb 
echo 4. monitor 是否能寄信給管理者 if project server is crashed. 



# rsync -avz -e ssh $(which $0) scalra@src.scalra.com:~/users/syhu/Scalra/
exit 99; #以下會重開機，不要執行 
echo 
echo SR-install: to shutdown -r now $(date) Finishing...
ssh  $remoteAdminUsername@$SRIP "echo $remoteAdminPassword | sudo -S shutdown -r now "  


echo ssh $SRaccount@$SRIP
echo ssh $remoteAdminUsername@$SRIP

exit 99;
########
# note #
########
http://superuser.com/questions/67765/sudo-with-password-in-one-command-line

http://stackoverflow.com/questions/12202587/ssh-script-that-automatically-enters-password
First you need to install sshpass.
EXAMPLE:
sshpass -p "YOUR_PASSWORD" ssh -o StrictHostKeyChecking=no YOUR_USERNAME@SOME_SITE.COM

# ssh-keygen 產生 key pair
# ssh-copy-id 即可將此電腦 public key 安裝至遠端，日後不再需要輸入密碼 

