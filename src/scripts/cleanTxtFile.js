// cleanTxtFile.js
// Usage: node cleanTxtFile.js <input.txt> <output.txt>
// Cleans a lyrics .txt file: removes hidden/invisible Unicode, normalizes whitespace, line endings, and tags.

const fs = require('fs');
const path = require('path');

function cleanText(raw) {
  // Remove BOM, zero-width, non-breaking, and other invisible Unicode chars
  let cleaned = raw.replace(/\uFEFF|\u200B|\u200C|\u200D|\u00A0|\u2028|\u2029/g, '');
  // Normalize all line endings to LF
  cleaned = cleaned.replace(/\r\n|\r/g, '\n');
  // Remove trailing spaces and tabs
  cleaned = cleaned.replace(/[ \t]+$/gm, '');
  // Ensure tags are on their own lines
  cleaned = cleaned.replace(/(\[[^\]]+\])([^\n])/g, '$1\n$2');
  // Remove extra blank lines
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  // Remove or replace all non-ASCII characters
  cleaned = cleaned.replace(/[^\x00-\x7F]/g, '');
  // Trim leading/trailing whitespace
  cleaned = cleaned.trim();
  return cleaned;
}

module.exports = { cleanText };

if (require.main === module) {
  const [,, inputPath, outputPath] = process.argv;
  if (!inputPath || !outputPath) {
    console.error('Usage: node cleanTxtFile.js <input.txt> <output.txt>');
    process.exit(1);
  }
  const raw = fs.readFileSync(inputPath, 'utf8');
  const cleaned = cleanText(raw);
  fs.writeFileSync(outputPath, cleaned, { encoding: 'utf8' });
  console.log(`Cleaned file written to ${outputPath}`);
}
