
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
  // Initialize metadata object
  let meta = { title: '', author: '', snippet: '' };
  // Track current section/tag (e.g., Title, Author, Refrain)
  let currentSection = null;
  // Buffer to accumulate lines for current section
  let buffer = [];
  // Track the first section after Title/Author for snippet
  let snippet = '';
  let afterAuthor = false;
  let snippetBuffer = [];
  let foundSnippet = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();
    const sectionMatch = trimmedLine.match(/^\[(.+?)\]$/);
    if (sectionMatch) {
      // If we hit a new section/tag (e.g. [Verse], [Refrain], etc.)
      if (currentSection) {
        if (currentSection === 'Title') {
          // Save the first non-empty line as the title
          const titleLine = buffer.find(l => l.trim().length > 0);
          meta.title = titleLine ? titleLine.trim() : '';
        } else if (currentSection === 'Author') {
          // Save all non-empty lines as the author
          meta.author = buffer.map(l => l.trim()).filter(l => l.length > 0).join(' ');
          afterAuthor = true; // Mark that we've passed the author section
        } else if (afterAuthor && !foundSnippet) {
          // This is the first section after [Author]
          // Always omit the tag name for the snippet, regardless of the tag
          snippetBuffer = buffer.slice();
          foundSnippet = true;
        }
      }
      // Move to the new section/tag
      currentSection = sectionMatch[1];
      buffer = [];
    } else if (currentSection) {
      // Accumulate lines for the current section/tag
      buffer.push(line);
    }
  }
  // Save last section if needed
  if (currentSection) {
    if (currentSection === 'Title') {
      // Save the first non-empty line as the title
      const titleLine = buffer.find(l => l.trim().length > 0);
      meta.title = titleLine ? titleLine.trim() : '';
    } else if (currentSection === 'Author') {
      // Save all non-empty lines as the author
      meta.author = buffer.map(l => l.trim()).filter(l => l.length > 0).join(' ');
      afterAuthor = true;
    } else if (afterAuthor && !foundSnippet) {
      // If this is the first section after [Author] and no snippet found yet,
      // use the content of this section as the snippet (without tag name)
      snippetBuffer = buffer.slice();
      foundSnippet = true;
    }
  }
  meta.snippet = snippetBuffer.map(l => l.trim()).filter(l => l.length > 0).join(' ');
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
