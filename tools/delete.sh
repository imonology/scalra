#!/bin/bash
echo To globally delete all files with a certain prefix in a given directory. Updated: 20151216
echo USE WITH CAUTION!
if [ $# -eq 0 ]
  then
    echo Usage: $0 [directory] [prefix]
else
  echo Deleting all files with prefix \'$2\' under directory \'$1\' ...
  find $1 -type f -name $2* -exec rm -f '{}' \;
fi


