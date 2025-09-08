// node buildAndMergePdfs.js

// Here’s a single script that will:
// Scan each moments subfolder for the only .pdf file (in folder order).
// Build a list of those PDF paths.
// Merge them (in order) into a single PDF called guitar.pdf in the pdfs folder.
// Add page numbers to the merged PDF.

const fs = require('fs');
const path = require('path');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');

const momentsDir = './moments';
const outputPdf = './pdfs/guitar.pdf';

// 1. Build the list of PDFs in order
const folders = fs.readdirSync(momentsDir)
  .filter(f => fs.statSync(path.join(momentsDir, f)).isDirectory())
  .sort();

const pdfPaths = [];

folders.forEach(folder => {
  const folderPath = path.join(momentsDir, folder);
  const pdfFiles = fs.readdirSync(folderPath).filter(f => f.toLowerCase().endsWith('.pdf'));
  if (pdfFiles.length === 1) {
    pdfPaths.push(path.join(folderPath, pdfFiles[0]));
    console.log(`Found PDF: ${path.join(folderPath, pdfFiles[0])}`);
  } else if (pdfFiles.length > 1) {
    console.warn(`More than one PDF in ${folderPath}, skipping.`);
  } else {
    console.warn(`No PDF found in ${folderPath}, skipping.`);
  }
});

if (pdfPaths.length === 0) {
  console.error('No PDFs found to merge.');
  process.exit(1);
}

// 2. Merge the PDFs
(async () => {
  const mergedPdf = await PDFDocument.create();


  // Track which moment (folder) each page comes from
  const pageMoments = [];
  for (const pdfPath of pdfPaths) {
    const pdfBytes = fs.readFileSync(pdfPath);
    const pdf = await PDFDocument.load(pdfBytes);
    const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
    // Get the moment name from the folder
    const momentFolder = path.basename(path.dirname(pdfPath));
    // Format moment (replace underscores with spaces, capitalize)
    const momentLabel = momentFolder.replace(/^[0-9]+_/, '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    copiedPages.forEach(page => {
      mergedPdf.addPage(page);
      pageMoments.push(momentLabel);
    });
  }

  // Embed font for page numbers
  const font = await mergedPdf.embedFont(StandardFonts.HelveticaBold);

  // Add page numbers after all pages are merged
  const totalPages = mergedPdf.getPageCount();
  for (let i = 0; i < totalPages; i++) {
    const page = mergedPdf.getPage(i);
    const { width } = page.getSize();
    // Draw the moment label before the page number
    const momentText = pageMoments[i] ? `${pageMoments[i]}  |  ` : '';
    page.drawText(`${momentText}Page ${i + 1} of ${totalPages}`, {
      x: width / 2 - 100,
      y: 40,
      size: 14,
      font,
      color: rgb(0, 0, 0),
    });
  }

  const mergedPdfBytes = await mergedPdf.save();
  fs.writeFileSync(outputPdf, mergedPdfBytes);
  console.log(`Merged PDF saved as ${outputPdf} with page numbers.`);
})();