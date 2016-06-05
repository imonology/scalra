#!/bin/bash
echo To globally replace a string in a given directory. Updated: 20151216
echo USE WITH CAUTION!
if [ $# -eq 0 ]
  then
    echo Usage: $0 [directory] [original] [new] 
else
  echo Replacing \'$2\' with \'$3\' under directory \'$1\' ...
  # ref on exclusion: http://stackoverflow.com/questions/4210042/exclude-directory-from-find-command
  find $1 -type f -not -path "$1/node_modules/*" -not -path "$1/lib/*" -exec sed -i -e 's/'$2'/'$3'/g' {} \;
fi


