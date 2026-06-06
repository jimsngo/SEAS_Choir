#!/bin/bash

TARGET_LIBRARY="$1"
OUT_VAR_NAME="$2"
SEARCH_KW="$3"
FILE_EXT="$4"
PROMPT_MSG="$5"

# Fallback internal manual picker function
invoke_fallback_picker() {
    osascript -e "POSIX path of (choose file with prompt \"$1\" of type {\"$2\"} default location (POSIX file \"$TARGET_LIBRARY\"))" 2>/dev/null
}

# Build robust lookup match parameters
find_args=()
for word in $SEARCH_KW; do
    find_args+=("-iname" "*${word}*")
    done

matches=()
IFS=$'\n'
matches=($(find "$TARGET_LIBRARY" -maxdepth 2 -type f "${find_args[@]}" -iname "*.${FILE_EXT}" 2>/dev/null))
unset IFS

if [ ${#matches[@]} -eq 0 ]; then
    echo "⚠️  No .${FILE_EXT} files found matching '$SEARCH_KW' inside subfolders."
    read -p "Press Enter to open manual file picker window..."
    RESULT=$(invoke_fallback_picker "$PROMPT_MSG" "$FILE_EXT")
elif [ ${#matches[@]} -eq 1 ]; then
    echo "✅ Automatically selected unique match: $(basename "${matches[0]}")"
    RESULT="${matches[0]}"
else
    echo "------------------------------------------------"
    echo "Suggested .${FILE_EXT} files found in your library:"
    for i in "${!matches[@]}"; do
        subfolder=$(basename "$(dirname "${matches[$i]}")")
        echo "$((i+1))) $(basename "${matches[$i]}") [$subfolder]"
    done
    echo "$(( ${#matches[@]} + 1 ))) Open manual file picker window"
    echo "------------------------------------------------"
    
    while true; do
        read -p "Select the correct file number: " choice
        if [[ "$choice" -gt 0 && "$choice" -le "${#matches[@]}" ]]; then
            RESULT="${matches[$((choice-1))]}"
            break
        elif [[ "$choice" -eq "$(( ${#matches[@]} + 1 ))" ]]; then
            RESULT=$(invoke_fallback_picker "$PROMPT_MSG" "$FILE_EXT")
            break
        fi
    done
fi

# Print the final result strictly on the last line so the dashboard script can read it safely
echo "RESULT_PATH:${RESULT}"