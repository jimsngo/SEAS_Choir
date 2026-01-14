// buildAndMergeTxtToPdf.js (Clean version)
// Generates lyrics.pdf with clear block structure: header (title, author) and sections (tag name + content after author)

// Only import modules once
const fs = require('fs');
const path = require('path');
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');

const outputPdfPath = path.join(__dirname, '../../output/lyrics.pdf');
const momentsPath = path.join(__dirname, '../../config/moments.json');
const massInfoPath = path.join(__dirname, '../../config/mass_info.json');

function parseSongTxt(txtPath) {
  if (!fs.existsSync(txtPath)) return null;
  const lines = fs.readFileSync(txtPath, 'utf8').split(/\r?\n/);
  let title = '';
  let author = '';
  let sections = [];
  let currentTag = null;
  let buffer = [];
  let afterAuthor = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const tagMatch = line.match(/^\[(.+?)\]$/);
    if (tagMatch) {
      // Save previous section if after author
      if (afterAuthor && currentTag && buffer.length) {
        sections.push({ tag: currentTag, content: buffer.join(' ') });
      }
      currentTag = tagMatch[1];
      buffer = [];
      if (currentTag.toLowerCase() === 'title') {
        afterAuthor = false;
      } else if (currentTag.toLowerCase() === 'author') {
        afterAuthor = false;
      } else if (afterAuthor === false && currentTag.toLowerCase() !== 'title' && currentTag.toLowerCase() !== 'author') {
        afterAuthor = true;
      }
      continue;
    }
    if (currentTag) {
      if (currentTag.toLowerCase() === 'title') {
        if (line) title = line;
      } else if (currentTag.toLowerCase() === 'author') {
        if (line) author = line;
      } else if (afterAuthor) {
        buffer.push(line);
      }
    }
  }
  // Save last section
  if (afterAuthor && currentTag && buffer.length) {
    sections.push({ tag: currentTag, content: buffer.join(' ') });
  }
  return { title, author, sections };
}

async function generateLyricsPdf() {
  if (!fs.existsSync(momentsPath)) {
    console.error('moments.json not found:', momentsPath);
    return;
  }
  const moments = JSON.parse(fs.readFileSync(momentsPath, 'utf8'));
  const massInfo = fs.existsSync(massInfoPath) ? JSON.parse(fs.readFileSync(massInfoPath, 'utf8')) : {};
  const massTitle = massInfo.mass_name || '';
  const massDate = massInfo.date || '';

  const pdfDoc = await PDFDocument.create();
  let font, fontBold, fontItalic;
  // Use Helvetica by default (more reliable across systems)
  font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  fontItalic = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
  const fontSize = 12;
  const headingSize = 14;
  const titleSize = 16;
  const authorSize = 12;
  const marginTop = 36;
  const pageWidth = 612;
  const pageHeight = 792;

  // Layout plan: columns and moments
  const layout = [
    // Page 1
    { page: 0, col: 0, moments: ["Entrance", "Responsorial Psalm"] },
    { page: 0, col: 1, moments: ["Gospel Acclamation", "Offertory"] },
    // Page 2
    { page: 1, col: 0, moments: ["Communion Antiphon", "Communion"] },
    { page: 1, col: 1, moments: ["Meditation"] },
    // Page 3
    { page: 2, col: 0, moments: ["Recessional"] }
  ];

  // Page and column setup
  const pages = [pdfDoc.addPage([pageWidth, pageHeight])];
  while (pages.length < 3) pages.push(pdfDoc.addPage([pageWidth, pageHeight]));
  const columnGap = 24;
  const columnWidth = (pageWidth - 72 - columnGap) / 2;
  const lineHeight = fontSize * 1.2;
  const blockSpacing = lineHeight * 1.5;

  // Draw mass title/date at top of every page
  for (let i = 0; i < pages.length; i++) {
    pages[i].drawText(`${massTitle} - ${massDate}`, {
      x: pageWidth / 2 - fontBold.widthOfTextAtSize(`${massTitle} - ${massDate}`, headingSize) / 2,
      y: pageHeight - marginTop,
      size: headingSize,
      font: fontBold,
      color: rgb(0, 0, 0),
    });
  }

  // Helper for word wrap
  function drawWrappedText(page, text, x, y, font, size, color, maxWidth) {
    let words = text.split(' ');
    let currentLine = '';
    for (let w = 0; w < words.length; w++) {
      let testLine = currentLine ? currentLine + ' ' + words[w] : words[w];
      let testWidth = font.widthOfTextAtSize(testLine, size);
      if (testWidth > maxWidth && currentLine) {
        page.drawText(currentLine, { x, y, size, font, color });
        y -= size * 1.2;
        currentLine = words[w];
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) {
      page.drawText(currentLine, { x, y, size, font, color });
      y -= size * 1.2;
    }
    return y;
  }

  // Draw each block in layout
  for (const block of layout) {
    const pageObj = pages[block.page];
    let x = block.col === 0 ? 36 : 36 + columnWidth + columnGap;
    let y = pageHeight - marginTop - headingSize - 12;
    for (const momentName of block.moments) {
      const moment = moments.find(m => m.moment === momentName);
      if (!moment || !moment.txt) continue;
      // Use cleaned file if available
      let cleanedPath = moment.txt.replace('.txt', '_cleaned.txt');
      let song;
      if (fs.existsSync(cleanedPath)) {
        song = parseSongTxt(cleanedPath);
      } else {
        song = parseSongTxt(moment.txt);
      }
      if (!song) continue;

      // Moment name with singer right next to it
      let displayText = momentName;
      if (moment.singer) {
        displayText = `${momentName} (${moment.singer})`;
      }
      const momentTextWidth = fontBold.widthOfTextAtSize(displayText, fontSize + 2);
      pageObj.drawText(displayText, {
        x: x + (columnWidth - momentTextWidth) / 2,
        y: y,
        size: fontSize + 2,
        font: fontBold,
        color: rgb(0, 0, 0),
      });
      y -= lineHeight * 1.0;
      // Horizontal line
      pageObj.drawLine({
        start: { x: x, y: y + 2 },
        end: { x: x + columnWidth, y: y + 2 },
        thickness: 1,
        color: rgb(0.7, 0.7, 0.7),
      });
      y -= lineHeight * 0.7;
      y -= lineHeight * 0.8; // Extra space after header

      // Title (bold)
      if (song.title) {
        y = drawWrappedText(pageObj, song.title, x, y, fontBold, fontSize + 1, rgb(0, 0, 0), columnWidth);
      }
      // Author (italic/lighter)
      if (song.author) {
        y = drawWrappedText(pageObj, song.author, x, y, fontItalic, fontSize - 1, rgb(0.3, 0.3, 0.3), columnWidth);
        y -= lineHeight * 0.8; // Extra space after author
      }

      // Lyrics sections
      for (const section of song.sections) {
        // Section header (blue, bold)
        y = drawWrappedText(pageObj, section.tag.replace(/_/g, ' '), x, y, fontBold, fontSize, rgb(0, 0, 0.7), columnWidth);
        // Section content (normal)
        y = drawWrappedText(pageObj, section.content, x, y, font, fontSize, rgb(0, 0, 0), columnWidth);
      }
      y -= blockSpacing;
    }
  }
  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync(outputPdfPath, pdfBytes);
  console.log('Generated PDF:', outputPdfPath);
}

generateLyricsPdf();

