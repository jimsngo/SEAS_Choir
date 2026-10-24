#!/bin/bash

# 1. This is the "Magic" line. It finds the real folder location 
# even if you are launching from a Desktop Alias.
PARENT_DIR=$(dirname "$0")
cd "$PARENT_DIR"

echo "================================================="
echo "🚀 Syncing with GitHub..."
git pull origin main

# 2. Run your terminal menu
./run_script.sh

# 3. Open everything once you exit the menu (Enter/q)
echo "================================================="
echo "📂 Opening Dashboard and PDFs..."

# Open the Web UI
if [[ -f "index.html" ]]; then
    open "index.html"
else
    echo "❌ Error: index.html not found in $PWD"
fi

# Open Music PDF
if [[ -f "output/music.pdf" ]]; then
    open "output/music.pdf"
fi

# Open Lyrics PDF
if [[ -f "output/lyrics.pdf" ]]; then
    open "output/lyrics.pdf"
fi

# Close the window automatically after a second
sleep 1
exit