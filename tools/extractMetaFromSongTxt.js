// extractMetaFromSongTxt.js
// Extracts metadata from external/local .txt files and updates mydata.json
// Usage: node extractMetaFromSongTxt.js

const fs = require('fs');
const path = require('path');
const MYDATA_PATH = path.join(__dirname, '../moments.json');

function parseTxtFile(txtPath) {
  if (!fs.existsSync(txtPath)) return {};
  const lines = fs.readFileSync(txtPath, 'utf8').split(/\r?\n/);
  let meta = {};
  let currentSection = null;
  let buffer = [];
  let foundTitle = false, foundAuthor = false;
  let snippetSections = {};
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const sectionMatch = line.match(/^\[(.+?)\]$/);
    if (sectionMatch) {
      // Save previous section
      if (currentSection && buffer.length) {
        const content = buffer.join(' ').trim();
        if (currentSection === 'Title' && !foundTitle) {
          meta.title = content;
          foundTitle = true;
        } else if (currentSection === 'Author' && !foundAuthor) {
          meta.author = content;
          foundAuthor = true;
        } else if (['Response','Refrain','Acclamation','Verse'].includes(currentSection)) {
          snippetSections[currentSection] = content;
        }
      }
      currentSection = sectionMatch[1];
      buffer = [];
    } else if (currentSection) {
      buffer.push(line);
    }
  }
  // Save last section
  if (currentSection && buffer.length) {
    const content = buffer.join(' ').trim();
    if (currentSection === 'Title' && !foundTitle) {
      meta.title = content;
    } else if (currentSection === 'Author' && !foundAuthor) {
      meta.author = content;
    } else if (['Response','Refrain','Acclamation','Verse'].includes(currentSection)) {
      snippetSections[currentSection] = content;
    }
  }
  // Priority: Response > Refrain > Acclamation > Verse
  meta.snippet = snippetSections['Response'] || snippetSections['Refrain'] || snippetSections['Acclamation'] || snippetSections['Verse'] || '';
  return meta;
}

function updateMyDataFromTxt() {
  let mydata = JSON.parse(fs.readFileSync(MYDATA_PATH, 'utf8'));
  let changed = false;
  let newSections = Array.isArray(mydata.sections) ? JSON.parse(JSON.stringify(mydata.sections)) : Array.isArray(mydata) ? JSON.parse(JSON.stringify(mydata)) : [];
  for (let i = 0; i < newSections.length; i++) {
    const section = newSections[i];
    let txtPath = null;
    if (section.lyrics) {
      txtPath = path.isAbsolute(section.lyrics)
        ? section.lyrics
        : path.resolve(__dirname, '..', section.lyrics);
    }
    if (txtPath && fs.existsSync(txtPath)) {
      const meta = parseTxtFile(txtPath);
      if (meta.title) section.title = meta.title;
      else if (!('title' in section)) section.title = '';
      if (meta.author) section.author = meta.author;
      else if (!('author' in section)) section.author = '';
      if (meta.snippet) section.snippet = meta.snippet;
      else if (!('snippet' in section)) section.snippet = '';
      changed = true;
    } else {
      // Ensure fields exist even if no lyrics file
      if (!('title' in section)) section.title = '';
      if (!('author' in section)) section.author = '';
      if (!('snippet' in section)) section.snippet = '';
    }
  }
  if (changed) {
    // If original is array, write array; if object with sections, update sections
    if (Array.isArray(mydata)) {
      fs.writeFileSync(MYDATA_PATH, JSON.stringify(newSections, null, 2));
    } else {
      fs.writeFileSync(MYDATA_PATH, JSON.stringify({ ...mydata, sections: newSections }, null, 2));
    }
    console.log('moments.json updated from .txt files');
  } else {
    console.log('No updates made to moments.json');
  }
}

if (require.main === module) {
  updateMyDataFromTxt();
}
