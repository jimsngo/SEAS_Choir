// batchCleanLyrics.js
// Usage: node batchCleanLyrics.js
// Scans all .txt files in lyrics/ for non-ASCII characters and cleans them.

const fs = require('fs');
const path = require('path');
const { cleanText } = require('./cleanTxtFile.js');

const lyricsDir = path.join(__dirname, '../../src/data/lyrics');
const files = fs.readdirSync(lyricsDir).filter(f => f.endsWith('.txt'));

files.forEach(file => {
  const inputPath = path.join(lyricsDir, file);
  const raw = fs.readFileSync(inputPath, 'utf8');
  const nonAsciiMatches = raw.match(/[^\x00-\x7F]/g);
  if (nonAsciiMatches) {
    const uniqueChars = Array.from(new Set(nonAsciiMatches));
    console.log(`Non-ASCII characters found in ${file}:`, uniqueChars.map(c => `U+${c.charCodeAt(0).toString(16).padStart(4, '0')} '${c}'`).join(', '));
  }
  const cleaned = cleanText(raw);
  fs.writeFileSync(inputPath, cleaned, { encoding: 'utf8' });
});

// Remove any *_cleaned.txt files left over from previous runs

fs.readdirSync(lyricsDir).forEach(f => {
  if (f.endsWith('_cleaned.txt') || f.endsWith('_cleaned_cleaned.txt')) {
    fs.unlinkSync(path.join(lyricsDir, f));
  }
});

console.log('Batch cleaning complete. All .txt files are sanitized and only originals are kept.');
