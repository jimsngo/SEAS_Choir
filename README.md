# SEAS Choir Music Resource Repository

This repository manages choir music resources for SEAS, including lyrics, metadata, PDFs, and automation scripts. It is organized by liturgical moments (e.g., entrance, offertory), with each moment containing relevant files such as lyrics, audio, PDFs, and metadata.

## Key Directories & Files
- `moments/` — Main data directory. Each subfolder represents a liturgical moment and contains:
  - `.txt` (lyrics), `.json` (metadata), `.mp3` (audio), `.pdf` (sheet music)
- `pdfs/` — Aggregated or exported PDF files
- `images/` — Choir member and event images
- `extractMetaFromSongTxt.js` — Script to extract metadata from lyrics text files and generate/update JSON meta files
- `mergeTextFiles.js`, `buildAndMergePdfs.js` — Scripts for merging text or PDF files
- `mydata.json` — Aggregated metadata (if present)

## Automation & Workflows
- **Metadata Extraction:**
  - Run `node extractMetaFromSongTxt.js` to generate or update JSON metadata for each song in `moments/`.
  - The script expects the first line of each `.txt` file to be the title, the second the author, and the third a snippet/lyric.
  - Output JSON is named after the sanitized title and placed in the same folder. Only the latest JSON is kept.
- **Aggregating Metadata:**
  - Run `node updateMyDataFromMoments.js` to update `mydata.json` based on the actual contents of the `moments/` folders.
  - The script updates `audio_url`, `title`, `author`, and `snippet` fields in `mydata.json` from the only `.mp3` and `.json` file in each folder.
- **Merging PDFs/Text:**
  - Use `mergeTextFiles.js` and `buildAndMergePdfs.js` for combining files. These scripts expect specific folder structures and naming conventions.

## Project Conventions
- Only one `.txt`, `.mp3`, `.pdf`, and `.json` file per moment folder.
- Metadata JSON files are named after the song title (sanitized for filesystem safety).
- No formal test suite; validate scripts by running them and inspecting output files.

## Dependencies
- Pure Node.js scripts; no external dependencies required for core automation.
- No build step or transpilation; scripts are run directly with Node.js.

## Example Commands
- Update all metadata: `node extractMetaFromSongTxt.js`
- Update aggregated metadata: `node updateMyDataFromMoments.js`
- Merge all text files: `node mergeTextFiles.js`

---
For more details, see `.github/copilot-instructions.md`.
