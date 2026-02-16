const fs = require('fs');
const path = require('path');

// Resolve paths relative to THIS file
const PROJECT_ROOT = path.resolve(__dirname, '../../');
const MOMENTS_PATH = path.join(PROJECT_ROOT, 'config/moments.json');

// --- 1. CLEANING FUNCTION ---
function cleanText(raw) {
    if (!raw) return '';
    let cleaned = raw.replace(/\uFEFF|\u200B|\u200C|\u200D|\u00A0|\u2028|\u2029/g, '');
    cleaned = cleaned.replace(/\r\n|\r/g, '\n');
    cleaned = cleaned.replace(/[ \t]+$/gm, '');
    // Ensure every tag is on its own line
    cleaned = cleaned.replace(/(\[[^\]]+\])([^\n])/g, '$1\n$2');
    // normalize newlines
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
    return cleaned.trim();
}

// --- 2. PARSER LOGIC ---
function parseTxtFile(txtPath) {
    if (!fs.existsSync(txtPath)) return {};

    let raw = fs.readFileSync(txtPath, 'utf8');
    raw = cleanText(raw);
    const lines = raw.split('\n').map(l => l.trim());
    
    let meta = { title: '', author: '', snippet: '' };
    
    // State machine flags
    let currentSection = null; // 'title', 'author', or 'snippet'
    let authorFound = false;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Skip empty lines
        if (!line) continue;

        // Check if this line is a tag (e.g., [Title], [Verse 1])
        const tagMatch = line.match(/^\[(.+?)\]$/);

        if (tagMatch) {
            const tagName = tagMatch[1].toLowerCase();

            if (tagName === 'title') {
                currentSection = 'title';
            } 
            else if (tagName === 'author') {
                currentSection = 'author';
                authorFound = true;
            } 
            else if (authorFound && !meta.snippet) {
                // If we found the Author already, and haven't found a snippet yet,
                // THIS tag marks the start of our snippet (e.g. [Verse 1] or [Refrain])
                currentSection = 'snippet';
            } 
            else if (meta.snippet) {
                // We were reading the snippet, but hit a NEW tag.
                // Stop reading.
                break;
            }
        } 
        else {
            // It's content (lyrics/text)
            if (currentSection === 'title') {
                meta.title = line; // Assume title is one line
                currentSection = null; // Stop capturing title
            } 
            else if (currentSection === 'author') {
                meta.author = line; // Assume author is one line
                currentSection = null; // Stop capturing author
            } 
            else if (currentSection === 'snippet') {
                // Add this line to the snippet
                if (meta.snippet) meta.snippet += " ";
                meta.snippet += line;
            }
        }
    }

    return meta;
}

// --- 3. MAIN UPDATE LOOP ---
function updateMoments() {
    console.log('--- Scanning Lyrics for Metadata ---');
    
    if (!fs.existsSync(MOMENTS_PATH)) {
        console.error('Error: moments.json not found');
        return;
    }

    let moments = JSON.parse(fs.readFileSync(MOMENTS_PATH, 'utf8'));
    if (!Array.isArray(moments)) return; // Safety check

    let changed = false;

    moments.forEach(moment => {
        if (moment.txt) {
            const fullTxtPath = path.join(PROJECT_ROOT, moment.txt);
            
            if (fs.existsSync(fullTxtPath)) {
                const meta = parseTxtFile(fullTxtPath);

                // Update Title
                if (meta.title && moment.title !== meta.title) {
                    moment.title = meta.title;
                    changed = true;
                }
                // Update Author
                if (meta.author && moment.author !== meta.author) {
                    moment.author = meta.author;
                    changed = true;
                }
                // Update Snippet (The Logic You Requested)
                if (meta.snippet && moment.snippet !== meta.snippet) {
                    moment.snippet = meta.snippet;
                    changed = true;
                    console.log(`Updated Snippet for: ${moment.moment}`);
                }
            }
        }
    });

    if (changed) {
        fs.writeFileSync(MOMENTS_PATH, JSON.stringify(moments, null, 2));
        console.log('✅ moments.json updated successfully.');
    } else {
        console.log('No metadata changes needed.');
    }
}

// Execute
updateMoments();