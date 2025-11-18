// extractMetaFromMyDataTxt.js
// Extracts metadata from .txt files specified in mydata.json (txt_url field) and updates mydata.json with title, author, snippet, etc.
// Usage: node extractMetaFromMyDataTxt.js

const fs = require('fs');
const path = require('path');

const MYDATA_PATH = path.join(__dirname, '../mydata.json');

function parseTxtFile(txtPath) {
  if (!fs.existsSync(txtPath)) return {};
  const lines = fs.readFileSync(txtPath, 'utf8').split(/\r?\n/);
  let meta = {};
  let currentSection = null;
  let buffer = [];
  let firstSectionName = null;
  let firstSectionContent = null;
  for (let line of lines) {
    const sectionMatch = line.match(/^\s*\[(.+?)\]\s*$/);
    if (sectionMatch) {
      if (currentSection && buffer.length) {
        const sectionName = currentSection.toLowerCase();
        const content = buffer.join(' ').trim();
        if (content) meta[sectionName] = content;
        if (!firstSectionName && sectionName !== 'title' && sectionName !== 'name' && sectionName !== 'author') {
          firstSectionName = sectionName;
          firstSectionContent = content;
        }
      }
      currentSection = sectionMatch[1];
      buffer = [];
    } else if (currentSection) {
      buffer.push(line.trim());
    }
  }
  if (currentSection && buffer.length) {
    const sectionName = currentSection.toLowerCase();
    const content = buffer.join(' ').trim();
    if (content) meta[sectionName] = content;
    if (!firstSectionName && sectionName !== 'title' && sectionName !== 'name' && sectionName !== 'author') {
      firstSectionName = sectionName;
      firstSectionContent = content;
    }
  }
  // Fallbacks for title, author, snippet (only set if present)
  if (meta.title || meta.name) meta.title = meta.title || meta.name;
  if (firstSectionContent) meta.snippet = firstSectionContent;
  return meta;
}

function updateMyData() {
  let mydata = JSON.parse(fs.readFileSync(MYDATA_PATH, 'utf8'));
  let changed = false;
  // Work on a copy of sections to avoid accidental overwrite
  let newSections = mydata.sections ? JSON.parse(JSON.stringify(mydata.sections)) : [];
  for (let i = 0; i < newSections.length; i++) {
    const section = newSections[i];
    const txtPath = section.txt_url ? path.resolve(__dirname, '..', section.txt_url) : null;
    if (txtPath && fs.existsSync(txtPath)) {
      const meta = parseTxtFile(txtPath);
      // Only update fields if present in txt file
      if (meta.title) section.title = meta.title;
      if (meta.author) section.author = meta.author;
      if (meta.snippet) section.snippet = meta.snippet;
      changed = true;
    }
    // If no txt file, do NOT overwrite any fields (leave as-is)
  }
  if (changed) {
    // Preserve all top-level fields, only update sections
    // Explicitly copy all top-level fields except 'sections', then set updated sections
    let updated = {};
    for (const key of Object.keys(mydata)) {
      if (key !== 'sections') updated[key] = mydata[key];
    }
    updated.sections = newSections;
    fs.writeFileSync(MYDATA_PATH, JSON.stringify(updated, null, 2));
    console.log('mydata.json updated with extracted metadata.');
  } else {
    console.log('No updates made. No .txt files found or no metadata extracted.');
  }
}

updateMyData();
