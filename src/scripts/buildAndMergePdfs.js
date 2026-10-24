// buildAndMergePdfs.js
const fs = require('fs');
const path = require('path');
const { PDFDocument, rgb } = require('pdf-lib');
const https = require('https');
const http = require('http');

// ==========================================
//        PATH CONTROL PANEL
// ==========================================
// This script lives in src/scripts/, so go UP twice to reach project root
const ROOT_DIR = path.join(__dirname, '..', '..');

const CONFIG_DIR     = path.join(ROOT_DIR, 'config');
const OUTPUT_DIR     = path.join(ROOT_DIR, 'output');
const MOMENTS_PATH   = path.join(CONFIG_DIR, 'moments.json');
const MASS_INFO_PATH = path.join(CONFIG_DIR, 'mass_info.json');
const OUTPUT_FILE    = path.join(OUTPUT_DIR, 'music.pdf');
// ==========================================

async function mergePdfs() {
    console.log('-----------------------------------------');
    console.log('🎼 GENERATING MUSIC PDF');
    console.log(`📂 Root: ${ROOT_DIR}`);
    console.log('-----------------------------------------');

    // 1. Ensure output directory exists
    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    // 2. Load Configuration Files
    if (!fs.existsSync(MOMENTS_PATH)) {
        console.error('❌ Error: moments.json not found at ' + MOMENTS_PATH);
        return;
    }
    
    const moments = JSON.parse(fs.readFileSync(MOMENTS_PATH, 'utf8'));
    const massInfo = fs.existsSync(MASS_INFO_PATH) ? JSON.parse(fs.readFileSync(MASS_INFO_PATH, 'utf8')) : {};

    // 3. Filter for valid PDF entries
    const validMoments = moments.filter(m => typeof m.pdf === 'string' && m.pdf.length > 0);

    if (validMoments.length === 0) {
        console.log('⚠️ No PDF files found in moments.json.');
        return;
    }

    const mergedPdf = await PDFDocument.create();
    const pageSectionMap = [];

    // 4. Processing Loop
    for (const section of validMoments) {
        const filePath = section.pdf;

        // Safety Guard: Only process PDF files
        if (!filePath.toLowerCase().endsWith('.pdf')) {
            console.warn(`⚠️ Skipping ${section.moment}: "${path.basename(filePath)}" is not a PDF.`);
            continue;
        }

        let pdfBytes;
        if (filePath.startsWith('http')) {
            console.log(`🌐 Downloading: ${section.moment}...`);
            pdfBytes = await downloadPdf(filePath);
        } else {
            // Build the absolute path from the root
            const absolutePath = path.join(ROOT_DIR, filePath);
            if (fs.existsSync(absolutePath)) {
                pdfBytes = fs.readFileSync(absolutePath);
                console.log(`📖 Loaded: ${section.moment} -> ${path.basename(filePath)}`);
            } else {
                console.error(`❌ File missing for ${section.moment}: ${absolutePath}`);
                continue;
            }
        }

        try {
            if (pdfBytes) {
                const pdf = await PDFDocument.load(pdfBytes);
                const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
                copiedPages.forEach(page => {
                    mergedPdf.addPage(page);
                    pageSectionMap.push(section); // Track which moment this page belongs to
                });
            }
        } catch (err) {
            console.error(`🚨 PDF Load Error (${section.moment}):`, err.message);
        }
    }

    // 5. Finalize PDF (Headers, Footers, Page Numbers)
    const numPages = mergedPdf.getPageCount();
    if (numPages === 0) {
        console.error("❌ No pages were added. PDF not saved.");
        return;
    }

    // Embed a standard font for headers/footers
    const font = await mergedPdf.embedFont('Helvetica-Bold');
    const pages = mergedPdf.getPages();

    for (let i = 0; i < numPages; i++) {
        const page = pages[i];
        const section = pageSectionMap[i];
        const { width, height } = page.getSize();

        // Build Header: [Mass Name] | [Date] | [Singer Name]
        const headerParts = [];
        if (massInfo.mass_name) headerParts.push(massInfo.mass_name);
        if (massInfo.date) headerParts.push(massInfo.date);
        if (section.singer) headerParts.push(section.singer);
        const headerText = headerParts.join(' | ');

        if (headerText) {
            const headerWidth = font.widthOfTextAtSize(headerText, 12);
            page.drawText(headerText, {
                x: (width - headerWidth) / 2,
                y: height - 30,
                size: 12,
                font,
                color: rgb(0, 0, 0)
            });
        }

        // Add Footer: [Moment Name] | Page X of Y
        const footerText = `${section.moment.replace(/_/g, ' ')} | Page ${i + 1} of ${numPages}`;
        const footerWidth = font.widthOfTextAtSize(footerText, 10);
        page.drawText(footerText, {
            x: (width - footerWidth) / 2,
            y: 25,
            size: 10,
            font,
            color: rgb(0.3, 0.3, 0.3)
        });
    }

    // 6. Save the final file
    const mergedPdfBytes = await mergedPdf.save();
    fs.writeFileSync(OUTPUT_FILE, mergedPdfBytes);
    console.log(`\n✅ Successfully merged into: ${OUTPUT_FILE}`);
}

// Helper function for web links
function downloadPdf(url) {
    return new Promise((resolve, reject) => {
        const client = url.startsWith('https') ? https : http;
        client.get(url, res => {
            if (res.statusCode !== 200) {
                reject(new Error(`Failed to download ${url}: ${res.statusCode}`));
                return;
            }
            const data = [];
            res.on('data', chunk => data.push(chunk));
            res.on('end', () => resolve(Buffer.concat(data)));
        }).on('error', err => reject(err));
    });
}

// Execute the merge
mergePdfs().catch(err => console.error('FATAL ERROR:', err));