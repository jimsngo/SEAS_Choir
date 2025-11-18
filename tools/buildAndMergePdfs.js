// buildAndMergePdfs.js
// Merges all PDFs in the ../pdfs/ directory into a single combined PDF

const fs = require('fs');
const path = require('path');
const { PDFDocument, rgb } = require('pdf-lib');


const PDFS_DIR = path.resolve(__dirname, '../pdfs');
const OUTPUT_FILE = path.resolve(__dirname, '../music.pdf');
const MOMENTS_PATH = path.resolve(__dirname, '../moments.json');
const MASS_INFO_PATH = path.resolve(__dirname, '../mass_info.json');
const os = require('os');
const https = require('https');
const http = require('http');


async function mergePdfs() {
	// Read moments.json and mass_info.json
	const moments = JSON.parse(fs.readFileSync(MOMENTS_PATH, 'utf8'));
	const massInfo = fs.existsSync(MASS_INFO_PATH) ? JSON.parse(fs.readFileSync(MASS_INFO_PATH, 'utf8')) : {};
	// Collect all pdf fields from moments.json
	const pdfUrls = moments
		.map(section => section.pdf)
		.filter(url => typeof url === 'string' && url.length > 0);

	if (pdfUrls.length === 0) {
		console.log('No PDF files found in moments.json.');
		return;
	}

	// Helper to download a PDF from a URL
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
			});
		}).catch(err => {
			console.error(`Error downloading ${url}:`, err);
			return null;
		});
	}

	const mergedPdf = await PDFDocument.create();

	// Track mapping of each merged page to its section
	const pageSectionMap = [];
	for (const url of pdfUrls) {
		let pdfBytes;
		if (url.startsWith('http://') || url.startsWith('https://')) {
			pdfBytes = await downloadPdf(url);
			if (!pdfBytes) continue;
		} else {
			// Local file path
			try {
				pdfBytes = fs.readFileSync(url);
			} catch (err) {
				// Try relative to pdfs dir
				try {
					pdfBytes = fs.readFileSync(path.join(PDFS_DIR, path.basename(url)));
				} catch (err2) {
					console.error(`Error reading local PDF: ${url}`, err2);
					continue;
				}
			}
		}
		try {
			const pdf = await PDFDocument.load(pdfBytes);
			const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
			// Find the section that matches this pdf url
			const section = moments.find(s => s.pdf === url);
			copiedPages.forEach(page => {
				mergedPdf.addPage(page);
				pageSectionMap.push(section);
			});
		} catch (err) {
			console.error(`Error loading/merging PDF: ${url}`, err);
		}
	}




	// Add header to each page with mass name, date, and singer for each moment
	const numPages = mergedPdf.getPageCount();
	const font = await mergedPdf.embedFont('Helvetica');
	for (let i = 0; i < numPages; i++) {
		const page = mergedPdf.getPage(i);
		// Use the singer from the mapped section, blank if missing
		let singer = '';
		const section = pageSectionMap[i];
		if (section && typeof section.singer === 'string' && section.singer.trim() !== '') {
			singer = section.singer.trim();
		}
		// Build header text: mass name | date | singer (if present, no label)
		let headerText = `${massInfo.mass_name || ''} | ${massInfo.date || ''}`;
		if (singer) headerText += ` | ${singer}`;

		// Center the header text
		const headerWidth = font.widthOfTextAtSize(headerText, 14);
		const pageSize = page.getSize();
		const headerX = (pageSize.width - headerWidth) / 2;
		page.drawText(headerText, {
			x: headerX,
			y: pageSize.height - 36,
			size: 14,
			color: rgb(0, 0, 0),
			font,
		});

		// Footer logic
		const momentName = section && section.moment ? section.moment : '';
		const footerText = `${momentName} | Page ${i + 1} of ${numPages}`;
		const footerWidth = font.widthOfTextAtSize(footerText, 12);
		const footerX = (pageSize.width - footerWidth) / 2;
		page.drawText(footerText, {
			x: footerX,
			y: 36,
			size: 12,
			color: rgb(0, 0, 0),
			font,
		});
	}

const mergedPdfBytes = await mergedPdf.save();
fs.writeFileSync(OUTPUT_FILE, mergedPdfBytes);
console.log(`Merged PDFs into ${OUTPUT_FILE} with header.`);
}

mergePdfs().catch(err => {
	console.error('Error merging PDFs:', err);
	process.exit(1);
});
