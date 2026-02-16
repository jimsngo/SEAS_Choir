// buildAndMergePdfs.js
const fs = require('fs');
const path = require('path');
const { PDFDocument, rgb } = require('pdf-lib');
const https = require('https');
const http = require('http');

const PROJECT_ROOT = path.resolve(__dirname, '../../');
const OUTPUT_FILE = path.resolve(PROJECT_ROOT, 'output/music.pdf');
const MOMENTS_PATH = path.resolve(PROJECT_ROOT, 'config/moments.json');
const MASS_INFO_PATH = path.resolve(PROJECT_ROOT, 'config/mass_info.json');

async function mergePdfs() {
    console.log('🚀 Starting Music PDF Generation...');

    if (!fs.existsSync(MOMENTS_PATH)) {
        console.error('❌ moments.json not found!');
        return;
    }
    const moments = JSON.parse(fs.readFileSync(MOMENTS_PATH, 'utf8'));
    const massInfo = fs.existsSync(MASS_INFO_PATH) ? JSON.parse(fs.readFileSync(MASS_INFO_PATH, 'utf8')) : {};

    const validMoments = moments.filter(m => typeof m.pdf === 'string' && m.pdf.length > 0);

    if (validMoments.length === 0) {
        console.log('⚠️ No PDF files found in moments.json.');
        return;
    }

    const mergedPdf = await PDFDocument.create();
    const pageSectionMap = [];

    for (const section of validMoments) {
        const url = section.pdf;

        // --- THE SAFETY GUARD ---
        // If the path doesn't end in .pdf, skip it to avoid "No PDF Header" crashes
        if (!url.toLowerCase().endsWith('.pdf')) {
            console.warn(`⚠️ Skipping ${section.moment}: "${path.basename(url)}" is not a PDF file.`);
            continue;
        }

        let pdfBytes;
        if (url.startsWith('http')) {
            pdfBytes = await downloadPdf(url);
        } else {
            const absolutePath = path.resolve(PROJECT_ROOT, url);
            if (fs.existsSync(absolutePath)) {
                pdfBytes = fs.readFileSync(absolutePath);
                console.log(`📖 Loaded: ${section.moment} (${path.basename(url)})`);
            } else {
                console.error(`❌ File not found for ${section.moment}: ${absolutePath}`);
                continue;
            }
        }

        try {
            if (pdfBytes) {
                const pdf = await PDFDocument.load(pdfBytes);
                const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
                copiedPages.forEach(page => {
                    mergedPdf.addPage(page);
                    pageSectionMap.push(section);
                });
            }
        } catch (err) {
            console.error(`🚨 Error processing PDF for ${section.moment}:`, err);
        }
    }

    // Add Headers and Footers logic (same as before)
    const numPages = mergedPdf.getPageCount();
    if (numPages === 0) {
        console.error("❌ No pages were added to the merged PDF.");
        return;
    }

    const font = await mergedPdf.embedFont('Helvetica');
    for (let i = 0; i < numPages; i++) {
        const page = mergedPdf.getPage(i);
        const { width, height } = page.getSize();
        const section = pageSectionMap[i];

        let headerParts = [];
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
                font
            });
        }

        const footerText = `${section.moment} | Page ${i + 1} of ${numPages}`;
        const footerWidth = font.widthOfTextAtSize(footerText, 10);
        page.drawText(footerText, {
            x: (width - footerWidth) / 2,
            y: 25,
            size: 10,
            font
        });
    }

    const mergedPdfBytes = await mergedPdf.save();
    if (!fs.existsSync(path.dirname(OUTPUT_FILE))) fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
    fs.writeFileSync(OUTPUT_FILE, mergedPdfBytes);
    console.log(`\n✅ Successfully merged into: ${OUTPUT_FILE}`);
}

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
        }).on('error', reject);
    });
}

mergePdfs().catch(err => {
    console.error('Fatal Error:', err);
    process.exit(1);
});