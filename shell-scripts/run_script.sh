#!/bin/bash

# Move to the project root directory
cd /Users/jim/SEAS_Choir

PS3="Select an option: "

echo "========================================"
echo "  SEAS Choir Automation Script Runner"
echo "========================================"

select opt in \
  "Start App Server" \
  "Extract Metadata (from TXT files)" \
  "Generate Music PDF (buildAndMergePdfs.js)" \
  "Generate Lyrics PDF (buildAndMergeTxtToPdf.js)" \
  "Push to GitHub" \
  "Reset Git History (Fresh Initial Commit)" \
  "Smart Cleanup (Delete Unused Local Media)" \
  "Quit"; do
  case $REPLY in
    1|2)
      # 🛠️ Step 1: Kill any existing server on port 3000
      SERVER_PID=$(lsof -ti:3000)
      if [ -n "$SERVER_PID" ]; then
        echo "Stopping existing app server (PID: $SERVER_PID)..."
        kill -9 $SERVER_PID
        sleep 1
      fi

      # 🛠️ Step 2: Run metadata extraction if option 2 selected
      if [ "$REPLY" = "2" ]; then
        echo "Running: node src/scripts/extractMetaFromSongTxt.js"
        node src/scripts/extractMetaFromSongTxt.js
      fi

      # 🛠️ Step 3: Start the server from the root
      echo "Starting main Node.js server..."
      node server.js &
      
      sleep 2
      echo "------------------------------------------------"
      echo "✅ SEAS Choir System is LIVE:"
      echo "👉 MANAGER: http://localhost:3000/server"
      echo "👉 CHOIR VIEW: http://localhost:3000"
      echo "------------------------------------------------"
      
      # Open the views in the browser
      open http://localhost:3000
      open http://localhost:3000/server
      break
      ;;

    3)
      echo "Generating Music PDFs..."
      node src/scripts/buildAndMergePdfs.js
      break
      ;;

    4)
      echo "Generating Lyrics PDFs..."
      node src/scripts/buildAndMergeTxtToPdf.js
      break
      ;;

    5)
      echo "Pushing weekly update to GitHub..."
      git add .
      git commit -m "Weekly update: $(date +'%Y-%m-%d')"
      git push origin main
      break
      ;;

    6)
      echo "⚠️ WARNING: This will erase ALL local and remote Git history!"
      read -p "Type YES to confirm fresh initial commit: " confirm
      if [ "$confirm" = "YES" ]; then
        echo "Resetting history..."
        git checkout --orphan temp_branch
        git add -A
        git commit -m "Initial commit"
        git branch -D main
        git branch -m main
        git push --force origin main
        
        echo "Shrinking local .git database..."
        git reflog expire --expire=now --all
        git gc --prune=now --aggressive
        echo "✅ History reset and local storage reclaimed."
      fi
      break
      ;;

    7)
      echo "🧹 Starting Smart Cleanup..."
      echo "Cross-referencing src/data against moments.json..."
      
      # Extract every file path mentioned in moments.json
      KEEP_LIST=$(grep -oE "src/data/[^\"]+\.(mp3|pdf|txt)" src/config/moments.json)

      if [ -z "$KEEP_LIST" ]; then
        echo "❌ Error: Could not find any files in moments.json."
        echo "Cleanup aborted to prevent accidental deletion."
      else
        echo "Checking for orphaned files..."
        echo "------------------------------------------------"
        
        # Loop through mp3, pdf, and txt files in src/data
        find src/data -type f \( -name "*.mp3" -o -name "*.pdf" -o -name "*.txt" \) | while read -r file; do
            # Clean path to match JSON format (remove leading ./)
            clean_path=$(echo "$file" | sed 's|^\./||')

            # Check if this physical file is in our 'Keep' list
            if [[ ! "$KEEP_LIST" =~ "$clean_path" ]]; then
                rm -v "$file"
            fi
        done
        echo "------------------------------------------------"
        echo "✅ Cleanup Complete! Only active songs and Mass Parts remain."
      fi
      break
      ;;

    8)
      echo "Exiting."
      exit
      ;;

    *)
      echo "Invalid option: $REPLY"
      ;;
  esac
done