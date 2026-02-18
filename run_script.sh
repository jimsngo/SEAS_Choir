#!/bin/bash

# ==========================================
#        ROOT-LEVEL PATH CONTROL
# ==========================================
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$SCRIPT_DIR"
cd "$PROJECT_ROOT"

# JSON Data
MASS_INFO_JSON="config/mass_info.json"
MOMENTS_JSON="config/moments.json"
CANTORS_JSON="config/cantors.json"

# Media Storage
MOMENTS_BASE_DIR="data"
CANTOR_IMG_DIR="images"

# Node Power Tools
EXTRACT_TOOL="src/scripts/extractMetaFromSongTxt.js"
MUSIC_PDF_TOOL="src/scripts/buildAndMergePdfs.js"
LYRICS_PDF_TOOL="src/scripts/buildAndMergeTxtToPdf.js"

# Helper to open macOS File Picker
pick_file() {
    local prompt_text="$1"
    local file_ext="$2"
    osascript -e "POSIX path of (choose file with prompt \"$prompt_text\" of type {\"$file_ext\"} default location (POSIX file \"$HOME/Downloads\"))" 2>/dev/null
}

PS3="Select an option: "
# ==========================================

echo "================================================="
echo "   SEAS Choir Master Automation Tool (V2)"
echo "   Mode: Terminal-Only / Serverless"
echo "================================================="

options=(
  "Update Mass Info"
  "Manage Moments (Files & Singer)"
  "Generate Music PDF"
  "Generate Lyrics PDF"
  "Push to GitHub"
  "Smart Cleanup"
  "Quit"
)

while true; do
  select opt in "${options[@]}"; do
    case $opt in
      "Update Mass Info")
        echo "------------------------------------------------"
        CUR_NAME=$(python3 -c "import json; print(json.load(open('$MASS_INFO_JSON'))['mass_name'])")
        CUR_DATE=$(python3 -c "import json; print(json.load(open('$MASS_INFO_JSON'))['date'])")
        CUR_CANTOR=$(python3 -c "import json; print(json.load(open('$MASS_INFO_JSON'))['cantor'])")
        
        echo "Cantor List:"
        CANTOR_LIST=($(python3 -c "import json; print(' '.join([n.replace(' ', '_') for n in json.load(open('$CANTORS_JSON'))]))"))
        for i in "${!CANTOR_LIST[@]}"; do echo "$((i+1))) ${CANTOR_LIST[$i]//_/ }"; done

        read -p "Selection [$CUR_CANTOR]: " c_choice
        [[ -z "$c_choice" ]] && SELECTED_CANTOR="$CUR_CANTOR" || SELECTED_CANTOR="${CANTOR_LIST[$((c_choice-1))]//_/ }"

        read -p "Mass Name [$CUR_NAME]: " m_name
        read -p "Date [$CUR_DATE]: " m_date

        python3 <<EOF
import json, os
with open('$MASS_INFO_JSON', 'r') as f: data = json.load(f)
new_c = '$SELECTED_CANTOR'
img = data.get('cantor_image', '')
for ext in ['.jpg', '.png', '.jpeg', '.JPG', '.PNG']:
    test = os.path.join('$CANTOR_IMG_DIR', new_c + ext)
    if os.path.exists(test): img = test; break
data.update({'mass_name': '${m_name:-$CUR_NAME}', 'date': '${m_date:-$CUR_DATE}', 'cantor': new_c, 'cantor_image': img})
with open('$MASS_INFO_JSON', 'w') as f: json.dump(data, f, indent=2)
EOF
        echo "✅ Mass Info Updated."
        break
        ;;

      "Manage Moments (Files & Singer)")
        while true; do
            echo "------------------------------------------------"
            echo "Choose a moment to update:"
            MOMENTS=("Entrance" "Responsorial_Psalm" "Gospel_Acclamation" "Offertory" "Communion_Antiphon" "Communion" "Meditation" "Recessional")
            select m_opt in "${MOMENTS[@]}" "Done / Back to Main Menu"; do
                if [[ "$m_opt" == "Done / Back to Main Menu" ]]; then
                    break 2
                fi
                
                CUR_DATA=$(python3 -c "import json; d=json.load(open('$MOMENTS_JSON')); m=next((x for x in d if x['moment'] == '$m_opt'), {}); print(f\"{m.get('mp3','')}|{m.get('pdf','')}|{m.get('txt','')}|{m.get('singer','')}\")")
                CUR_MP3=$(echo "$CUR_DATA" | cut -d'|' -f1); CUR_PDF=$(echo "$CUR_DATA" | cut -d'|' -f2); CUR_TXT=$(echo "$CUR_DATA" | cut -d'|' -f3); CUR_SINGER=$(echo "$CUR_DATA" | cut -d'|' -f4)

                echo "Updating details for: ${m_opt//_/ }"
                read -p "Singer [$CUR_SINGER]: " new_singer
                if [[ -z "$new_singer" ]]; then FINAL_SINGER="$CUR_SINGER"
                elif [[ "$new_singer" == "none" || "$new_singer" == "null" || "$new_singer" == " " ]]; then FINAL_SINGER=""
                else FINAL_SINGER="$new_singer"; fi

                echo "📂 Opening File Pickers..."
                new_txt=$(pick_file "Select TXT for $m_opt" "txt")
                new_pdf=$(pick_file "Select PDF for $m_opt" "pdf")
                new_mp3=$(pick_file "Select MP3 for $m_opt" "mp3")

                DEST_DIR="$MOMENTS_BASE_DIR/$m_opt"
                mkdir -p "$DEST_DIR"

                process_file() {
                    local src="$1"; local cur="$2"; local ext="$3"
                    if [[ -n "$src" && -f "$src" ]]; then
                        rm -f "$DEST_DIR"/*."$ext"; cp "$src" "$DEST_DIR/"
                        echo "$DEST_DIR/$(basename "$src")"
                    else echo "$cur"; fi
                }

                FINAL_MP3=$(process_file "$new_mp3" "$CUR_MP3" "mp3")
                FINAL_PDF=$(process_file "$new_pdf" "$CUR_PDF" "pdf")
                FINAL_TXT=$(process_file "$new_txt" "$CUR_TXT" "txt")

                python3 <<EOF
import json
with open('$MOMENTS_JSON', 'r') as f: d = json.load(f)
for x in d:
    if x['moment'] == '$m_opt':
        x.update({'mp3': '$FINAL_MP3', 'pdf': '$FINAL_PDF', 'txt': '$FINAL_TXT', 'singer': '$FINAL_SINGER'})
with open('$MOMENTS_JSON', 'w') as f: json.dump(d, f, indent=2)
EOF
                echo "🚚 Syncing files and extracting metadata..."
                node "$EXTRACT_TOOL"
                echo "✅ $m_opt updated!"
                break
            done
        done
        break
        ;;

      "Generate Music PDF") node "$MUSIC_PDF_TOOL"; break ;;
      "Generate Lyrics PDF") node "$LYRICS_PDF_TOOL"; break ;;
      "Push to GitHub") git add . && git commit -m "Weekly Update" && git push origin main; break ;;
      "Smart Cleanup") 
          python3 -c "import json, os; m=json.load(open('$MOMENTS_JSON')); keep=[x[k] for x in m for k in ['mp3','pdf','txt'] if x.get(k)]; [os.remove(os.path.join(r,f)) for r,d,fs in os.walk('$MOMENTS_BASE_DIR') for f in fs if os.path.join(r,f) not in keep]"
          echo "🧹 Cleanup complete."; break ;;
      "Quit") exit 0 ;;
    esac
  done
done