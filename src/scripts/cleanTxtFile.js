// cleanTxtFile.js
const fs = require('fs');
const path = require('path');

/**
 * Cleans a lyrics .txt file: removes hidden/invisible Unicode, 
 * normalizes whitespace, line endings, and tags.
 */
function cleanText(raw) {
    if (!raw) return '';

    // 1. Remove BOM, zero-width, and other invisible Unicode chars
    let cleaned = raw.replace(/\uFEFF|\u200B|\u200C|\u200D|\u00A0|\u2028|\u2029/g, '');

    // 2. Normalize all line endings to LF (\n)
    cleaned = cleaned.replace(/\r\n|\r/g, '\n');

    // 3. Remove trailing spaces and tabs
    cleaned = cleaned.replace(/[ \t]+$/gm, '');

    // 4. Ensure [TAGS] are on their own lines
    cleaned = cleaned.replace(/(\[[^\]]+\])([^\n])/g, '$1\n$2');

    // 5. Remove extra blank lines (more than 2)
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

    // 6. Remove non-ASCII characters (Crucial for PDF generation safety)
    cleaned = cleaned.replace(/[^\x00-\x7F]/g, '');

    return cleaned.trim();
}

// Export for use in extractMetaFromSongTxt.js and buildAndMergeTxtToPdf.js
module.exports = { cleanText };

/**
 * STANDALONE EXECUTION LOGIC
 * Usage: node src/scripts/cleanTxtFile.js <input.txt> <output.txt>
 */
if (require.main === module) {
    const [,, inputArg, outputArg] = process.argv;

    if (!inputArg) {
        console.log("❌ Error: No input file provided.");
        console.log("Usage: node src/scripts/cleanTxtFile.js <path_to_file>");
        process.exit(1);
    }

    // Resolve the path based on where you are running the command
    const inputPath = path.resolve(process.cwd(), inputArg);
    const outputPath = outputArg ? path.resolve(process.cwd(), outputArg) : inputPath;

    if (fs.existsSync(inputPath)) {
        const raw = fs.readFileSync(inputPath, 'utf8');
        const processed = cleanText(raw);
        fs.writeFileSync(outputPath, processed);
        console.log(`✨ Cleaned: ${path.basename(inputPath)} -> ${path.basename(outputPath)}`);
    } else {
        console.error(`❌ File not found: ${inputPath}`);
    }
}