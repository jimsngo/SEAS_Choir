#!/bin/bash

# ==========================================
#        ROOT-LEVEL PATH CONTROL
# ==========================================
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$SCRIPT_DIR"
cd "$PROJECT_ROOT"

# Paths
MASS_INFO_JSON="config/mass_info.json"
MOMENTS_JSON="config/moments.json"
CANTORS_JSON="config/cantors.json"

# Target specifically the Moments subfolder
MOMENTS_BASE_DIR="data/Moments"
CANTOR_IMG_DIR="images"

# Tools
EXTRACT_TOOL="src/scripts/extractMetaFromSongTxt.js"
MUSIC_PDF_TOOL="src/scripts/buildAndMergePdfs.js"
LYRICS_PDF_TOOL="src/scripts/buildAndMergeTxtToPdf.js"

# Helper to open macOS File Picker
pick_file() {
    local prompt_text="$1"
    local file_ext="$2"
    osascript -e "POSIX path of (choose file with prompt \"$prompt_text\" of type {\"$file_ext\"} default location (POSIX file \"$HOME/Downloads\"))" 2>/dev/null
}

# ==========================================
# 🚀 INITIAL STARTUP
# ==========================================
echo "Checking for GitHub updates..."
git pull origin main

echo "Launching Dashboard via Live Server..."
# Points to the standard Live Server port
open "http://127.0.0.1:5500/index.html"
# ==========================================

while true; do
  clear
  echo "================================================="
  echo "   SEAS Choir Master Automation Tool (V2)"
  echo "================================================="
  echo "1) Update Mass Info"
  echo "2) Manage Moments (Files & Singer)"
  echo "3) Generate Music PDF"
  echo "4) Generate Lyrics PDF"
  echo "5) Push to GitHub"
  echo "6) Smart Cleanup"
  echo "7) Quit"
  echo "-------------------------------------------------"
  
  read -p "Select an option [Enter or q to quit]: " main_choice

  # EXIT LOGIC
  if [[ -z "$main_choice" || "$main_choice" == "q" || "$main_choice" == "Q" || "$main_choice" == "7" ]]; then
    echo "Exiting..."
    exit 0
  fi

  case $main_choice in
    1)
        echo "------------------------------------------------"
        # Load current values
        CUR_NAME=$(python3 -c "import json; print(json.load(open('$MASS_INFO_JSON'))['mass_name'])")
        CUR_DATE=$(python3 -c "import json; print(json.load(open('$MASS_INFO_JSON'))['date'])")
        CUR_CANTOR=$(python3 -c "import json; print(json.load(open('$MASS_INFO_JSON'))['cantor'])")
        
        echo "Current Cantor: $CUR_CANTOR"
        echo "Available Cantors:"
        CANTOR_LIST=($(python3 -c "import json; print(' '.join([n.replace(' ', '_') for n in json.load(open('$CANTORS_JSON'))]))"))
        for i in "${!CANTOR_LIST[@]}"; do echo "$((i+1))) ${CANTOR_LIST[$i]//_/ }"; done

        read -p "Select Cantor Number (or Enter to keep current): " c_choice
        if [[ -n "$c_choice" ]]; then
            SELECTED_CANTOR="${CANTOR_LIST[$((c_choice-1))]//_/ }"
        else
            SELECTED_CANTOR="$CUR_CANTOR"
        fi

        read -p "Mass Name [$CUR_NAME]: " m_name
        read -p "Date [$CUR_DATE]: " m_date

        # Pass variables into Python safely
        python3 <<EOF
import json, os
with open('$MASS_INFO_JSON', 'r') as f: data = json.load(f)

new_name = "${m_name:-$CUR_NAME}"
new_date = "${m_date:-$CUR_DATE}"
new_cantor = "$SELECTED_CANTOR"

# Match cantor image
img = data.get('cantor_image', '')
for ext in ['.jpg', '.png', '.jpeg', '.JPG', '.PNG']:
    test_path = os.path.join('$CANTOR_IMG_DIR', new_cantor + ext)
    if os.path.exists(test_path):
        img = test_path
        break

data.update({'mass_name': new_name, 'date': new_date, 'cantor': new_cantor, 'cantor_image': img})
with open('$MASS_INFO_JSON', 'w') as f:
    json.dump(data, f, indent=2)
EOF
        echo "✅ Mass Info Updated."
        sleep 1
        ;;

    2)
        while true; do
            echo "------------------------------------------------"
            MOMENTS=("Entrance" "Responsorial_Psalm" "Gospel_Acclamation" "Offertory" "Communion_Antiphon" "Communion" "Meditation" "Recessional")
            for i in "${!MOMENTS[@]}"; do echo "$((i+1))) ${MOMENTS[$i]//_/ }"; done
            
            read -p "Select Moment [Enter or q for Main Menu]: " m_choice
            if [[ -z "$m_choice" || "$m_choice" == "q" || "$m_choice" == "Q" ]]; then break; fi
            
            m_opt="${MOMENTS[$((m_choice-1))]}"
            [[ -z "$m_opt" ]] && continue

            CUR_DATA=$(python3 -c "import json; d=json.load(open('$MOMENTS_JSON')); m=next((x for x in d if x['moment'] == '$m_opt'), {}); print(f\"{m.get('mp3','')}|{m.get('pdf','')}|{m.get('txt','')}|{m.get('singer','')}\")")
            CUR_SINGER=$(echo "$CUR_DATA" | cut -d'|' -f4)

            read -p "Singer [$CUR_SINGER]: " new_singer
            FINAL_SINGER="${new_singer:-$CUR_SINGER}"
            [[ "$new_singer" == "none" ]] && FINAL_SINGER=""

            echo "📂 Opening File Pickers..." 
            new_txt=$(pick_file "Select TXT for $m_opt" "txt")
            new_pdf=$(pick_file "Select PDF for $m_opt" "pdf")
            new_mp3=$(pick_file "Select MP3 for $m_opt" "mp3")

            DEST_DIR="$MOMENTS_BASE_DIR/$m_opt"
            mkdir -p "$DEST_DIR"

            process_file() {
                if [[ -n "$1" && -f "$1" ]]; then
                    rm -f "$DEST_DIR"/*."$3"
                    cp "$1" "$DEST_DIR/"
                    echo "$DEST_DIR/$(basename "$1")"
                else echo "$2"; fi
            }

            FINAL_MP3=$(process_file "$new_mp3" "$(echo "$CUR_DATA" | cut -d'|' -f1)" "mp3")
            FINAL_PDF=$(process_file "$new_pdf" "$(echo "$CUR_DATA" | cut -d'|' -f2)" "pdf")
            FINAL_TXT=$(process_file "$new_txt" "$(echo "$CUR_DATA" | cut -d'|' -f3)" "txt")

            python3 <<EOF
import json
with open('$MOMENTS_JSON', 'r') as f: d = json.load(f)
for x in d:
    if x['moment'] == '$m_opt':
        x.update({'mp3': '$FINAL_MP3', 'pdf': '$FINAL_PDF', 'txt': '$FINAL_TXT', 'singer': '$FINAL_SINGER'})
with open('$MOMENTS_JSON', 'w') as f: json.dump(d, f, indent=2)
EOF
            node "$EXTRACT_TOOL"
            echo "✅ $m_opt updated in $DEST_DIR."
        done
        ;;

    3) node "$MUSIC_PDF_TOOL"; sleep 1 ;;
    4) node "$LYRICS_PDF_TOOL"; sleep 1 ;;
    5) git add . && git commit -m "Weekly Update" && git push origin main; sleep 1 ;;
    6) 
        echo "Cleaning up duplicate root folders and old files..."
        python3 -c "import json, os; m=json.load(open('$MOMENTS_JSON')); keep=[x[k] for x in m for k in ['mp3','pdf','txt'] if x.get(k)]; [os.remove(os.path.join(r,f)) for r,d,fs in os.walk('$MOMENTS_BASE_DIR') for f in fs if os.path.join(r,f) not in keep]"
        find data/ -maxdepth 1 -type d ! -path "data/" ! -path "data/Moments" ! -path "data/Mass_Parts" -exec rm -rf {} +
        echo "🧹 Cleaned."; sleep 1 ;;
    *) echo "Invalid choice."; sleep 1 ;;
  esac
done