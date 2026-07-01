#!/bin/bash

TARGET_LIBRARY="$1"
OUT_VAR_NAME="$2"
SEARCH_KW="$3"
FILE_EXT="$4"
PROMPT_MSG="$5"

# Hardcode your two exact primary search directories explicitly
SEARCH_PATHS=(
    "$TARGET_LIBRARY/Lyrics_MP3s_PDFs"
    "$TARGET_LIBRARY/Antiphon_Responsorial_Acclamation"
    "$TARGET_LIBRARY/Psalms"
)

# Fallback internal manual picker function
invoke_fallback_picker() {
    osascript -e "POSIX path of (choose file with prompt \"$1\" of type {\"$2\"} default location (POSIX file \"$TARGET_LIBRARY\"))" 2>/dev/null
}

# Verify directories exist; fall back to the root if they are missing
FINAL_SEARCH_TARGETS=()
for path in "${SEARCH_PATHS[@]}"; do
    if [ -d "$path" ]; then
        FINAL_SEARCH_TARGETS+=("$path")
    fi
done

if [ ${#FINAL_SEARCH_TARGETS[@]} -eq 0 ]; then
    FINAL_SEARCH_TARGETS+=("$TARGET_LIBRARY")
    MAX_DEPTH=4  # Deep scan fallback if directories aren't found
else
    MAX_DEPTH=4  # Locked at 4 to ensure deeper nested PDFs/MP3s are never missed!
fi

# =========================================================
# 🔍 SMART QUERY NORMALIZATION
# =========================================================
NORMALIZED_KW="${SEARCH_KW//-/ }"
NORMALIZED_KW="${NORMALIZED_KW//_/ }"

find_args=()
for word in $NORMALIZED_KW; do
    find_args+=("-iname" "*${word}*")
done
# =========================================================

# =========================================================
# 📢 LIVE TERMINAL PATH DIAGNOSIS PANEL
# =========================================================
echo "📂 Active Scan Targets:" >&2
for target in "${FINAL_SEARCH_TARGETS[@]}"; do
    echo "   📍 Path: $target" >&2
done
echo "🔎 Parsing Elements: ($NORMALIZED_KW) | Target Extension: .$FILE_EXT" >&2
echo "------------------------------------------------" >&2
# =========================================================

matches=()
IFS=$'\n'
matches=($(find "${FINAL_SEARCH_TARGETS[@]}" -maxdepth $MAX_DEPTH -type f "${find_args[@]}" -iname "*.${FILE_EXT}" 2>/dev/null))
unset IFS

if [ ${#matches[@]} -eq 0 ]; then
    echo "⚠️  No .${FILE_EXT} files found matching '$SEARCH_KW' inside your target folders." >&2
    read -p "Press Enter to open manual file picker window..." < /dev/tty >&2
    RESULT=$(invoke_fallback_picker "$PROMPT_MSG" "$FILE_EXT")
elif [ ${#matches[@]} -eq 1 ]; then
    src_folder=$(basename "$(dirname "${matches[0]}")")
    echo "✅ Automatically selected unique match: $(basename "${matches[0]}") [Source: /$src_folder]" >&2
    RESULT="${matches[0]}"
else
    echo "------------------------------------------------" >&2
    echo "Suggested .${FILE_EXT} files found in your library:" >&2
    for i in "${!matches[@]}"; do
        subfolder=$(basename "$(dirname "${matches[$i]}")")
        echo "$((i+1))) $(basename "${matches[$i]}") [Source: /$subfolder]" >&2
    done
    echo "$(( ${#matches[@]} + 1 ))) Open manual file picker window" >&2
    echo "------------------------------------------------" >&2
    
    while true; do
        read -p "Select the correct file number: " choice < /dev/tty >&2
        if [[ "$choice" -gt 0 && "$choice" -le "${#matches[@]}" ]]; then
            RESULT="${matches[$((choice-1))]}"
            break
        elif [[ "$choice" -eq "$(( ${#matches[@]} + 1 ))" ]]; then
            RESULT=$(invoke_fallback_picker "$PROMPT_MSG" "$FILE_EXT")
            break
        fi
    done
fi

# Print the final result strictly on standard output so the dashboard can read it safely
echo "RESULT_PATH:${RESULT}"