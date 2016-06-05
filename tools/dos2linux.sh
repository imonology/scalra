#!/bin/bash
echo To convert DOS file endings to Linux ending. Updated: 2016-01-06
if [ $# -eq 0 ]
  then
    echo Usage: $0 [directory]  
else
  echo converting under directory \'$1\' ...
  # ref on exclusion: http://stackoverflow.com/questions/4210042/exclude-directory-from-find-command
  find $1 -type f -not -path "$1/node_modules/*" -not -path "$1/lib/*" -exec perl -pi -e 's/\r\n/\n/g' {} \;
fi


