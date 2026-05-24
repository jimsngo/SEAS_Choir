# Copilot Coding Agent Instructions for SEAS_Choir

## Project Overview
This repository manages choir music resources for SEAS, including lyrics, metadata, PDFs, and scripts for automation. The structure is organized by liturgical moments (e.g., entrance, offertory) with each moment containing relevant files (lyrics, audio, PDFs, metadata).

## Key Directories & Files
- `moments/` — Main data directory. Each subfolder represents a liturgical moment and contains:
  - `.txt` (lyrics), `.json` (metadata), `.mp3` (audio), `.pdf` (sheet music)
- `pdfs/` — Aggregated or exported PDF files
- `images/` — Choir member and event images
- `extractMetaFromSongTxt.js` — Script to extract metadata from lyrics text files and generate/update JSON meta files
- `mergeTextFiles.js`, `buildAndMergePdfs.js` — Scripts for merging text or PDF files
- `mydata.json` — Aggregated metadata (if present)

## Automation & Workflows
  - Run `node extractMetaFromSongTxt.js` to generate or update JSON metadata for each song in `moments/`.
  - The script expects the first line of each `.txt` file to be the title, the second the author, and the third a snippet/lyric.
  - Output JSON is named after the sanitized title and placed in the same folder.
  - Use `mergeTextFiles.js` and `buildAndMergePdfs.js` for combining files. These scripts expect specific folder structures and naming conventions.

- **Aggregating Metadata (`updateMyDataFromMoments.js`):**
  - Run `node updateMyDataFromMoments.js` to update `mydata.json` based on the actual contents of the `moments/` folders.
  - For each section in `mydata.json`, the script matches the `moment` field to a folder in `moments/` (case-insensitive, spaces/punctuation replaced by underscores).
  - It updates `audio_url` to the first `.mp3` found, and if a matching `.json` exists (same base name as the `.mp3`), it updates `title`, `author`, and `snippet` fields from that file.
  - This keeps `mydata.json` in sync with the real files and metadata in the repository.

## Project Conventions
- **File Naming:**
  - Metadata JSON files are named after the song title (sanitized for filesystem safety).
  - Each moment folder should contain only one `.txt` file per song.
- **Data Flow:**
  - Text files → Metadata extraction → JSON files → Aggregation/merging scripts
- **No formal test suite** is present; validate scripts by running them and inspecting output files.

## Integration & Dependencies
- Pure Node.js scripts; no external dependencies required for core automation.
- No build step or transpilation; scripts are run directly with Node.js.

## Examples
- To update all metadata: `node extractMetaFromSongTxt.js`
- To merge all text files: `node mergeTextFiles.js`

## Tips for AI Agents
- Always check for the presence and structure of `.txt` files before running metadata scripts.
- When adding new songs, follow the title/author/snippet convention in `.txt` files.
- When updating scripts, preserve compatibility with the existing folder and file naming conventions.

---
If any section is unclear or missing important project-specific details, please provide feedback for further refinement.
