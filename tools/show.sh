#!/bin/bash
echo To show a string within ALL files in a given directory. Updated: 2016-01-10
if [ $# -eq 0 ]
  then
    echo Usage: $0 [directory] [string]  
else
  echo Showing all \'$2\' under directory \'$1\' ...
  
  grep -R -n --exclude-dir=log --exclude-dir=node_modules --exclude-dir=lib --color=always "$2" "$1"
fi


