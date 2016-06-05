#!/bin/bash
# updated: 201406
# 新建 icapi 目錄，放入與原來程式檔名相同 *.js  
# 直接在這邊的 code 改 scalra@MC-Dev-01:~/users/syhu/Scalra/dev$
#SR API
#SR 原始碼儘力寫成易讀易用，直接研究原始碼可學會其用法。建議研讀順序：
#Scalra/global.js global definitions of common variables and helper functions

echo 1 要寫 doc 的所有 api, global.js 裡面 SR.第一個英文字是大寫的 
grep '^SR.[A-Z]' ./global.js | cat -n

echo 2 所有 api 的功能 
grep -n -o 'exports.*=.*)' core/*.js extension/*.js | cat -n

#exit 99; #以下暫不執行 
echo 3 目前正在寫/或剛寫的 SR-API doc  
awk '/Begin of SR-API/,/End of SR-API/' */icapi/done/*.js 

echo 4 在目前已寫的 SR-API doc 中找出錯誤語法的 .js 檔 
for i in */icapi/done/*.js */icapi/*.js
do
  echo -n JavaScript parsing:  $i 
  uglifyjs $i > /dev/null
  if [ $? == 0 ]; then
	echo '   passed '
  else 
	echo '   error ' 
	exit 99;
  fi 
done

echo 5 最後修改的 SR-API .js 檔 
ls -t */icapi/*.js 

#echo 6 
#grep -n -o 'exports.*=' */icapi/*.js | cat -n

if [ "$1" != "" ]; then
	grep -nr "$1" . 
fi

exit 99;
https://docs.google.com/spreadsheet/ccc?key=0AoZZU-nxIOGQdDlhXzIybjJvUGpkQkVZQ1NLSjdPRFE#gid=136

SR-API 說明文件規則: 
. 符合 javascript object/ json 格式 
. 以 var xxxx = {//Begin of SR-API 開頭
. }//End of SR-API 結束 
. static 和 object 的用法在 SR-API doc 中能顯示出來 

