// cleanTxtFile.js
// Script to clean and validate a lyrics TXT file for best parsing by the extraction script.
// Usage: node cleanTxtFile.js <input.txt> <output.txt>

const fs = require('fs');
const path = require('path');

if (process.argv.length < 4) {
  console.log('Usage: node cleanTxtFile.js <input.txt> <output.txt>');
  process.exit(1);
}

const inputPath = process.argv[2];
const outputPath = process.argv[3];

if (!fs.existsSync(inputPath)) {
  console.error('Input file does not exist:', inputPath);
  process.exit(1);
}

const lines = fs.readFileSync(inputPath, 'utf8').split(/\r?\n/);
let cleaned = [];
let lastWasHeader = false;

for (let line of lines) {
  // Remove invisible characters and trim
  let cleanLine = line.replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
  // If line is a section header
  if (/^\[.+?\]$/.test(cleanLine)) {
    // Add a blank line before header if previous wasn't blank
    if (cleaned.length && cleaned[cleaned.length-1] !== '') {
      cleaned.push('');
    }
    cleaned.push(cleanLine);
    lastWasHeader = true;
  } else if (cleanLine === '') {
    // Collapse multiple blank lines
    if (!lastWasHeader && cleaned.length && cleaned[cleaned.length-1] !== '') {
      cleaned.push('');
    }
    lastWasHeader = false;
  } else {
    cleaned.push(cleanLine);
    lastWasHeader = false;
  }
}

// Remove leading/trailing blank lines
while (cleaned.length && cleaned[0] === '') cleaned.shift();
while (cleaned.length && cleaned[cleaned.length-1] === '') cleaned.pop();

fs.writeFileSync(outputPath, cleaned.join('\n'));
console.log('Cleaned file written to', outputPath);
