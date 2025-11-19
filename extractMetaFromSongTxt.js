
// extractMetaFromSongTxt.js
//
// Script to extract song metadata (title, author, snippet) from structured lyrics .txt files referenced in moments.json.
// For each section in moments.json, if a lyrics .txt file is specified, this script parses the file for metadata fields:
//   - [Title] section (or first section): Song title
//   - [Author] section: Song author
//   - [Response], [Refrain], [Acclamation], or [Verse] section: Used as snippet (priority order)
//
// The script updates the corresponding section in moments.json with the extracted metadata fields.
//
// Usage:
//   node extractMetaFromSongTxt.js
//
// Notes:
// - moments.json must exist and contain either an array or an object with a 'sections' array.
// - Each section should have a 'lyrics' field pointing to a .txt file (relative or absolute path).
// - The script does not create or modify lyrics .txt files; it only reads and extracts metadata.
// - If no metadata is found, empty fields are ensured for title, author, and snippet.
// - Updates are only written if changes are detected.

const fs = require('fs');
const path = require('path');
const PROJECT_ROOT = path.resolve(__dirname);
const MYDATA_PATH = path.join(PROJECT_ROOT, 'moments.json');

function parseTxtFile(txtPath) {
  if (!fs.existsSync(txtPath)) return {};
  const lines = fs.readFileSync(txtPath, 'utf8').split(/\r?\n/);
  let meta = {};
  let currentSection = null;
  let buffer = [];
  let foundTitle = false, foundAuthor = false;
  let snippetSections = {};
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const sectionMatch = line.match(/^\[(.+?)\]$/);
    if (sectionMatch) {
      // Save previous section
      if (currentSection && buffer.length) {
        const content = buffer.join(' ').trim();
        if (currentSection === 'Title' && !foundTitle) {
          meta.title = content;
          foundTitle = true;
        } else if (currentSection === 'Author' && !foundAuthor) {
          meta.author = content;
          foundAuthor = true;
        } else if (['Response','Refrain','Acclamation','Verse'].includes(currentSection)) {
          snippetSections[currentSection] = content;
        }
      }
      currentSection = sectionMatch[1];
      buffer = [];
    } else if (currentSection) {
      buffer.push(line);
    }
  }
  // Save last section
  if (currentSection && buffer.length) {
    const content = buffer.join(' ').trim();
    if (currentSection === 'Title' && !foundTitle) {
      meta.title = content;
    } else if (currentSection === 'Author' && !foundAuthor) {
      meta.author = content;
    } else if (['Response','Refrain','Acclamation','Verse'].includes(currentSection)) {
      snippetSections[currentSection] = content;
    }
  }
  // Priority: Response > Refrain > Acclamation > Verse
  meta.snippet = snippetSections['Response'] || snippetSections['Refrain'] || snippetSections['Acclamation'] || snippetSections['Verse'] || '';
  return meta;
}

function updateMyDataFromTxt() {
  let mydata = JSON.parse(fs.readFileSync(MYDATA_PATH, 'utf8'));
  let changed = false;
  // Always treat as array
  let newSections = Array.isArray(mydata) ? JSON.parse(JSON.stringify(mydata)) : [];
  console.log('DEBUG: Number of sections in moments.json:', newSections.length);
  for (let i = 0; i < newSections.length; i++) {
    const section = newSections[i];
    let txtPath = null;
    if (section.txt) {
      txtPath = path.isAbsolute(section.txt)
        ? section.txt
        : path.join(PROJECT_ROOT, section.txt);
      console.log(`DEBUG: Checking txtPath for moment "${section.moment}": ${txtPath}`);
      console.log('  Exists:', fs.existsSync(txtPath));
    }
    if (txtPath && fs.existsSync(txtPath)) {
      const meta = parseTxtFile(txtPath);
      // Debug: print extracted meta and section for every entry
      console.log(`DEBUG meta for moment: ${section.moment}`);
      console.log('  Extracted meta:', meta);
      console.log('  Section before update:', JSON.stringify(section, null, 2));
      // Always update if new value is found (even if field exists but is empty or blank)
      if (meta.title && (section.title !== meta.title)) {
        section.title = meta.title;
        changed = true;
      }
      if (meta.author && (section.author !== meta.author)) {
        section.author = meta.author;
        changed = true;
      }
      if (meta.snippet && (section.snippet !== meta.snippet)) {
        section.snippet = meta.snippet;
        changed = true;
      }
      // Ensure fields exist even if no lyrics file
      if (!('title' in section)) section.title = '';
      if (!('author' in section)) section.author = '';
      if (!('snippet' in section)) section.snippet = '';
    } else {
      if (!('title' in section)) section.title = '';
      if (!('author' in section)) section.author = '';
      if (!('snippet' in section)) section.snippet = '';
    }
  }
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

if (require.main === module) {
  updateMyDataFromTxt();
}
