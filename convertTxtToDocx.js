// convertTxtToDocx.js
// Usage: node convertTxtToDocx.js input.txt output.docx
// Converts a lyrics .txt file to a .docx file with basic formatting similar to your sample PDF.

const fs = require('fs');
const path = require('path');
const { Document, Packer, Paragraph, TextRun } = require('docx');

if (process.argv.length < 4) {
  console.log('Usage: node convertTxtToDocx.js input.txt output.docx');
  process.exit(1);
}

const inputPath = process.argv[2];
const outputPath = process.argv[3];

const fileContent = fs.readFileSync(inputPath, 'utf8');
const lines = fileContent.split(/\r\n|\n|\r/).map(l => l.trim());


const children = [];

// Formatting rules:
// - Line 1: Title (bold, larger)
// - Line 2: Author (italic)
// - Section headers: [ ... ] (bold, blue)
// - Lyrics: normal

if (lines[0]) {
  children.push(new Paragraph({
    children: [new TextRun({ text: lines[0], bold: true, size: 36 })],
    spacing: { after: 200 },
    alignment: 'center',
  }));
}
if (lines[1]) {
  children.push(new Paragraph({
    children: [new TextRun({ text: lines[1], italics: true, size: 24 })],
    spacing: { after: 200 },
    alignment: 'center',
  }));
}

for (let i = 2; i < lines.length; i++) {
  const line = lines[i];
  if (!line) {
    children.push(new Paragraph(''));
    continue;
  }
  if (/^\[.*\]$/.test(line)) {
    // Section header
    children.push(new Paragraph({
      children: [new TextRun({ text: line, bold: true, color: '1F4E79', size: 28 })],
      spacing: { after: 100 },
      alignment: 'left',
    }));
  } else {
    // Lyric line
    children.push(new Paragraph({
      children: [new TextRun({ text: line, size: 24 })],
      spacing: { after: 100 },
      alignment: 'left',
    }));
  }
}


const doc = new Document({
  sections: [
    { children }
  ]
});

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync(outputPath, buffer);
  console.log(`Created ${outputPath}`);
});
