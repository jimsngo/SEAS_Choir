// node extractMetaFromSongTxt.js

// This script extracts metadata from each .txt file in the moments/ subfolders and writes a .json file for each song.
// It removes all previous .json files in each moment folder and keeps only the latest metadata for each song.

// It assumes each moment folder contains a text file (e.g., song.txt) with the following format:
// The first line as the title
// The second line as the author
// The rest as the lyrics/snippet

// How it works:
// For each moment folder, the script finds the first .txt file (regardless of its name).
// It extracts the title, author, and snippet as before.
// It deletes all previous .json files in the folder, then writes the new meta JSON file using the title.

const fs = require('fs');
const path = require('path');

const momentsDir = './moments';

const folders = fs.readdirSync(momentsDir).filter(f =>
  fs.statSync(path.join(momentsDir, f)).isDirectory()
);


folders.forEach(folder => {
  const folderPath = path.join(momentsDir, folder);
  // Find the first .txt file in the folder
  const txtFiles = fs.readdirSync(folderPath).filter(f => f.endsWith('.txt'));
  if (txtFiles.length === 0) {
    console.warn(`No .txt file found in ${folder}`);
    return;
  }

  const songPath = path.join(folderPath, txtFiles[0]);
  // Read file, remove BOM if present, split into lines (handle all line endings), trim, and filter empty lines
  let fileContent = fs.readFileSync(songPath, 'utf8');
  if (fileContent.charCodeAt(0) === 0xFEFF) {
    fileContent = fileContent.slice(1);
  }
  // Split on \r\n, \n, or \r, then trim and filter out empty lines
  const lines = fileContent.split(/\r\n|\n|\r/).map(l => l.trim()).filter(l => l.length > 0);
  // Debug: print all lines with indices
  console.log(`\n--- Debug: Lines in ${songPath} ---`);
  lines.forEach((l, idx) => console.log(`${idx}: '${l.replace(/\r/g, "\\r").replace(/\n/g, "\\n")}'`));
  console.log('-----------------------------------');

  const title = lines[0] ? lines[0] : '';
  const author = lines[1] ? lines[1] : '';
  // Debug: print raw char codes for author line
  if (lines[1]) {
    console.log('Author line char codes:', Array.from(lines[1]).map(c => c.charCodeAt(0)));
  }
  // Find the first non-empty, non-header line after the author
  let snippet = '';
  const headerRegex = /^\s*\[\s*([A-Za-z0-9 ]+)\s*\]\s*$/i;
  for (let i = 2; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    if (headerRegex.test(line)) {
      console.log(`Skipping header line: '${line}'`);
      continue;
    }
    console.log(`Using snippet line: '${line}'`);
    snippet = line;
    break;
  }

  // Sanitize title for filename
  const safeTitle = title.replace(/[\/\\?%*:|"<>]/g, '_');
  const metaPath = path.join(folderPath, `${safeTitle}.json`);

  // Remove all previous .json files in the folder before writing the new one
  const jsonFiles = fs.readdirSync(folderPath).filter(f => f.endsWith('.json'));
  jsonFiles.forEach(f => {
    try {
      fs.unlinkSync(path.join(folderPath, f));
    } catch (e) {
      console.warn(`Could not delete ${f} in ${folderPath}`);
    }
  });

  const meta = { title, author, snippet };
  fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));
  console.log(`Created/updated JSON: ${metaPath}`);
});

console.log('All meta JSON files created/updated from song text files.');