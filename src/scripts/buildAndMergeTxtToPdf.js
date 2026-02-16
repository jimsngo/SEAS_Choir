// buildAndMergeTxtToPdf.js
const fs = require('fs');
const path = require('path');
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');

// Define project paths
const PROJECT_ROOT = path.resolve(__dirname, '../../');
const OUTPUT_FILE = path.resolve(PROJECT_ROOT, 'output/lyrics.pdf');
const MOMENTS_PATH = path.resolve(PROJECT_ROOT, 'config/moments.json');
const MASS_INFO_PATH = path.resolve(PROJECT_ROOT, 'config/mass_info.json');

/**
 * Parses the song text file and sanitizes hidden characters
 */
function parseSongTxt(txtPath) {
    const absolutePath = path.resolve(PROJECT_ROOT, txtPath);
    if (!fs.existsSync(absolutePath)) return null;

    // Read the file and strip hidden control characters (like 0x000d / \r)
    // This prevents the "Ansi cannot encode" crash in pdf-lib
    const rawContent = fs.readFileSync(absolutePath, 'utf8');
    const cleanContent = rawContent.replace(/[\u0000-\u0008\u000B-\u001F\u007F-\u009F]/g, "");
    
    const lines = cleanContent.split(/\n/);
    let title = '';
    let author = '';
    let sections = [];
    let currentTag = null;
    let buffer = [];
    let afterAuthor = false;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line && !currentTag) continue;

        const tagMatch = line.match(/^\[(.+?)\]$/);
        if (tagMatch) {
            if (afterAuthor && currentTag && buffer.length) {
                sections.push({ tag: currentTag, content: buffer.join(' ') });
            }
            currentTag = tagMatch[1];
            buffer = [];

            const lowerTag = currentTag.toLowerCase();
            if (lowerTag === 'title' || lowerTag === 'author') {
                afterAuthor = false;
            } else {
                afterAuthor = true;
            }
            continue;
        }

        if (currentTag) {
            const lowerTag = currentTag.toLowerCase();
            if (lowerTag === 'title') {
                if (line) title = line;
            } else if (lowerTag === 'author') {
                if (line) author = line;
            } else if (afterAuthor) {
                buffer.push(line);
            }
        }
    }

    if (afterAuthor && currentTag && buffer.length) {
        sections.push({ tag: currentTag, content: buffer.join(' ') });
    }
    return { title, author, sections };
}

async function generateLyricsPdf() {
    console.log('🚀 Starting Lyrics PDF Generation...');
    
    if (!fs.existsSync(MOMENTS_PATH)) {
        console.error('❌ moments.json not found!');
        return;
    }

    const moments = JSON.parse(fs.readFileSync(MOMENTS_PATH, 'utf8'));
    const massInfo = fs.existsSync(MASS_INFO_PATH) ? JSON.parse(fs.readFileSync(MASS_INFO_PATH, 'utf8')) : {};
    const massHeader = `${massInfo.mass_name || ''} - ${massInfo.date || ''}`;

    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontItalic = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

    const fontSize = 11;
    const headingSize = 14;
    const pageWidth = 612;
    const pageHeight = 792;
    const marginTop = 40;

    // Layout setup
    const layout = [
        { page: 0, col: 0, moments: ["Entrance", "Responsorial_Psalm"] },
        { page: 0, col: 1, moments: ["Gospel_Acclamation", "Offertory"] },
        { page: 1, col: 0, moments: ["Communion Antiphon", "Communion"] },
        { page: 1, col: 1, moments: ["Meditation"] },
        { page: 2, col: 0, moments: ["Recessional"] }
    ];

    const pages = [
        pdfDoc.addPage([pageWidth, pageHeight]), 
        pdfDoc.addPage([pageWidth, pageHeight]), 
        pdfDoc.addPage([pageWidth, pageHeight])
    ];

    const columnGap = 30;
    const columnWidth = (pageWidth - 72 - columnGap) / 2;

    pages.forEach(p => {
        p.drawText(massHeader, {
            x: pageWidth / 2 - fontBold.widthOfTextAtSize(massHeader, headingSize) / 2,
            y: pageHeight - marginTop,
            size: headingSize,
            font: fontBold
        });
    });

    function drawWrappedText(page, text, x, y, font, size, color, maxWidth) {
        let words = text.split(' ');
        let currentLine = '';
        for (let w = 0; w < words.length; w++) {
            let testLine = currentLine ? currentLine + ' ' + words[w] : words[w];
            if (font.widthOfTextAtSize(testLine, size) > maxWidth && currentLine) {
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

    for (const block of layout) {
        const pageObj = pages[block.page];
        let x = block.col === 0 ? 36 : 36 + columnWidth + columnGap;
        let y = pageHeight - marginTop - 30;

        for (const momentName of block.moments) {
            const moment = moments.find(m => m.moment === momentName);
            
            if (!moment || !moment.txt) continue;

            // Safety check for file extension
            if (!moment.txt.toLowerCase().endsWith('.txt')) {
                console.warn(`⚠️ Skipping ${momentName}: "${path.basename(moment.txt)}" is not a .txt file.`);
                continue;
            }

            const song = parseSongTxt(moment.txt);
            if (!song) continue;

            const label = moment.singer ? `${momentName} (${moment.singer})` : momentName;
            pageObj.drawText(label, { x, y, size: fontSize + 1, font: fontBold });
            y -= 4;
            pageObj.drawLine({ start: { x, y }, end: { x: x + columnWidth, y }, thickness: 0.5, color: rgb(0.5, 0.5, 0.5) });
            y -= 15;

            if (song.title) y = drawWrappedText(pageObj, song.title, x, y, fontBold, fontSize, rgb(0, 0, 0), columnWidth);
            if (song.author) y = drawWrappedText(pageObj, song.author, x, y, fontItalic, fontSize - 1, rgb(0.3, 0.3, 0.3), columnWidth);
            y -= 5;

            for (const section of song.sections) {
                y = drawWrappedText(pageObj, section.tag, x, y, fontBold, fontSize - 1, rgb(0, 0, 0.6), columnWidth);
                y = drawWrappedText(pageObj, section.content, x, y, font, fontSize, rgb(0, 0, 0), columnWidth);
                y -= 8;
            }
            y -= 20; 
        }
    }

    const pdfBytes = await pdfDoc.save();
    if (!fs.existsSync(path.dirname(OUTPUT_FILE))) fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
    fs.writeFileSync(OUTPUT_FILE, pdfBytes);
    console.log(`✅ Lyrics PDF Generated at: ${OUTPUT_FILE}`);
}

generateLyricsPdf().catch(err => {
    console.error("🚨 Fatal PDF Error:", err);
});