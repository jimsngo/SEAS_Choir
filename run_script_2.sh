#!/bin/bash

# ==========================================
#        ROOT-LEVEL PATH CONTROL
# ==========================================
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$SCRIPT_DIR"
cd "$PROJECT_ROOT"

# Configuration Baselines
MASS_INFO_JSON="config/mass_info.json"
MOMENTS_JSON="config/moments.json"
CANTORS_JSON="config/cantors.json"
MOMENTS_BASE_DIR="data/Moments"
CANTOR_IMG_DIR="images"

# Modular Specialized Subscript Tools
EXTRACT_TOOL="src/scripts/extractMetaFromSongTxt.js"
MUSIC_PDF_TOOL="src/scripts/buildAndMergePdfs.js"
LYRICS_PDF_TOOL="src/scripts/buildAndMergeTxtToPdf.js"
SEARCH_LINK_TOOL="src/scripts/selectAssetByKeyword.sh"

# Global Target Root Library Location
TARGET_LIBRARY="/Users/jim/Library/CloudStorage/GoogleDrive-jim.ngo.seas@gmail.com/My Drive/SEAS_GoogleDrive"

# Core Dashboard Option Router Loop
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
  echo "6) Smart Cleanup & Reset GitHub History"
  echo "7) Quit"
  echo "-------------------------------------------------"
  
  read -p "Select an option [Enter or q to quit]: " main_choice
  if [[ -z "$main_choice" || "$main_choice" == "q" || "$main_choice" == "Q" || "$main_choice" == "7" ]]; then
    echo "Exiting..."; exit 0
  fi

  case $main_choice in
    1)
        echo "------------------------------------------------"
        CUR_NAME=$(python3 -c "import json; print(json.load(open('$MASS_INFO_JSON'))['mass_name'])")
        CUR_DATE=$(python3 -c "import json; print(json.load(open('$MASS_INFO_JSON'))['date'])")
        CUR_CANTOR=$(python3 -c "import json; print(json.load(open('$MASS_INFO_JSON'))['cantor'])")
        
        echo "Current Cantor: $CUR_CANTOR"
        echo "Available Cantors:"
        CANTOR_LIST=($(python3 -c "import json; print(' '.join([n.replace(' ', '_') for n in json.load(open('$CANTORS_JSON'))]))"))
        for i in "${!CANTOR_LIST[@]}"; do echo "$((i+1))) ${CANTOR_LIST[$i]//_/ }"; done

        read -p "Select Cantor Number (or Enter to keep current): " c_choice
        SELECTED_CANTOR="${CANTOR_LIST[$((c_choice-1))]//_/ }"
        [[ -z "$SELECTED_CANTOR" ]] && SELECTED_CANTOR="$CUR_CANTOR"

        read -p "Mass Name [$CUR_NAME]: " m_name
        read -p "Date [$CUR_DATE]: " m_date

        python3 <<EOF
import json, os
with open('$MASS_INFO_JSON', 'r') as f: data = json.load(f)
data.update({'mass_name': "${m_name:-$CUR_NAME}", 'date': "${m_date:-$CUR_DATE}", 'cantor': "$SELECTED_CANTOR"})
for ext in ['.jpg', '.png', '.jpeg', '.JPG', '.PNG']:
    test_path = os.path.join('$CANTOR_IMG_DIR', "$SELECTED_CANTOR" + ext)
    if os.path.exists(test_path):
        data['cantor_image'] = test_path; break
with open('$MASS_INFO_JSON', 'w') as f: json.dump(data, f, indent=2)
EOF
        node "$EXTRACT_TOOL"; echo "✅ Mass Info Updated."; sleep 1
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

            echo "------------------------------------------------"
            read -p "Enter song search keyword (e.g., Here I am): " search_kw
            echo "------------------------------------------------"

            if [[ -n "$search_kw" ]]; then
                echo "🔍 Scanning library for text file..."
                new_txt=$( ./"$SEARCH_LINK_TOOL" "$TARGET_LIBRARY" "new_txt" "$search_kw" "txt" "Select TXT for $m_opt" | grep "RESULT_PATH:" | cut -d':' -f2- )
                
                echo "🔍 Scanning library for music score..."
                new_pdf=$( ./"$SEARCH_LINK_TOOL" "$TARGET_LIBRARY" "new_pdf" "$search_kw" "pdf" "Select PDF for $m_opt" | grep "RESULT_PATH:" | cut -d':' -f2- )
                
                echo "🔍 Scanning library for audio track..."
                new_mp3=$( ./"$SEARCH_LINK_TOOL" "$TARGET_LIBRARY" "new_mp3" "$search_kw" "mp3" "Select MP3 for $m_opt" | grep "RESULT_PATH:" | cut -d':' -f2- )
            else
                echo "📂 Opening manual file pickers..."
                new_txt=$(osascript -e "POSIX path of (choose file with prompt \"Select TXT\" of type {\"txt\"} default location (POSIX file \"$TARGET_LIBRARY\"))" 2>/dev/null)
                new_pdf=$(osascript -e "POSIX path of (choose file with prompt \"Select PDF\" of type {\"pdf\"} default location (POSIX file \"$TARGET_LIBRARY\"))" 2>/dev/null)
                new_mp3=$(osascript -e "POSIX path of (choose file with prompt \"Select MP3\" of type {\"mp3\"} default location (POSIX file \"$TARGET_LIBRARY\"))" 2>/dev/null)
            fi

            DEST_DIR="$MOMENTS_BASE_DIR/$m_opt"; mkdir -p "$DEST_DIR"
            process_file() {
                if [[ -n "$1" && -f "$1" ]]; then
                    rm -f "$DEST_DIR"/*."$3"; cp "$1" "$DEST_DIR/"
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
    if x['moment'] == '$m_opt': x.update({'mp3': '$FINAL_MP3', 'pdf': '$FINAL_PDF', 'txt': '$FINAL_TXT', 'singer': '$FINAL_SINGER'})
with open('$MOMENTS_JSON', 'w') as f: json.dump(d, f, indent=2)
EOF
            node "$EXTRACT_TOOL"; echo "✅ $m_opt updated in $DEST_DIR."
            sleep 1.5   # ⏳ Small pause to view the confirmation before the menu reprints
        done
        ;;

    3) node "$MUSIC_PDF_TOOL"; sleep 1 ;;
    4) node "$LYRICS_PDF_TOOL"; sleep 1 ;;
    5) git add . && git commit -m "Weekly Update" && git push origin main; sleep 1 ;;
    6) 
        python3 -c "import json, os; m=json.load(open('$MOMENTS_JSON')); keep=[x[k] for x in m for k in ['mp3','pdf','txt'] if x.get(k)]; [os.remove(os.path.join(r,f)) for r,d,fs in os.walk('$MOMENTS_BASE_DIR') for f in fs if os.path.join(r,f) not in keep]"
        find data/ -maxdepth 1 -type d ! -path "data/" ! -path "data/Moments" ! -path "data/Mass_Parts" -exec rm -rf {} +
        echo "🧹 Local orphan files cleaned."
        read -p "Do you want to wipe ALL previous commit history? (y/n): " wipe_git
        if [ "$wipe_git" = "y" ] || [ "$wipe_git" = "Y" ]; then
            git checkout --orphan temp_branch_clean && git add -A && git commit -m "Initialize Fresh Automation Baseline"
            git branch -D main && git branch -m main && git push origin main --force
            git reflog expire --expire=now --all && git gc --prune=now --aggressive
            echo "✅ GitHub commit history has been cleared and reset!"
        fi; sleep 2 ;;
    *) echo "Invalid choice."; sleep 1 ;;
  esac
done