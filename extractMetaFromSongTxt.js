
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
const PROJECT_ROOT = path.resolve(__dirname);
const MYDATA_PATH = path.join(PROJECT_ROOT, 'moments.json');

// Parses a lyrics .txt file for metadata tags
function parseTxtFile(txtPath) {
  // If file does not exist, return empty object
  if (!fs.existsSync(txtPath)) return {};
  // Read file and split into lines
  const lines = fs.readFileSync(txtPath, 'utf8').split(/\r?\n/);
  // SUNO-style meta tag extraction
  let meta = { title: '', author: '', snippet: '' };
  let foundTitle = false;
  let foundAuthor = false;
  let foundSnippet = false;
  let snippetStartIdx = -1;
  let snippetEndIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const tagMatch = line.match(/^\[(.+?)\]/);
    if (tagMatch) {
      const tag = tagMatch[1].toLowerCase();
      if (!foundTitle && tag === 'title') {
        // Title is the next non-empty line
        for (let j = i + 1; j < lines.length; j++) {
          if (lines[j].trim().length > 0) {
            meta.title = lines[j].trim();
            break;
          }
        }
        foundTitle = true;
      } else if (!foundAuthor && tag === 'author') {
        // Author is the next non-empty line
        for (let j = i + 1; j < lines.length; j++) {
          if (lines[j].trim().length > 0) {
            meta.author = lines[j].trim();
            break;
          }
        }
        foundAuthor = true;
      } else if (foundTitle && foundAuthor && !foundSnippet) {
        // The first meta tag after [Title] and [Author] is the snippet section
        snippetStartIdx = i + 1;
        // Find the next meta tag after this one
        for (let k = i + 1; k < lines.length; k++) {
          const nextTagMatch = lines[k].trim().match(/^\[(.+?)\]/);
          if (nextTagMatch) {
            snippetEndIdx = k;
            break;
          }
        }
        if (snippetEndIdx === -1) {
          snippetEndIdx = lines.length;
        }
        // Join all lines in the snippet section, trim empty lines
        meta.snippet = lines.slice(snippetStartIdx, snippetEndIdx).map(l => l.trim()).filter(l => l.length > 0).join(' ');
        foundSnippet = true;
        // No break; allow further processing if needed
      }
    }
  }
  // Debug: print final extracted metadata
  console.log('DEBUG: Final extracted metadata:', meta);
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
  console.log('DEBUG: Number of sections in moments.json:', newSections.length);

  // Loop through each moment/section
  for (let i = 0; i < newSections.length; i++) {
    const section = newSections[i];
    let txtPath = null;
    // Determine path to lyrics .txt file
    if (section.txt) {
      txtPath = path.isAbsolute(section.txt)
        ? section.txt
        : path.join(PROJECT_ROOT, section.txt);
      console.log(`DEBUG: Checking txtPath for moment "${section.moment}": ${txtPath}`);
      console.log('  Exists:', fs.existsSync(txtPath));
    }
    // If lyrics file exists, extract metadata
    if (txtPath && fs.existsSync(txtPath)) {
      const meta = parseTxtFile(txtPath);
      // Debug: print extracted meta and section for every entry
      console.log(`DEBUG meta for moment: ${section.moment}`);
      console.log('  Extracted meta:', meta);
      console.log('  Section before update:', JSON.stringify(section, null, 2));
      // Always update metadata fields from extracted values
      if (meta.title) {
        if (section.title !== meta.title) changed = true;
        section.title = meta.title;
      }
      if (meta.author) {
        if (section.author !== meta.author) changed = true;
        section.author = meta.author;
      }
      if (meta.snippet) {
        if (section.snippet !== meta.snippet) changed = true;
        section.snippet = meta.snippet;
      }
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
