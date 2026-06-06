# SEAS Choir Music Resource Repository

This repository manages choir music resources for SEAS, including lyrics text baselines, audio tracks, sheet music scores, and automation dashboard scripts. It organizes files dynamically by liturgical moments to synchronize documentation, automate local layouts, and maintain public repository status.

## Core Architecture & File Structure

The automation suite interacts directly with local files stored within your workspace, utilizing JSON data streams to track assets.

### 1. Configuration Baselines (`config/`)
* `config/mass_info.json` — Stores global attributes for the upcoming Sunday (Mass Name, Liturgical Date, Active Cantor Name, and active cantor avatar asset path).
* `config/moments.json` — The master matrix tracking connected assets (`.txt`, `.pdf`, `.mp3`) and specific voice designations (`singer`) across the 8 sequential Mass moments.
* `config/cantors.json` — Roster list of available cantor vocalists.

### 2. Liturgical Data Engine (`data/Moments/`)
Organized sequentially into dedicated subfolders tracking live assets for deployment:
* `Entrance/`
* `Responsorial_Psalm/`
* `Gospel_Acclamation/`
* `Offertory/`
* `Communion_Antiphon/`
* `Communion/`
* `Meditation/`
* `Recessional/`

---

## Tooling & Core Scripts (`src/scripts/`)

All complex computational loops are isolated into the `src/scripts/` library to keep the master runner script human-readable and clean.

* `run_script_2.sh` — **The Master Dashboard**. Provides a clean 7-option user menu to update mass info, manage moments, compile assets, and push directly to remote servers.
* `src/scripts/selectAssetByKeyword.sh` — **Spotlight-Free Finder Module**. Triggered automatically by the dashboard. It scans local storage roots across multiple layers using tokenized multi-word wildcards to resolve space/hyphen name variations instantly, completely bypassing broken macOS Spotlight indices.
* `src/scripts/buildAndMergeTxtToPdf.js` — **Column-by-Column Flow Engine**. Parses incoming `.txt` song parameters and estimates absolute element heights block-by-block. If a long song (e.g., a 5-verse Offertory) runs out of vertical spacing, it automatically wraps the *entire song block* to the next column or page. This eliminates awkward sentence truncations and empty page gaps.
* `src/scripts/buildAndMergePdfs.js` — Combines separate musical sheet score sheets into a singular structured master copy for musicians.
* `src/scripts/extractMetaFromSongTxt.js` — Extracts metadata attributes directly out of parsed lyrics to synchronize information to index layouts.

---

## Example Automation Workflow

### Option 2: Manage Moments (Dynamic Asset Allocation)
1. Select a liturgical target segment (e.g., *4) Offertory*).
2. Enter an active singer assignment or hit Enter to keep current.
3. Input a natural phrase search keyword (e.g., `Here I am`).
4. The background suite isolates words, queries local hard drives natively, and evaluates matches:
    * **Single match:** Automatically binds the unique track or file directly into configuration models.
    * **Multiple matches:** Outputs an instant, numbered selection menu directly inside the terminal screen for you to select the exact key, suffix, or arrangement variation you need.

### Option 4: Generate Lyrics PDF
Triggers Node.js layout engines to measure font spacing bounds. Songs wrap cleanly column-by-column as unbreakable blocks, guaranteeing optimized page allocation with compact layout footprints.

---

## Maintenance & Housekeeping

* **Smart Cleanup (Option 6):** Scans the `data/Moments/` workspace folders, compares entries against active `moments.json` targets, and automatically purges old orphan or duplicate asset clutter.
* **Git Layer Reset:** Provides an optional workflow to wipe historical tracking commits safely, re-indexing local caching allocation layers (`git gc --prune=now`) to keep cloud synchronization weight compact and lightning fast.