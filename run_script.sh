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

PS3="Select a script to run: "

select script in extractMetaFromSongTxt.js updateMyDataFromMoments.js mergeTextFiles.js buildAndMergePdfs.js "Weekly Update (All Above)" "Push to GitHub" "Reset Git History (Fresh Initial Commit)" "Quit"; do
  case $script in
    "Quit")
      echo "Exiting."
      break
      ;;
    "Push to GitHub")
      echo "Pushing changes to GitHub..."
      git add .
      git commit -m "Weekly update and automation changes"
      git push --set-upstream origin main
      echo "Changes pushed to GitHub."
      break
      ;;
    "Reset Git History (Fresh Initial Commit)")
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
    "Weekly Update (All Above)")
      echo "Running all weekly update scripts..."
      node tools/extractMetaFromSongTxt.js && \
      node tools/updateMyDataFromMoments.js && \
      node tools/mergeTextFiles.js && \
      node tools/convertTxtToDocx.js && \
      node tools/buildAndMergePdfs.js
      if [ -f pdfs/lyrics.docx ]; then
        echo "Converting lyrics.docx to lyrics.pdf..."
        libreoffice --headless --convert-to pdf pdfs/lyrics.docx --outdir pdfs
        echo "lyrics.pdf created in pdfs/"
      else
        echo "lyrics.docx not found, skipping PDF conversion."
      fi
      echo "All weekly update scripts completed."
      break
      ;;
    "")
      echo "Invalid option."
      ;;
    *)
      echo "Running: node tools/$script"
      node "tools/$script"
      break
      ;;
  esac
done
