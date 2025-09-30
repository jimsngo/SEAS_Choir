// node mergeTextFiles.js
// This script that will:

// Scan each moments subfolder (in order).
// Find the text file in each folder (e.g., the one matching the base name of the .mp3 file, or just the first .txt file).
// Merge the contents of all those text files into a single output file (e.g., merged_output.txt).

const fs = require('fs');
const path = require('path');

const momentsDir = './moments';
const outputTxt = './pdfs/lyrics.txt';

// Normalize both folder and moment names the same way
function normalizeName(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

// Build momentHeadings map
let momentHeadings = {};
try {
  const data = JSON.parse(fs.readFileSync('./mydata.json', 'utf8'));
  if (Array.isArray(data.sections)) {
    data.sections.forEach(section => {
      if (section.moment) {
        const normalized = normalizeName(section.moment);
        momentHeadings[normalized] = section.moment;
      }
    });
  }
} catch (e) {
  console.warn('Could not read mydata.json, using folder names for headings.');
}

const folders = fs.readdirSync(momentsDir)
  .filter(f => fs.statSync(path.join(momentsDir, f)).isDirectory())
  .sort();

let mergedText = '';
let pageNumber = 1;

folders.forEach(folder => {
  const folderPath = path.join(momentsDir, folder);
  const files = fs.readdirSync(folderPath);

  // Match .txt file to .mp3 base name
  const mp3 = files.find(f => f.toLowerCase().endsWith('.mp3'));
  let txtFile = null;
  if (mp3) {
    const base = path.parse(mp3).name;
    txtFile = files.find(f => f === `${base}.txt`);
  }
  // If no match, just use the first .txt file
  if (!txtFile) {
    txtFile = files.find(f => f.toLowerCase().endsWith('.txt'));
  }

  // Normalize folder name for lookup
  const folderNormalized = normalizeName(folder.replace(/^[0-9]+_/, ''));
  const heading = momentHeadings[folderNormalized] || folder;

  if (txtFile) {
    const txtPath = path.join(folderPath, txtFile);
    const content = fs.readFileSync(txtPath, 'utf8');
    mergedText += `=== ${heading} ===\n\n${content}\n\n`;
    console.log(`Merged: ${txtPath} under heading "${heading}"`);
  } else {
    console.warn(`No .txt file found in ${folderPath}`);
  }
});

fs.writeFileSync(outputTxt, mergedText.trim());
console.log(`Merged text saved as ${outputTxt}`);