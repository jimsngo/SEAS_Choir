#!/bin/zsh
# show_tree.sh - Display the directory tree of the SEAS_Choir project

if command -v tree >/dev/null 2>&1; then
  echo "Project directory tree (using 'tree'):"
  tree -a -I '.git|node_modules|uploads|.DS_Store'
else
  echo "'tree' command not found. Using 'find' as a fallback:"
  find . -print | sed -e 's;[^/]*/;|____;g;s;____|; |;g'
fi
