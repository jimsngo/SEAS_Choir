/**
 * SEAS Choir Lyrics Word Document Generator
 * -----------------------------------------
 * This script generates a print-ready .docx file (and optionally a PDF) for choir use, using the song text files in the `moments/` directory.
 *
 * USAGE:
 *   node convertTxtToDocx.js [output.docx]
 *
 * OUTPUT:
 *   - A Word document (default: pdfs/lyrics.docx) with a 2x2 table layout for moments, and a separate page for Recessional.
 *   - For PDF: After generating the .docx, run:
 *       libreoffice --headless --convert-to pdf pdfs/lyrics.docx --outdir pdfs
 *
 * REQUIREMENTS:
 *   - Node.js (for this script)
 *   - LibreOffice (for PDF conversion, optional)
 *
 * HOW IT WORKS:
 *   - Reads each moment's .txt file in the `moments/` subfolders.
 *   - The first line is the title, the second line is the author (skipped), the rest are lyrics.
 *   - Lays out moments in a 2x2 table for easy printing, with left-aligned lyrics and no visible table borders.
 *   - Adds a header with the event name from mydata.json.
 *   - All formatting is optimized for Brother HL-2140 printer margins.
 *
 * TIPS:
 *   - Edit the .txt files in `moments/` to update lyrics.
 *   - Edit `mydata.json` to change the event name in the header.
 *   - Use the generated PDF for best print fidelity.
 *
 * Author: Jim Ngo
 * Last updated: 2025-09-30
 */

const fs = require('fs');
const path = require('path');
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, HeadingLevel, SectionType, PageOrientation, Header } = require('docx');

// Read the 'name' element from mydata.json
let docName = 'SEAS Choir Lyrics';
try {
  const mydata = JSON.parse(fs.readFileSync('./mydata.json', 'utf8'));
  if (mydata && mydata.name) {
    docName = mydata.name;
  }
} catch (e) {
  // fallback to default
}

const outputPath = process.argv[2] || './pdfs/lyrics.docx';
const momentsDir = './moments';

// Define the desired order and mapping to folder names
const layoutOrder = [
  { moment: 'Entrance Antiphon', folder: '1_entrance_antiphon' },
  { moment: 'Responsorial Psalm', folder: '2_responsorial_psalm' },
  { moment: 'Gospel Acclamation', folder: '3_gospel_acclamation' },
  { moment: 'Offertory', folder: '4_offertory' },
  { moment: 'Communion Antiphon', folder: '5_communion_antiphon' },
  { moment: 'Communion', folder: '6_communion' },
  { moment: 'Meditation', folder: '7_meditation' },
  { moment: 'Recessional', folder: '8_recessional' },
];

const moments = [];
for (const entry of layoutOrder) {
  const folderPath = path.join(momentsDir, entry.folder);
  if (!fs.existsSync(folderPath)) continue;
  const txtFiles = fs.readdirSync(folderPath).filter(f => f.toLowerCase().endsWith('.txt'));
  if (txtFiles.length === 0) continue;
  const txtPath = path.join(folderPath, txtFiles[0]);
  const fileContent = fs.readFileSync(txtPath, 'utf8');
  const lines = fileContent.split(/\n/).filter(l => l.trim());
  const title = lines[0] || '';
  // Skip the 2nd line (author) if present
  const lyrics = lines.slice(2);
  moments.push({ moment: entry.moment, title, lyrics });
}
const momentMap = {};
moments.forEach(m => { momentMap[m.moment] = m; });

// Helper to build a block for a moment
function momentBlock(m) {
  if (!m) return [];
  const blocks = [
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: 0 }, // Remove gap after moment
      children: [
        new TextRun({ text: m.moment, bold: true, size: 32, underline: {} })
      ],
    }),
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      alignment: AlignmentType.CENTER,
      spacing: { before: 100, after: 80 },
      children: [new TextRun({ text: m.title, bold: true, size: 24 })],
    }),
    ...m.lyrics.map(line =>
      /^\[.*\]$/.test(line)
        ? new Paragraph({
            children: [new TextRun({ text: line, bold: true, color: '1F4E79', size: 24 })],
            spacing: { before: 80, after: 80 },
            alignment: AlignmentType.LEFT,
          })
        : new Paragraph({
            children: [new TextRun({ text: line, size: 22 })],
            spacing: { after: 60 },
            alignment: AlignmentType.LEFT,
          })
    ),
    new Paragraph({ text: '', spacing: { after: 200 } }),
  ];
  return blocks;
}

// Table layout: 2 rows (pages), 2 columns
const tableRows = [
  new TableRow({
    children: [
      new TableCell({
        width: { size: 50, type: WidthType.PERCENTAGE },
        children: [
          ...momentBlock(momentMap['Entrance Antiphon']),
          ...momentBlock(momentMap['Responsorial Psalm']),
          ...momentBlock(momentMap['Gospel Acclamation']),
        ],
        verticalAlign: 'top',
        margins: { left: 200, right: 200 },
        alignment: AlignmentType.LEFT,
        borders: {
          top: { size: 0, color: 'FFFFFF' },
          bottom: { size: 0, color: 'FFFFFF' },
          left: { size: 0, color: 'FFFFFF' },
          right: { size: 0, color: 'FFFFFF' },
        },
      }),
      new TableCell({
        width: { size: 50, type: WidthType.PERCENTAGE },
        children: [
          ...momentBlock(momentMap['Offertory']),
          ...momentBlock(momentMap['Communion Antiphon']),
        ],
        verticalAlign: 'top',
        margins: { left: 200, right: 200 },
        alignment: AlignmentType.LEFT,
        borders: {
          top: { size: 0, color: 'FFFFFF' },
          bottom: { size: 0, color: 'FFFFFF' },
          left: { size: 0, color: 'FFFFFF' },
          right: { size: 0, color: 'FFFFFF' },
        },
      }),
    ],
  }),
  new TableRow({
    children: [
      new TableCell({
        width: { size: 50, type: WidthType.PERCENTAGE },
        children: [
          ...momentBlock(momentMap['Communion']),
        ],
        verticalAlign: 'top',
        margins: { left: 200, right: 200 },
        alignment: AlignmentType.LEFT,
        borders: {
          top: { size: 0, color: 'FFFFFF' },
          bottom: { size: 0, color: 'FFFFFF' },
          left: { size: 0, color: 'FFFFFF' },
          right: { size: 0, color: 'FFFFFF' },
        },
      }),
      new TableCell({
        width: { size: 50, type: WidthType.PERCENTAGE },
        children: [
          ...momentBlock(momentMap['Meditation']),
        ],
        verticalAlign: 'top',
        margins: { left: 200, right: 200 },
        alignment: AlignmentType.LEFT,
        borders: {
          top: { size: 0, color: 'FFFFFF' },
          bottom: { size: 0, color: 'FFFFFF' },
          left: { size: 0, color: 'FFFFFF' },
          right: { size: 0, color: 'FFFFFF' },
        },
      }),
    ],
  }),
];

// Set table width to maximum printable area for Brother HL-2140 (Letter: 8.5x11in, safe ~10,800x15,000 twips)
const maxWidth = 10800; // 7.5in (leaving 0.5in margin each side)
const maxHeight = 15000; // ~10in (leaving 0.5in margin top/bottom)
const table = new Table({
  rows: tableRows,
  width: { size: maxWidth, type: WidthType.DXA },
  alignment: AlignmentType.CENTER,
  columnWidths: [Math.floor(maxWidth/2), Math.ceil(maxWidth/2)],
  // No direct height for table, but can set cell vertical alignment and add spacing if needed
});

// Set page size and margins for maximum printable area (Letter: 8.5x11in, margins 0.25in)
const pageWidth = 12240; // 8.5in - 0.25in*2 = 8in usable, 8*1440=11520, but allow a bit more for Brother
const pageHeight = 15840; // 11in - 0.25in*2 = 10.5in usable, 10.5*1440=15120
const topMargin = 1440; // 1 inch in twips
const sideMargin = 600; // ~0.42 inch in twips (increase from 0.25in)

const doc = new Document({
  sections: [
    {
      properties: {
        type: SectionType.CONTINUOUS,
        page: {
          size: { width: pageWidth, height: pageHeight, orientation: PageOrientation.PORTRAIT },
          margin: { top: topMargin, bottom: 360, left: sideMargin, right: sideMargin },
        },
      },
      headers: {
        default: new Header({
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({ text: docName, bold: true, size: 28 })
              ]
            })
          ]
        })
      },
      children: [table],
    },
    momentMap['Recessional'] ? {
      properties: {
        type: SectionType.NEXT_PAGE,
        page: {
          size: { width: pageWidth, height: pageHeight, orientation: PageOrientation.PORTRAIT },
          margin: { top: topMargin, bottom: 360, left: sideMargin, right: sideMargin },
        },
      },
      headers: {
        default: new Header({
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({ text: docName, bold: true, size: 28 })
              ]
            })
          ]
        })
      },
      children: [
        new Table({
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  width: { size: 50, type: WidthType.PERCENTAGE },
                  children: [...momentBlock(momentMap['Recessional'])],
                  verticalAlign: 'top',
                  margins: { left: 200, right: 200 },
                  alignment: AlignmentType.LEFT,
                  borders: {
                    top: { size: 0, color: 'FFFFFF' },
                    bottom: { size: 0, color: 'FFFFFF' },
                    left: { size: 0, color: 'FFFFFF' },
                    right: { size: 0, color: 'FFFFFF' },
                  },
                }),
                new TableCell({
                  width: { size: 50, type: WidthType.PERCENTAGE },
                  children: [],
                  verticalAlign: 'top',
                  margins: { left: 200, right: 200 },
                  alignment: AlignmentType.LEFT,
                  borders: {
                    top: { size: 0, color: 'FFFFFF' },
                    bottom: { size: 0, color: 'FFFFFF' },
                    left: { size: 0, color: 'FFFFFF' },
                    right: { size: 0, color: 'FFFFFF' },
                  },
                }),
              ],
            }),
          ],
          width: { size: maxWidth, type: WidthType.DXA },
          alignment: AlignmentType.CENTER,
          columnWidths: [Math.floor(maxWidth/2), Math.ceil(maxWidth/2)],
        }),
      ],
    } : undefined,
  ].filter(Boolean),
});

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync(outputPath, buffer);
  console.log(`Created ${outputPath}`);
});

/**
 * SEAS Choir Lyrics Word Document Generator
 * -----------------------------------------
 * This script generates a print-ready .docx file (and optionally a PDF) for choir use, using the song text files in the `moments/` directory.
 *
 * USAGE:
 *   node convertTxtToDocx.js [output.docx]
 *
 * OUTPUT:
 *   - A Word document (default: pdfs/lyrics.docx) with a 2x2 table layout for moments, and a separate page for Recessional.
 *   - For PDF: After generating the .docx, run:
 *       libreoffice --headless --convert-to pdf pdfs/lyrics.docx --outdir pdfs
 *
 * REQUIREMENTS:
 *   - Node.js (for this script)
 *   - LibreOffice (for PDF conversion, optional)
 *
 * HOW IT WORKS:
 *   - Reads each moment's .txt file in the `moments/` subfolders.
 *   - The first line is the title, the second line is the author (skipped), the rest are lyrics.
 *   - Lays out moments in a 2x2 table for easy printing, with left-aligned lyrics and no visible table borders.
 *   - Adds a header with the event name from mydata.json.
 *   - All formatting is optimized for Brother HL-2140 printer margins.
 *
 * TIPS:
 *   - Edit the .txt files in `moments/` to update lyrics.
 *   - Edit `mydata.json` to change the event name in the header.
 *   - Use the generated PDF for best print fidelity.
 *
 * Author: Jim Ngo
 * Last updated: 2025-09-30
 */

const fs = require('fs');
const path = require('path');
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, HeadingLevel, SectionType, PageOrientation, Header } = require('docx');

// Read the 'name' element from mydata.json
let docName = 'SEAS Choir Lyrics';
try {
  const mydata = JSON.parse(fs.readFileSync('./mydata.json', 'utf8'));
  if (mydata && mydata.name) {
    docName = mydata.name;
  }
} catch (e) {
  // fallback to default
}

const outputPath = process.argv[2] || './pdfs/lyrics.docx';
const momentsDir = './moments';

// Define the desired order and mapping to folder names
const layoutOrder = [
  { moment: 'Entrance Antiphon', folder: '1_entrance_antiphon' },
  { moment: 'Responsorial Psalm', folder: '2_responsorial_psalm' },
  { moment: 'Gospel Acclamation', folder: '3_gospel_acclamation' },
  { moment: 'Offertory', folder: '4_offertory' },
  { moment: 'Communion Antiphon', folder: '5_communion_antiphon' },
  { moment: 'Communion', folder: '6_communion' },
  { moment: 'Meditation', folder: '7_meditation' },
  { moment: 'Recessional', folder: '8_recessional' },
];

const moments = [];
for (const entry of layoutOrder) {
  const folderPath = path.join(momentsDir, entry.folder);
  if (!fs.existsSync(folderPath)) continue;
  const txtFiles = fs.readdirSync(folderPath).filter(f => f.toLowerCase().endsWith('.txt'));
  if (txtFiles.length === 0) continue;
  const txtPath = path.join(folderPath, txtFiles[0]);
  const fileContent = fs.readFileSync(txtPath, 'utf8');
  const lines = fileContent.split(/\n/).filter(l => l.trim());
  const title = lines[0] || '';
  // Skip the 2nd line (author) if present  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
  const lyrics = lines.slice(2);
  moments.push({ moment: entry.moment, title, lyrics });
}
const momentMap = {};
moments.forEach(m => { momentMap[m.moment] = m; });

// Helper to build a block for a moment
function momentBlock(m) {
  if (!m) return [];
  const blocks = [
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: 0 }, // Remove gap after moment
      children: [
        new TextRun({ text: m.moment, bold: true, size: 32, underline: {} })
      ],
    }),
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      alignment: AlignmentType.CENTER,
      spacing: { before: 100, after: 80 },
      children: [new TextRun({ text: m.title, bold: true, size: 24 })],
    }),
    ...m.lyrics.map(line =>
      /^\[.*\]$/.test(line)
        ? new Paragraph({
            children: [new TextRun({ text: line, bold: true, color: '1F4E79', size: 24 })],
            spacing: { before: 80, after: 80 },
            alignment: AlignmentType.LEFT,
          })
        : new Paragraph({
            children: [new TextRun({ text: line, size: 22 })],
            spacing: { after: 60 },
            alignment: AlignmentType.LEFT,
          })
    ),
    new Paragraph({ text: '', spacing: { after: 200 } }),
  ];
  return blocks;
}

// Table layout: 2 rows (pages), 2 columns
const tableRows = [
  new TableRow({
    children: [
      new TableCell({
        width: { size: 50, type: WidthType.PERCENTAGE },
        children: [
          ...momentBlock(momentMap['Entrance Antiphon']),
          ...momentBlock(momentMap['Responsorial Psalm']),
          ...momentBlock(momentMap['Gospel Acclamation']),
        ],
        verticalAlign: 'top',
        margins: { left: 200, right: 200 },
        alignment: AlignmentType.LEFT,
        borders: {
          top: { size: 0, color: 'FFFFFF' },
          bottom: { size: 0, color: 'FFFFFF' },
          left: { size: 0, color: 'FFFFFF' },
          right: { size: 0, color: 'FFFFFF' },
        },
      }),
      new TableCell({
        width: { size: 50, type: WidthType.PERCENTAGE },
        children: [
          ...momentBlock(momentMap['Offertory']),
          ...momentBlock(momentMap['Communion Antiphon']),
        ],
        verticalAlign: 'top',
        margins: { left: 200, right: 200 },
        alignment: AlignmentType.LEFT,
        borders: {
          top: { size: 0, color: 'FFFFFF' },
          bottom: { size: 0, color: 'FFFFFF' },
          left: { size: 0, color: 'FFFFFF' },
          right: { size: 0, color: 'FFFFFF' },
        },
      }),
    ],
  }),
  new TableRow({
    children: [
      new TableCell({
        width: { size: 50, type: WidthType.PERCENTAGE },
        children: [
          ...momentBlock(momentMap['Communion']),
        ],
        verticalAlign: 'top',
        margins: { left: 200, right: 200 },
        alignment: AlignmentType.LEFT,
        borders: {
          top: { size: 0, color: 'FFFFFF' },
          bottom: { size: 0, color: 'FFFFFF' },
          left: { size: 0, color: 'FFFFFF' },
          right: { size: 0, color: 'FFFFFF' },
        },
      }),
      new TableCell({
        width: { size: 50, type: WidthType.PERCENTAGE },
        children: [
          ...momentBlock(momentMap['Meditation']),
        ],
        verticalAlign: 'top',
        margins: { left: 200, right: 200 },
        alignment: AlignmentType.LEFT,
        borders: {
          top: { size: 0, color: 'FFFFFF' },
          bottom: { size: 0, color: 'FFFFFF' },
          left: { size: 0, color: 'FFFFFF' },
          right: { size: 0, color: 'FFFFFF' },
        },
      }),
    ],
  }),
];

// Set table width to maximum printable area for Brother HL-2140 (Letter: 8.5x11in, safe ~10,800x15,000 twips)
const maxWidth = 10800; // 7.5in (leaving 0.5in margin each side)
const maxHeight = 15000; // ~10in (leaving 0.5in margin top/bottom)
const table = new Table({
  rows: tableRows,
  width: { size: maxWidth, type: WidthType.DXA },
  alignment: AlignmentType.CENTER,
  columnWidths: [Math.floor(maxWidth/2), Math.ceil(maxWidth/2)],
  // No direct height for table, but can set cell vertical alignment and add spacing if needed
});

// Set page size and margins for maximum printable area (Letter: 8.5x11in, margins 0.25in)
const pageWidth = 12240; // 8.5in - 0.25in*2 = 8in usable, 8*1440=11520, but allow a bit more for Brother
const pageHeight = 15840; // 11in - 0.25in*2 = 10.5in usable, 10.5*1440=15120
const topMargin = 1440; // 1 inch in twips
const sideMargin = 600; // ~0.42 inch in twips (increase from 0.25in)

const doc = new Document({
  sections: [
    {
      properties: {
        type: SectionType.CONTINUOUS,
        page: {
          size: { width: pageWidth, height: pageHeight, orientation: PageOrientation.PORTRAIT },
          margin: { top: topMargin, bottom: 360, left: sideMargin, right: sideMargin },
        },
      },
      headers: {
        default: new Header({
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({ text: docName, bold: true, size: 28 })
              ]
            })
          ]
        })
      },
      children: [table],
    },
    momentMap['Recessional'] ? {
      properties: {
        type: SectionType.NEXT_PAGE,
        page: {
          size: { width: pageWidth, height: pageHeight, orientation: PageOrientation.PORTRAIT },
          margin: { top: topMargin, bottom: 360, left: sideMargin, right: sideMargin },
        },
      },
      headers: {
        default: new Header({
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({ text: docName, bold: true, size: 28 })
              ]
            })
          ]
        })
      },
      children: [
        new Table({
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  width: { size: 50, type: WidthType.PERCENTAGE },
                  children: [...momentBlock(momentMap['Recessional'])],
                  verticalAlign: 'top',
                  margins: { left: 200, right: 200 },
                  alignment: AlignmentType.LEFT,
                  borders: {
                    top: { size: 0, color: 'FFFFFF' },
                    bottom: { size: 0, color: 'FFFFFF' },
                    left: { size: 0, color: 'FFFFFF' },
                    right: { size: 0, color: 'FFFFFF' },
                  },
                }),
                new TableCell({
                  width: { size: 50, type: WidthType.PERCENTAGE },
                  children: [],
                  verticalAlign: 'top',
                  margins: { left: 200, right: 200 },
                  alignment: AlignmentType.LEFT,
                  borders: {
                    top: { size: 0, color: 'FFFFFF' },
                    bottom: { size: 0, color: 'FFFFFF' },
                    left: { size: 0, color: 'FFFFFF' },
                    right: { size: 0, color: 'FFFFFF' },
                  },
                }),
              ],
            }),
          ],
          width: { size: maxWidth, type: WidthType.DXA },
          alignment: AlignmentType.CENTER,
          columnWidths: [Math.floor(maxWidth/2), Math.ceil(maxWidth/2)],
        }),
      ],
    } : undefined,
  ].filter(Boolean),
});

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync(outputPath, buffer);
  console.log(`Created ${outputPath}`);
});
