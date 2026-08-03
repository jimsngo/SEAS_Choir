const fs = require('fs');
const path = require('path');
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');

// ==========================================
//        PATH CONTROL PANEL
// ==========================================
const ROOT_DIR       = path.join(__dirname, '..', '..');
const CONFIG_DIR     = path.join(ROOT_DIR, 'config');
const OUTPUT_DIR     = path.join(ROOT_DIR, 'output');
const MOMENTS_PATH   = path.join(CONFIG_DIR, 'moments.json');
const MASS_INFO_PATH = path.join(CONFIG_DIR, 'mass_info.json');
const OUTPUT_FILE    = path.join(OUTPUT_DIR, 'lyrics.pdf');
// ==========================================

function parseSongTxt(txtPath) {
    const absolutePath = path.resolve(ROOT_DIR, txtPath);
    if (!fs.existsSync(absolutePath)) return null;
    const rawContent = fs.readFileSync(absolutePath, 'utf8');
    const cleanContent = rawContent.replace(/[\u0000-\u0008\u000B-\u001F\u007F-\u009F]/g, "");
    const lines = cleanContent.split(/\n/);
    let title = '', author = '', sections = [], currentTag = null, buffer = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const tagMatch = line.match(/^\[(.+?)\]$/);
        if (tagMatch) {
            if (currentTag && buffer.length > 0) {
                // FIX: Join with an explicit space, and clean up any accidental double spaces!
                const mergedText = buffer.join(' ').replace(/\s+/g, ' ').trim();
                sections.push({ tag: currentTag, content: mergedText });
            }
            const tagName = tagMatch[1].toUpperCase();
            if (tagName === 'TITLE') { title = lines[i + 1]?.trim() || ''; i++; }
            else if (tagName === 'AUTHOR') { author = lines[i + 1]?.trim() || ''; i++; }
            else { currentTag = tagMatch[1]; buffer = []; }
        } else if (currentTag) {
            buffer.push(line);
        }
    }
    if (currentTag && buffer.length > 0) {
        // FIX: Ensure the final section also joins with a space properly
        const mergedText = buffer.join(' ').replace(/\s+/g, ' ').trim();
        sections.push({ tag: currentTag, content: mergedText });
    }
    return { title, author, sections };
}

function drawWrappedText(page, text, x, y, font, size, color, maxWidth) {
    const lines = text.split('\n');
    for (const rawLine of lines) {
        const words = rawLine.split(' ');
        let currentLine = '';
        for (const word of words) {
            const testLine = currentLine ? `${currentLine} ${word}` : word;
            const width = font.widthOfTextAtSize(testLine, size);
            if (width > maxWidth && currentLine !== '') {
                page.drawText(currentLine, { x, y, size, font, color });
                y -= size + 2;
                currentLine = word;
            } else { currentLine = testLine; }
        }
        page.drawText(currentLine, { x, y, size, font, color });
        y -= size + 2;
    }
    return y;
}

async function createLyricsPdf() {
    console.log('-----------------------------------------');
    console.log('📄 GENERATING LYRICS PDF (COLUMN-BY-COLUMN FLOW)');
    console.log('-----------------------------------------');

    if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    const moments = JSON.parse(fs.readFileSync(MOMENTS_PATH, 'utf8'));
    const massInfo = fs.existsSync(MASS_INFO_PATH) ? JSON.parse(fs.readFileSync(MASS_INFO_PATH, 'utf8')) : {};

    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontItalic = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

    const fontSize = 10;
    const margin = 50;
    const columnGap = 40;
    
    let page = pdfDoc.addPage([612, 792]);
    const { width, height } = page.getSize();
    const columnWidth = (width - (margin * 2) - columnGap) / 2;

    let x = margin;
    let y = height - margin;
    let columnCount = 0; 

    page.drawText(massInfo.mass_name || "Mass Lyrics", { x, y, size: 16, font: fontBold });
    y -= 20;
    if (massInfo.date) { page.drawText(massInfo.date, { x, y, size: 12, font }); y -= 30; }

    for (const moment of moments) {
        if (!moment.txt || !moment.txt.toLowerCase().endsWith('.txt')) {
            continue;
        }

        const song = parseSongTxt(moment.txt);
        if (!song) {
            continue;
        }

        // --- DYNAMIC BLOCK ELEVATION HEIGHT ESTIMATION ---
        let estimatedLines = 3;
        for (const section of song.sections) {
            const words = section.content.split(' ');
            let currentLine = '';
            let wrappedLines = 1;
            
            for (const word of words) {
                const testLine = currentLine ? `${currentLine} ${word}` : word;
                if (font.widthOfTextAtSize(testLine, fontSize) > columnWidth && currentLine !== '') {
                    wrappedLines++;
                    currentLine = word;
                } else { 
                    currentLine = testLine; 
                }
            }
            estimatedLines += 1 + wrappedLines;
        }
        
        const estimatedHeightNeeded = (estimatedLines * (fontSize + 2)) + 40;

        // --- BLOCK OVERFLOW ROUTING INTERCEPTOR ---
        if (y - estimatedHeightNeeded < margin) {
            if (columnCount === 0) {
                x = margin + columnWidth + columnGap;
                y = height - margin;
                columnCount = 1;
                console.log(`   ↳ Moving entire song [${moment.moment}] to Right Column`);
            } else {
                page = pdfDoc.addPage([612, 792]);
                x = margin;
                y = height - margin;
                columnCount = 0;
                console.log(`   ↳ Columns full. Spawning fresh page for [${moment.moment}]`);
            }
        }

        // --- RENDERING PRODUCTION ---
        const momentName = moment.moment.replace(/_/g, ' ');
        console.log(`📝 Processing Layout: ${momentName}`);
        const label = moment.singer ? `${momentName} (${moment.singer})` : momentName;
        
        page.drawText(label, { x, y, size: fontSize + 1, font: fontBold, color: rgb(0, 0, 0.5) });
        y -= 15;

        if (song.title) y = drawWrappedText(page, song.title, x, y, fontBold, fontSize, rgb(0, 0, 0), columnWidth);
        if (song.author) y = drawWrappedText(page, song.author, x, y, fontItalic, fontSize - 1, rgb(0.3, 0.3, 0.3), columnWidth);
        y -= 5;

        for (const section of song.sections) {
            y = drawWrappedText(page, section.tag.toUpperCase(), x, y, fontBold, fontSize - 2, rgb(0.4, 0.4, 0.4), columnWidth);
            y = drawWrappedText(page, section.content, x, y, font, fontSize, rgb(0, 0, 0), columnWidth);
            y -= 8;
        }
        
        y -= 20; 
    }

    fs.writeFileSync(OUTPUT_FILE, await pdfDoc.save());
    console.log(`\n✅ Dynamic Flow Lyrics PDF Created: ${OUTPUT_FILE}`);
}

createLyricsPdf().catch(err => console.error(err));