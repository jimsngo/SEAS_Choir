#!/bin/bash
#
# SEAS Choir Automation Script Runner
# ----------------------------------
# This script provides an interactive menu to run all major automation and update scripts for the SEAS Choir project.
#
# USAGE:
#   ./run_script.sh
#
# FEATURES:
#   - Run individual Node.js scripts for metadata extraction, merging, and PDF/Word generation
#   - Run all weekly update scripts in sequence (including DOCX to PDF conversion)
#   - Push changes to GitHub
#   - Optionally reset git history (dangerous!)
#
# REQUIREMENTS:
#   - Node.js (for the automation scripts)
#   - LibreOffice (for DOCX to PDF conversion)
#   - git (for version control)
#
# TIPS:
#   - Edit the scripts or .txt files in 'moments/' as needed before running
#   - Use the "Weekly Update" option for a full update and PDF export
#   - Use "chmod +x run_script.sh" if you get a permission denied error
#
# Author: [Your Name or SEAS Choir]
# Last updated: 2025-09-30

cd "$(dirname "$0")"
cd /Users/jim/SEAS_Choir

PS3="Select a script to run: "


echo "SEAS Choir Automation Script Runner"
echo "-----------------------------------"
PS3="Select an option: "

select opt in \
  "Start App Server" \
  "Extract Metadata (from TXT files)" \
  "Generate Music PDF (buildAndMergePdfs.js)" \
  "Generate Lyrics PDF (buildAndMergeTxtToPdf.js)" \
  "Push to GitHub" \
  "Reset Git History (Fresh Initial Commit)" \
  "Quit"; do
  case $REPLY in
    1|2)
      # For Start App Server and Extract Metadata, always restart the server and open browser
      SERVER_PID=$(lsof -ti:3000)
      if [ -n "$SERVER_PID" ]; then
        echo "Stopping existing app server on port 3000 (PID: $SERVER_PID)..."
        kill $SERVER_PID
        sleep 2
      fi
      if [ "$REPLY" = "2" ]; then
        echo "Sanitizing all lyrics .txt files..."
        node batchCleanLyrics.js
        echo "Running: node extractMetaFromSongTxt.js"
        node extractMetaFromSongTxt.js
      fi
      echo "Starting app server (file-upload-app)..."
      cd file-upload-app && npm start &
      cd ..
      echo "App server started on http://localhost:3000."
      sleep 2
      echo "Opening http://localhost:3000/app.html in your browser..."
      open http://localhost:3000/app.html
      break
      ;;
    3)
      echo "Running: node buildAndMergePdfs.js"
      node buildAndMergePdfs.js
      break
      ;;
    4)
      echo "Running: node buildAndMergeTxtToPdf.js"
      node buildAndMergeTxtToPdf.js
      break
      ;;
    5)
      echo "Pushing changes to GitHub..."
      git add .
      git commit -m "Weekly update and automation changes"
      git push --set-upstream origin main
      echo "Changes pushed to GitHub."
      break
      ;;
    6)
      echo "This will erase all previous git history and force-push a new initial commit."
      read -p "Are you sure? Type YES to continue: " confirm
      if [ "$confirm" = "YES" ]; then
        git checkout --orphan temp_branch && \
        git add -A && \
        git commit -m "Initial commit" && \
        git branch -D main && \
        git branch -m temp_branch main && \
        git push --force origin main
        echo "Git history reset and force-pushed."
      else
        echo "Aborted."
      fi
      break
      ;;
    7)
      echo "Exiting."
      break
      ;;
    *)
      echo "Invalid option."
      ;;
  esac
done
