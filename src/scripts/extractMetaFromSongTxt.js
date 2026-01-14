
// extractMetaFromSongTxt.js
//
// Script to extract song metadata (title, author, snippet) from structured lyrics .txt files referenced in moments.json.
// For each section in moments.json, if a lyrics .txt file is specified, this script parses the file for metadata fields:
//   - [Title] section: Song title
//   - [Author] section: Song author
//   - [Refrain], [Response], [Acclamation], [Verse 1], [Verse]: Used as snippet (priority order)
//
// The script updates the corresponding section in moments.json with the extracted metadata fields.
//
// Usage:
//   node extractMetaFromSongTxt.js
//
// Notes:
// - moments.json must exist and contain either an array or an object with a 'sections' array.
// - Each section should have a 'txt' field pointing to a .txt file (relative or absolute path).
// - The script does not create or modify lyrics .txt files; it only reads and extracts metadata.
// - If no metadata is found, empty fields are ensured for title, author, and snippet.
// - Updates are only written if changes are detected.
//
// Detailed logic comments added for clarity.

const fs = require('fs');
const path = require('path');
// Define project root and path to moments.json
const PROJECT_ROOT = path.resolve(__dirname, '../..');
const MYDATA_PATH = path.join(PROJECT_ROOT, 'config/moments.json');

// Import cleanText from cleanTxtFile.js
const { cleanText } = (() => {
  try {
    return require('./cleanTxtFile.js');
  } catch (e) {
    return { cleanText: s => s };
  }
})();

// Parses a lyrics .txt file for metadata tags
function parseTxtFile(txtPath) {
  // If file does not exist, return empty object
  if (!fs.existsSync(txtPath)) return {};
  // Read file, sanitize, and split into lines
  let raw = fs.readFileSync(txtPath, 'utf8');
  raw = cleanText(raw);
  const lines = raw.split(/\n/);
  // SUNO-style meta tag extraction
  let meta = { title: '', author: '', snippet: '' };
  // Helper to normalize tags
  function normalizeTag(line) {
    // Remove spaces inside brackets, lowercase, and trim
    return line.replace(/\[\s*(.+?)\s*\]/, '[$1]').trim().toLowerCase();
  }

  // Extract title
  for (let i = 0; i < lines.length; i++) {
    if (normalizeTag(lines[i]) === '[title]') {
      for (let j = i + 1; j < lines.length; j++) {
        if (lines[j].trim().length > 0) {
          meta.title = lines[j].trim();
          break;
        }
      }
      break;
    }
  }
  // Extract author robustly: first non-empty line after [Author]
  let authorIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (normalizeTag(lines[i]) === '[author]') {
      authorIdx = i;
      let j = i + 1;
      while (j < lines.length) {
        if (lines[j].trim().length > 0) {
          meta.author = lines[j].trim();
          break;
        }
        j++;
      }
      break;
    }
  }
  // Extract snippet: all lines after first tag following [Author], up to next tag
  let snippetStartIdx = -1;
  let snippetEndIdx = lines.length;
  if (authorIdx !== -1) {
    // Find first meta tag after [Author]
    for (let i = authorIdx + 1; i < lines.length; i++) {
      if (lines[i].trim().match(/^\[.+?\]/)) {
        snippetStartIdx = i + 1;
        // Find next tag after snippetStartIdx
        for (let k = snippetStartIdx; k < lines.length; k++) {
          if (lines[k].trim().match(/^\[.+?\]/)) {
            snippetEndIdx = k;
            break;
          }
        }
        break;
      }
    }
    if (snippetStartIdx !== -1) {
      meta.snippet = lines.slice(snippetStartIdx, snippetEndIdx).map(l => l.trim()).filter(l => l.length > 0).join(' ');
    }
  }
  // Return extracted metadata
  return meta;
}

// Updates moments.json with extracted metadata from each referenced .txt file
function updateMyDataFromTxt() {
  // Read moments.json data
  let mydata = JSON.parse(fs.readFileSync(MYDATA_PATH, 'utf8'));
  let changed = false;
  // Always treat as array for update
  let newSections = Array.isArray(mydata) ? JSON.parse(JSON.stringify(mydata)) : [];

  // Loop through each moment/section
  for (let i = 0; i < newSections.length; i++) {
    const section = newSections[i];
    let txtPath = null;
    // Determine path to lyrics .txt file
    if (section.txt) {
      txtPath = path.isAbsolute(section.txt)
        ? section.txt
        : path.join(PROJECT_ROOT, section.txt);
    }
    // If lyrics file exists, extract metadata
    if (txtPath && fs.existsSync(txtPath)) {
      const meta = parseTxtFile(txtPath);
      // Always update metadata fields from extracted values
        if (section.title !== meta.title) changed = true;
        section.title = meta.title;
        if (section.author !== meta.author) changed = true;
        section.author = meta.author;
        if (section.snippet !== meta.snippet) changed = true;
        section.snippet = meta.snippet;
        // Ensure fields exist even if no lyrics file
        if (!('title' in section)) section.title = '';
        if (!('author' in section)) section.author = '';
        if (!('snippet' in section)) section.snippet = '';
    } else {
      // If no lyrics file, ensure fields exist but are empty
      if (!('title' in section)) section.title = '';
      if (!('author' in section)) section.author = '';
      if (!('snippet' in section)) section.snippet = '';
    }
  }
  // If any changes were made, write updated data back to moments.json
  if (changed) {
    // If original is array, write array; if object with sections, update sections
    if (Array.isArray(mydata)) {
      fs.writeFileSync(MYDATA_PATH, JSON.stringify(newSections, null, 2));
    } else {
      fs.writeFileSync(MYDATA_PATH, JSON.stringify({ ...mydata, sections: newSections }, null, 2));
    }
    console.log('moments.json updated from .txt files');
  } else {
    console.log('No updates made to moments.json');
  }
}

// If script is run directly, perform update
if (require.main === module) {
  updateMyDataFromTxt();
}
