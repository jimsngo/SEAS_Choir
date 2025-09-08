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
  const lines = fs.readFileSync(songPath, 'utf8').split(/\r?\n/);
  const title = lines[0] ? lines[0].trim() : '';
  const author = lines[1] ? lines[1].trim() : '';
  const snippet = (lines[3] || '').trim();

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
  console.log(`Created/updated ${metaPath}`);
});

console.log('All meta JSON files created/updated from song text files.');