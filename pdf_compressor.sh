#!/bin/bash

# ==========================================
#        ROOT-LEVEL PATH CONTROL
# ==========================================
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$SCRIPT_DIR"
cd "$PROJECT_ROOT"

# Ensure Ghostscript is installed
if ! command -v gs &> /dev/null; then
    echo "❌ Error: Ghostscript ('gs') is not installed."
    echo "Please run 'brew install ghostscript' in your Mac Terminal first."
    exit 1
fi

# macOS AppleScript Native Pickers
pick_single_file() {
    osascript -e 'POSIX path of (choose file with prompt "Select a PDF file to compress" of type {"pdf"} default location (POSIX file "'"$HOME/Downloads"'"))' 2>/dev/null
}

pick_folder() {
    osascript -e 'POSIX path of (choose folder with prompt "Select a folder containing PDFs to compress" default location (POSIX file "'"$HOME"'"))' 2>/dev/null
}

# Statistics counters
total_files=0
skipped_files=0
compressed_files=0
total_saved_bytes=0

# Compression Worker Function
compress_file() {
    local target_file="$1"
    if [ ! -f "$target_file" ]; then return; fi
    
    total_files=$((total_files + 1))
    local filename=$(basename "$target_file")
    local orig_size=$(stat -f%z "$target_file")
    
    echo "Processing: $filename ($(numfmt --to=iec --suffix=B $orig_size))"

    # Compress to temporary file (150 DPI Ebook target standard)
    gs -sDEVICE=pdfwrite -dCompatibilityLevel=1.4 -dPDFSETTINGS=/ebook \
       -dNOPAUSE -dQUIET -dBATCH -sOutputFile="${target_file}.tmp" "$target_file"

    if [ -f "${target_file}.tmp" ]; then
        local comp_size=$(stat -f%z "${target_file}.tmp")

        # Only overwrite if size is actually saved
        if [ "$comp_size" -lt "$orig_size" ]; then
            local saved_bytes=$((orig_size - comp_size))
            total_saved_bytes=$((total_saved_bytes + saved_bytes))
            compressed_files=$((compressed_files + 1))
            
            mv "${target_file}.tmp" "$target_file"
            echo "   ✅ Compressed! New size: $(numfmt --to=iec --suffix=B $comp_size) (Saved $(numfmt --to=iec --suffix=B $saved_bytes))"
        else
            skipped_files=$((skipped_files + 1))
            rm "${target_file}.tmp"
            echo "   ℹ️  Skipped: Already fully optimized."
        fi
    else
        echo "   ❌ Error optimizing: $filename"
    fi
    echo "-------------------------------------------------"
}

# ==========================================
# 📱 USER INTERACTION MENU
# ==========================================
clear
echo "================================================="
echo "       🗜️   MAC AUTOMATED PDF COMPRESSOR         "
echo "================================================="
echo "1) Select and compress a Single PDF File"
echo "2) Select a Folder (Processes all PDFs inside recursively)"
echo "3) Cancel and Exit"
echo "================================================="
read -p "Choose an option [1-3]: " mode_opt

case $mode_opt in
    1)
        echo "Opening file picker..."
        SELECTED_FILE=$(pick_single_file)
        if [ -z "$SELECTED_FILE" ]; then
            echo "❌ No file selected. Exiting."
            exit 0
        fi
        echo "================================================="
        compress_file "$SELECTED_FILE"
        ;;
    2)
        echo "Opening folder picker..."
        SELECTED_FOLDER=$(pick_folder)
        if [ -z "$SELECTED_FOLDER" ]; then
            echo "❌ No folder selected. Exiting."
            exit 0
        fi
        echo "================================================="
        echo "Scanning folder recursively: $SELECTED_FOLDER"
        echo "================================================="
        
        # Find all PDF files inside the chosen directory path (skips mp3, txt, etc.)
        find "$SELECTED_FOLDER" -type f -name "*.pdf" | while read -r targeted_pdf; do
            compress_file "$targeted_pdf"
        done
        ;;
    *)
        echo "Exiting picker."
        exit 0
        ;;
esac

# Summary report output
echo ""
echo "================================================="
echo "📊 TARGETED REPOSITORY REPORT"
echo "================================================="
echo "Total PDFs Inspected: $total_files"
echo "Files Compressed:     $compressed_files"
echo "Files Kept As-Is:     $skipped_files"
if [ $total_saved_bytes -gt 0 ]; then
    echo "Total Storage Saved:  $(numfmt --to=iec --suffix=B $total_saved_bytes)"
fi
echo "================================================="