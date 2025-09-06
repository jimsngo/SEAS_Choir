// node updateMyDataFromMoments.js

// This script updates mydata.json from the contents of the moments/ folder.
// For each section in mydata.json, it looks for a folder in moments/ that matches
// the "moment" field (case insensitive, spaces and punctuation replaced by underscores).
// If found, it looks for the only .mp3, .pdf, .txt, and .json file in that folder and updates
// audio_url, title, author, and snippet fields in mydata.json directly from the .json file.
// Assumes there is only one of each file type per moment folder.

const fs = require('fs');
const path = require('path');

const dataPath = './mydata.json';
const momentsDir = './moments';

function folderForMoment(moment) {
  return moment ? moment.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') : '';
}

const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));


data.sections.forEach(section => {
  if (!section.moment) {
    console.warn('Section missing "moment":', section);
    return;
  }
  const folders = fs.readdirSync(momentsDir).filter(f =>
    fs.statSync(path.join(momentsDir, f)).isDirectory()
  );
  const normalized = folderForMoment(section.moment);
  const folder = folders.find(f => f.toLowerCase().endsWith(normalized));
  if (folder) {
    const folderPath = path.join(momentsDir, folder);
    const files = fs.readdirSync(folderPath);
    // Find the only mp3 file
    const mp3 = files.find(f => f.toLowerCase().endsWith('.mp3'));
    if (mp3) {
      section.audio_url = path.posix.join('moments', folder, mp3);
    } else {
      console.warn(`No mp3 found in ${folderPath}`);
    }
    // Find the only .json file (excluding files that match section.moment, e.g. "Responsorial Psalm.json")
    const jsonFiles = files.filter(f => f.toLowerCase().endsWith('.json'));
    if (jsonFiles.length > 0) {
      // Prefer a .json file that is not a generic label (e.g. not just the moment name)
      let metaFile = jsonFiles[0];
      if (jsonFiles.length > 1) {
        metaFile = jsonFiles.find(f => f !== `${section.moment}.json`) || jsonFiles[0];
      }
      const metaPath = path.join(folderPath, metaFile);
      try {
        const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
        if ('title' in meta) section.title = meta.title;
        if ('author' in meta) section.author = meta.author;
        if ('snippet' in meta) section.snippet = meta.snippet;
        console.log(`Updated meta for ${section.moment} from ${metaFile}`);
      } catch (e) {
        console.warn(`Invalid JSON in ${metaPath}`);
      }
    } else {
      console.warn(`No .json metadata found in ${folderPath}`);
    }
  } else {
    console.warn(`No folder found for moment "${section.moment}" (normalized "${normalized}")`);
  }
});

fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
console.log('mydata.json fully updated from moments folders!');