
// buildAndMergeTxtToPdf.js
//
// Script to generate a printable PDF (lyrics.pdf) from all lyrics .txt files referenced in moments.json.
//
// For each section in moments.json, the script:
//   - Fetches the external_text field (local path or URL to .txt lyrics)
//   - Uses metadata (title, author, snippet) directly from moments.json
//   - Lays out lyrics in a two-column, multi-page PDF with print-safe margins
//   - Adds mass name and date (from mass_info.json) as a header on each page
//   - Formats each moment with section headers, titles, authors, and lyrics
//
// Output: lyrics.pdf in the project root
//
// Usage:
//   node buildAndMergeTxtToPdf.js
//
// Notes:
// - Requires pdf-lib and node-fetch (npm install pdf-lib node-fetch)
// - Expects moments_songs.json and mass_info.json in the project root
// - Handles both local and remote (http/https) .txt sources
// - Skips missing/unreadable lyrics with a warning
// - Only updates lyrics.pdf if generation is successful

const fs = require('fs');
const path = require('path');
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');



const outputPdfPath = path.join(__dirname, '../lyrics.pdf');
const momentsPath = path.join(__dirname, 'moments.json');
const massInfoPath = path.join(__dirname, '../mass_info.json');

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));


// Helper to extract metadata from a .txt file
function extractMetaFromTxt(txtPath) {
  if (!fs.existsSync(txtPath)) return { title: '', author: '', snippet: '', lines: [] };
  const lines = fs.readFileSync(txtPath, 'utf8').split(/\r?\n/);
  let meta = { title: '', author: '', snippet: '', lines: [] };
  let currentSection = null;
  let buffer = [];
  let foundTitle = false, foundAuthor = false;
  let snippetSections = {};
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const sectionMatch = line.match(/^\[(.+?)\]$/);
    if (sectionMatch) {
      if (currentSection && buffer.length) {
        const content = buffer.join(' ').trim();
        if (currentSection === 'Title' && !foundTitle) {
          meta.title = content;
          foundTitle = true;
        } else if (currentSection === 'Author' && !foundAuthor) {
          meta.author = content;
          foundAuthor = true;
        } else if (["Response","Refrain","Acclamation","Verse 1","Verse"].includes(currentSection)) {
          snippetSections[currentSection] = content;
        }
      }
      currentSection = sectionMatch[1];
      buffer = [];
    } else if (currentSection) {
      buffer.push(line);
    }
  }
  if (currentSection && buffer.length) {
    const content = buffer.join(' ').trim();
    if (currentSection === 'Title' && !foundTitle) {
      meta.title = content;
    } else if (currentSection === 'Author' && !foundAuthor) {
      meta.author = content;
    } else if (["Response","Refrain","Acclamation","Verse 1","Verse"].includes(currentSection)) {
      snippetSections[currentSection] = content;
    }
  }
  meta.snippet = snippetSections['Response'] || snippetSections['Refrain'] || snippetSections['Acclamation'] || snippetSections['Verse 1'] || snippetSections['Verse'] || '';
  meta.lines = lines;
  return meta;
}

async function fetchTxt(link) {
  // If link is a web URL, fetch; else, read local file
  if (typeof link !== 'string') return '';
  if (link.startsWith('http://') || link.startsWith('https://')) {
    try {
      const res = await fetch(link);
      if (!res.ok) throw new Error(`Failed to fetch ${link}: ${res.status}`);
      return await res.text();
    } catch (err) {
      console.error('Error fetching', link, err);
      return '';
    }
  } else {
    // Local file path
    try {
      return fs.readFileSync(link, 'utf8');
    } catch (err) {
      console.error('Error reading local file', link, err);
      return '';
    }
  }
}

async function mergeTxtToPdf() {

  // Read moments.json and mass_info.json
  if (!fs.existsSync(momentsPath)) {
    console.error('moments.json not found:', momentsPath);
    return;
  }
  const moments = JSON.parse(fs.readFileSync(momentsPath, 'utf8'));
  const massInfo = fs.existsSync(massInfoPath) ? JSON.parse(fs.readFileSync(massInfoPath, 'utf8')) : {};
  const massTitle = massInfo.mass_name || '';
  const massDate = massInfo.date || '';

  const pdfDoc = await PDFDocument.create();
  let font, fontBold;
  try {
    font = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    fontBold = await pdfDoc.embedFont(StandardFonts.TimesBold);
  } catch (e) {
    console.warn('Times font not available, falling back to Helvetica.');
    font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  }
  const fontSize = 12;
  const headingSize = 14;
  const titleSize = 11;
  const authorSize = 10;
  const massTitleSize = 18;
  const marginTop = 36; // 0.5 inch
  const marginBottom = 36; // 0.5 inch
  const pageWidth = 612; // 8.5 inch
  const pageHeight = 792; // 11 inch

  let page = pdfDoc.addPage([pageWidth, pageHeight]);
  const lineHeight = fontSize * 1.2;
  const columnGap = 24; // gap between columns
  const columnWidth = (pageWidth - 72 - columnGap) / 2; // two columns, 0.5 inch margins, gap
  let col = 0; // 0 = left, 1 = right
  let y = pageHeight - marginTop;
  let x = 36;

  // (Removed: header draw on initial page object. Header will be drawn in the loop below.)

  col = 0;
  x = 72;
  y = pageHeight - marginTop - 36; // leave space for title

  // Helper to estimate block height
  function estimateBlockHeight(section, lyricsLines) {
    let h = lineHeight * 1.5; // heading
    if (section.title) h += lineHeight;
    if (section.author) h += lineHeight;
    h += lyricsLines.length * lineHeight;
    h += lineHeight * 1.5; // space after block
    return h;
  }


  // Forced layout assignment
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

  // Create enough pages
  const pages = [page];
  while (pages.length < 3) pages.push(pdfDoc.addPage([pageWidth, pageHeight]));

  // Draw mass title/date at top of every page
  for (let i = 0; i < pages.length; i++) {
    pages[i].drawText(`${massTitle} - ${massDate}`, {
      x: pageWidth / 2 - font.widthOfTextAtSize(`${massTitle} - ${massDate}`, massTitleSize) / 2,
      y: pageHeight - 36,
      size: massTitleSize,
      font,
      color: rgb(0, 0, 0),
    });
  }


  for (const block of layout) {
    const pageObj = pages[block.page];
    let x = block.col === 0 ? 36 : 36 + columnWidth + columnGap;
    // Start immediately below the header (minimize gap)
    let y = pageHeight - 36 - massTitleSize - 6;

    for (const momentName of block.moments) {
      const moment = moments.find(s => s.moment === momentName);
      if (!moment || !moment.txt) continue;
      // Fetch lyrics from txt
      let lyricsText = '';
      if (moment.txt.startsWith('http://') || moment.txt.startsWith('https://')) {
        try {
          const res = await fetch(moment.txt);
          if (res.ok) {
            lyricsText = await res.text();
          } else {
            console.error('Failed to fetch', moment.txt, res.status);
            continue;
          }
        } catch (err) {
          console.error('Error fetching', moment.txt, err);
          continue;
        }
      } else {
        // Local file path
        try {
          lyricsText = fs.readFileSync(moment.txt, 'utf8');
        } catch (err) {
          console.error('Error reading local file', moment.txt, err);
          continue;
        }
      }
      const lines = lyricsText.split(/\r?\n/);
      const heading = moment.moment || '';
      const title = moment.title || '';
      const author = moment.author || '';


      // Draw block: moment name (centered and bold)
      const headingFont = fontBold;
      const headingTextWidth = headingFont.widthOfTextAtSize(heading, headingSize);
      const columnW = columnWidth;
      const headingX = x + (columnW - headingTextWidth) / 2;
      pageObj.drawText(heading, {
        x: headingX,
        y,
        size: headingSize,
        font: headingFont,
        color: rgb(0, 0, 0),
      });
      y -= lineHeight * 1.2;

      // Draw horizontal line between moment and title
      const lineY = y + lineHeight * 0.3;
      pageObj.drawLine({
        start: { x: x, y: lineY },
        end: { x: x + columnWidth, y: lineY },
        thickness: 1,
        color: rgb(0.7, 0.7, 0.7),
      });
      y -= lineHeight * 1.2;
      // Title (bold, left-aligned, smaller than moment, bigger than author)
      if (title && title !== heading) {
        const titleFont = fontBold;
        const titleFontSize = 13; // smaller than headingSize, bigger than author
        pageObj.drawText(title, {
          x: x,
          y,
          size: titleFontSize,
          font: titleFont,
          color: rgb(0, 0, 0),
        });
        y -= lineHeight * 0.9;
      }
      // Author (unbold, left-aligned, same size as lyrics, gray)
      if (author && author !== heading && author !== title) {
        const authorFont = font;
        const authorFontSize = 10; // smaller than lyrics
        // Word wrap author text within column width
        let words = author.split(' ');
        let currentLine = '';
        for (let w = 0; w < words.length; w++) {
          let testLine = currentLine ? currentLine + ' ' + words[w] : words[w];
          let testWidth = authorFont.widthOfTextAtSize(testLine, authorFontSize);
          if (testWidth > columnWidth && currentLine) {
            pageObj.drawText(currentLine, {
              x: x,
              y,
              size: authorFontSize,
              font: authorFont,
              color: rgb(0.5, 0.5, 0.5),
              maxWidth: columnWidth,
            });
            y -= lineHeight * 0.9;
            currentLine = words[w];
          } else {
            currentLine = testLine;
          }
        }
        if (currentLine) {
          pageObj.drawText(currentLine, {
            x: x,
            y,
            size: authorFontSize,
            font: authorFont,
            color: rgb(0.5, 0.5, 0.5),
            maxWidth: columnWidth,
          });
          y -= lineHeight * 0.9;
        }
      }
      // Print lyrics, skipping [Title] and [Author] labels and lines matching title/author
      let startIdx = 0;
      for (let i = 0; i < lines.length; i++) {
        const l = lines[i].trim();
        if (l === '[Verse]' || l === '[Refrain]' || l === '[Response]' || l === '[Acclamation]' || l === '[Verse 1]') {
          startIdx = i;
          break;
        }
      }
      for (let i = startIdx; i < lines.length; i++) {
        const line = lines[i].trim();
        // Section header detection
        const sectionMatch = line.match(/^\[(.+?)\]$/);
        if (sectionMatch) {
          const sectionHeader = sectionMatch[1];
          // Draw section header, bold, left-aligned, same size as lyrics
          y -= lineHeight * 0.5;
          const sectionFontSize = fontSize;
          const sectionFont = fontBold;
          const sectionText = sectionHeader.replace(/_/g, ' ');
          pageObj.drawText(sectionText, {
            x: x,
            y,
            size: sectionFontSize,
            font: sectionFont,
            color: rgb(0, 0, 0.7),
          });
          y -= lineHeight * 1.1;
          continue;
        }
        // Skip [Title] and [Author] labels
        if (line === '[Title]' || line === '[Author]') continue;
        // Skip any line that matches the printed title or author
        if ((title && line === title.trim()) || (author && line === author.trim())) continue;
        // Word wrap: split line into chunks that fit column width
        let drawX = x;
        let drawColor = rgb(0, 0, 0);
        let drawWidth = columnWidth;
        let words = line.split(' ');
        let currentLine = '';
        for (let w = 0; w < words.length; w++) {
          let testLine = currentLine ? currentLine + ' ' + words[w] : words[w];
          let testWidth = font.widthOfTextAtSize(testLine, fontSize);
          if (testWidth > drawWidth && currentLine) {
            pageObj.drawText(currentLine, {
              x: drawX,
              y,
              size: fontSize,
              font,
              color: drawColor,
              maxWidth: drawWidth,
            });
            y -= lineHeight * 0.9;
            currentLine = words[w];
          } else {
            currentLine = testLine;
          }
        }
        if (currentLine) {
          pageObj.drawText(currentLine, {
            x: drawX,
            y,
            size: fontSize,
            font: font,
            color: drawColor,
            maxWidth: drawWidth,
          });
          y -= lineHeight * 0.9;
        }
      }
      y -= lineHeight;
    }
  }

  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync(outputPdfPath, pdfBytes);
  console.log('Generated PDF:', outputPdfPath);
}

mergeTxtToPdf();
