const path = require('path');
const fs = require('fs');

// ==========================================
//        PATH CONTROL PANEL
// ==========================================
// This script lives in src/scripts/, so we go UP twice (..) to reach root
const ROOT_DIR = path.join(__dirname, '..', '..');

const CONFIG_DIR   = path.join(ROOT_DIR, 'config');
const MOMENTS_PATH = path.join(CONFIG_DIR, 'moments.json');
const DATA_DIR     = path.join(ROOT_DIR, 'src', 'data', 'Moments');
// ==========================================

// --- 1. CLEANING FUNCTION ---
function cleanText(raw) {
    if (!raw) return '';
    let cleaned = raw.replace(/\uFEFF|\u200B|\u200C|\u200D|\u00A0|\u2028|\u2029/g, '');
    cleaned = cleaned.replace(/\r\n|\r/g, '\n');
    cleaned = cleaned.replace(/[ \t]+$/gm, '');
    cleaned = cleaned.replace(/(\[[^\]]+\])([^\n])/g, '$1\n$2');
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
    let currentSection = null; 
    let authorFound = false;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!line) continue;

        const tagMatch = line.match(/^\[(.+?)\]$/);
        if (tagMatch) {
            const tagName = tagMatch[1].toLowerCase();
            if (tagName === 'title') currentSection = 'title';
            else if (tagName === 'author') {
                currentSection = 'author';
                authorFound = true;
            } 
            else if (authorFound && !meta.snippet) currentSection = 'snippet';
            else if (meta.snippet) break;
        } 
        else {
            if (currentSection === 'title') {
                meta.title = line;
                currentSection = null;
            } 
            else if (currentSection === 'author') {
                meta.author = line;
                currentSection = null;
            } 
            else if (currentSection === 'snippet') {
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
    console.log(`📂 Root: ${ROOT_DIR}`);
    
    if (!fs.existsSync(MOMENTS_PATH)) {
        console.error('❌ Error: moments.json not found at ' + MOMENTS_PATH);
        return;
    }

    let moments = JSON.parse(fs.readFileSync(MOMENTS_PATH, 'utf8'));
    let changed = false;

    moments.forEach(moment => {
        if (moment.txt) {
            // Build absolute path to the text file using ROOT_DIR
            const fullTxtPath = path.join(ROOT_DIR, moment.txt);
            
            if (fs.existsSync(fullTxtPath)) {
                const meta = parseTxtFile(fullTxtPath);

                if (meta.title && moment.title !== meta.title) {
                    moment.title = meta.title;
                    changed = true;
                }
                if (meta.author && moment.author !== meta.author) {
                    moment.author = meta.author;
                    changed = true;
                }
                if (meta.snippet && moment.snippet !== meta.snippet) {
                    moment.snippet = meta.snippet;
                    changed = true;
                    console.log(`✅ Updated Snippet for: ${moment.moment}`);
                }
            }
        }
    });

    if (changed) {
        fs.writeFileSync(MOMENTS_PATH, JSON.stringify(moments, null, 2));
        console.log('💾 moments.json updated successfully.');
    } else {
        console.log('No metadata changes needed.');
    }
}

updateMoments();