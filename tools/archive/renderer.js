async function previewHtml() {
  // Open preview.html in a new Electron window
  await window.electronAPI.previewHtml('preview.html');
}
window.previewHtml = previewHtml;
// Extract metadata from txt files and update mydata.json
async function extractMetadata() {
  document.getElementById('metadataStatus').innerText = 'Extracting metadata...';
  document.getElementById('importStatus').innerText = '';
  document.getElementById('scriptStatus').innerText = '';
const ok = await window.electronAPI.runScript('tools/extractMetaFromMyDataTxt.js');
  document.getElementById('metadataStatus').innerText = ok ? 'Metadata extraction complete!' : 'Metadata extraction failed.';
}
window.extractMetadata = extractMetadata;
// const { ipcRenderer } = require('electron');


async function runAll() {
  document.getElementById('scriptStatus').innerText = 'Running all scripts...';
  // Only update file links in mydata.json
  document.getElementById('scriptStatus').innerText = 'Importing file links...';
  // Fetch mydata.json and update links from UI
  let mydata = await window.electronAPI.getMyDataJson();
  let updated = false;
  for (let i = 0; i < MOMENT_KEYS.length; i++) {
    const moment = MOMENT_KEYS[i];
    const section = (mydata.sections || []).find(s => s.moment && s.moment.toLowerCase() === (MOMENT_DISPLAY_NAMES[i] || moment).toLowerCase());
    if (section) {
      const mp3 = document.getElementById(`${moment}-mp3`).value;
      const pdf = document.getElementById(`${moment}-pdf`).value;
      const txt = document.getElementById(`${moment}-txt`).value;
      if (mp3 && section.audio_url !== mp3) { section.audio_url = mp3; updated = true; }
      if (pdf && section.pdf_url !== pdf) { section.pdf_url = pdf; updated = true; }
      if (txt && section.txt_url !== txt) { section.txt_url = txt; updated = true; }
      // Copy mp3 to mp3s folder via main process and set local_audio_url
      if (mp3) {
        const localPath = await window.electronAPI.copyMp3ToMp3s(mp3);
        if (localPath) {
          section.local_audio_url = localPath;
          updated = true;
        }
      }
    }
  }
  if (updated) {
    await window.electronAPI.saveMyDataJson(mydata);
    document.getElementById('scriptStatus').innerText = 'File links imported!';
  } else {
    document.getElementById('scriptStatus').innerText = 'No changes to file links.';
  }
}
window.runAll = runAll;

async function pushToGitHub() {
  document.getElementById('scriptStatus').innerText = 'Pushing to GitHub...';
  const ok = await window.electronAPI.gitPush();
  document.getElementById('scriptStatus').innerText = ok ? 'Pushed to GitHub!' : 'Git push failed.';
}
window.pushToGitHub = pushToGitHub;


let MOMENT_KEYS = [
  '1_entrance_antiphon',
  '2_responsorial_psalm',
  '3_gospel_acclamation',
  '4_offertory',
  '5_communion_antiphon',
  '6_communion',
  '7_meditation',
  '8_recessional',
  'Lord_Have_Mercy',
  'Glory_to_God',
  'Holy',
  'When_We_Eat_This_Bread',
  'Amen',
  'Lamb_of_God'
];
let MOMENT_DISPLAY_NAMES = [];

async function loadMomentNames() {
  try {
    if (window.electronAPI && window.electronAPI.getMomentsListJson) {
      MOMENT_DISPLAY_NAMES = await window.electronAPI.getMomentsListJson();
    } else {
      const res = await fetch('moments_list.json');
      MOMENT_DISPLAY_NAMES = await res.json();
    }
  } catch (e1) {
    MOMENT_DISPLAY_NAMES = [];
  }
}



async function createMomentBlocks() {
  const container = document.getElementById('moments');
  console.log('createMomentBlocks: start');
  // Fetch current files for each moment from main process
  const currentFiles = await window.electronAPI.getCurrentFiles();
  console.log('currentFiles:', currentFiles);
  // Fetch mydata.json for default links
  let mydata = {};
  try {
    if (window.electronAPI && window.electronAPI.getMyDataJson) {
      mydata = await window.electronAPI.getMyDataJson();
    } else {
      mydata = await (await fetch('mydata.json')).json();
    }
    console.log('Loaded mydata.json:', mydata);
  } catch (e1) {
    mydata = {};
    console.log('Failed to load mydata.json');
  }
  // Normalize a string for matching (lowercase, remove numbers, underscores, spaces, punctuation)
  function normalizeKey(str) {
    return (str || '')
      .toLowerCase()
      .replace(/\d+_/, '')
      .replace(/[^a-z]/g, '');
  }
  // Build a lookup map from lowercased moment display name to section
  const mydataSections = {};
  (mydata.sections || []).forEach(s => {
    if (s.moment) mydataSections[s.moment.toLowerCase()] = s;
  });
  console.log('mydataSections:', mydataSections);
  for (let i = 0; i < MOMENT_KEYS.length; i++) {
    const moment = MOMENT_KEYS[i];
    const displayName = MOMENT_DISPLAY_NAMES[i] || moment;
    const block = document.createElement('div');
    block.className = 'moment-block';
    // Use displayName (from moments_list.json) for lookup in mydata.json
    const section = mydataSections[displayName.toLowerCase()] || {};
    // Prefer mydata.json links if present, otherwise fallback to currentFiles
    const mp3 = section.audio_url || currentFiles[moment]?.mp3 || '';
    const pdf = section.pdf_url || currentFiles[moment]?.pdf || '';
    const txt = section.txt_url || currentFiles[moment]?.txt || '';
    let singerValue = section.singer || '';
    let mp3Value = mp3;
    let pdfValue = pdf;
    let txtValue = txt;
    let localMp3Value = section.local_audio_url || '';
    let titleValue = section.title || '';
    let authorValue = section.author || '';
    let snippetValue = section.snippet || '';
    block.innerHTML = `<h3>${displayName}</h3>
      <div class="file-row">Singer: <input type="text" id="${moment}-singer" value="${singerValue}" placeholder="Enter singer name"></div>
      <div class="file-row">MP3: <input type="text" id="${moment}-mp3" value="${mp3Value}" placeholder="${mp3Value}" readonly> <button onclick="selectFile('${moment}','mp3')">Select</button></div>
      <div class="file-row" style="margin-left:24px; color:#555; font-size:90%;">
        <div style="margin-top:2px; margin-bottom:2px;">
              <span style="display:inline-block; min-width:70px; font-weight:bold;">Local MP3:</span>
              <span id="${moment}-localmp3" style="background:#f6f6f6; border:1px solid #ccc; border-radius:4px; padding:2px 6px; word-break:break-all; white-space:pre-wrap; font-family:monospace;">${currentFiles[moment]?.mp3 || ''}</span>
        </div>
      </div>
      <div class="file-row">PDF: <input type="text" id="${moment}-pdf" value="${pdfValue}" placeholder="${pdfValue}" readonly> <button onclick="selectFile('${moment}','pdf')">Select</button></div>
      <div class="file-row">TXT: <input type="text" id="${moment}-txt" value="${txtValue}" placeholder="${txtValue}" readonly> <button onclick="selectFile('${moment}','txt')">Select</button></div>
      <div class="file-row" style="margin-left:24px;">Title: <input type="text" id="${moment}-title" value="${titleValue}" placeholder="Extracted from TXT" readonly></div>
      <div class="file-row" style="margin-left:24px;">Author: <input type="text" id="${moment}-author" value="${authorValue}" placeholder="Extracted from TXT" readonly></div>
      <div class="file-row" style="margin-left:24px;">Snippet: <input type="text" id="${moment}-snippet" value="${snippetValue}" placeholder="Extracted from TXT" readonly></div>`;
    container.appendChild(block);
  }
  console.log('createMomentBlocks: end');
}


window.onload = async function() {
  await loadMomentNames();
  // Load cantors list
  const cantors = await window.electronAPI.getCantors();
  const cantorSelect = document.getElementById('cantor');
  cantorSelect.innerHTML = cantors.map(c => `<option value="${c}">${c}</option>`).join('');
  // Pre-fill Mass Name and Cantor fields from mydata.json
  const mydata = await window.electronAPI.getMyData();
  document.getElementById('massName').value = mydata.name || '';
  // Default to last used cantor if present, else first in list
  if (mydata.cantor && cantors.includes(mydata.cantor)) {
    cantorSelect.value = mydata.cantor;
  } else if (cantors.length > 0) {
    cantorSelect.value = cantors[0];
  }
  createMomentBlocks();
};

async function selectFile(moment, type) {
  let filters = [];
  if (type === 'mp3') filters = [{ name: 'MP3', extensions: ['mp3'] }];
  if (type === 'pdf') filters = [{ name: 'PDF', extensions: ['pdf'] }];
  if (type === 'txt') filters = [{ name: 'Text', extensions: ['txt'] }];
  const filePath = await window.electronAPI.selectFile(filters);
  if (filePath) {
    document.getElementById(`${moment}-${type}`).value = filePath;
  }
}

async function importAll() {
  document.getElementById('importStatus').innerText = 'Importing...';
  document.getElementById('metadataStatus').innerText = '';
  document.getElementById('scriptStatus').innerText = '';
  // Prepare updates for mydata.json
  let mydata = await window.electronAPI.getMyData();
  if (!mydata.sections) mydata.sections = [];
  // Helper to normalize moment key
  function normalizeKey(str) {
    return (str || '').toLowerCase().replace(/\d+_/, '').replace(/[^a-z]/g, '');
  }
  // Build lookup for fast update
  const sectionMap = {};
  mydata.sections.forEach((s, i) => { sectionMap[normalizeKey(s.moment)] = i; });
  for (const moment of MOMENT_KEYS) {
    const files = ['mp3', 'pdf', 'txt'].map(type => ({
      type,
      filePath: document.getElementById(`${moment}-${type}`).value || null,
    })).filter(f => f.filePath);
    console.log(`[importAll] ${moment} files:`, files);
    if (files.length > 0) {
      try {
        console.log(`[importAll] Invoking copy-files for ${moment} with:`, files);
  await window.electronAPI.copyFiles(moment, files);
      } catch (err) {
        console.warn(`Skipping copy for ${moment} due to error:`, err);
        // Optionally, show a warning in the UI
      }
    }
    // Update mydata.json for this moment
    const title = document.getElementById(`${moment}-title`).value || '';
    const singer = document.getElementById(`${moment}-singer`).value || '';
    // Only mp3 is converted to relative path for audio_url, and always set to moments/[moment]/[filename]
    function getRelativeMp3Path(moment, mp3Path) {
  if (!mp3Path) return '';
  const filename = mp3Path.split('/').pop();
  return `moments/${moment}/${filename}`;
    }
    const mp3Input = document.getElementById(`${moment}-mp3`).value || '';
    const pdf = document.getElementById(`${moment}-pdf`).value || '';
    const txt = document.getElementById(`${moment}-txt`).value || '';
    // audio_url is always the source (Google Drive) path
    const audio_url = mp3Input;
    // local_audio_url is always the relative path in moments folder
    const local_audio_url = mp3Input ? getRelativeMp3Path(moment, mp3Input) : '';
    console.log(`[importAll] ${moment} title:`, title, 'singer:', singer, 'audio_url:', audio_url, 'local_audio_url:', local_audio_url, 'pdf:', pdf, 'txt:', txt);
    const norm = normalizeKey(moment);
    let idx = sectionMap[norm];
    if (idx === undefined) {
      // Use canonical moment name from moments_list.json, with safety check
      let idxKey = MOMENT_KEYS.indexOf(moment);
      let canonicalMoment = (idxKey >= 0 && MOMENT_DISPLAY_NAMES[idxKey]) ? MOMENT_DISPLAY_NAMES[idxKey] : moment;
      console.log('[importAll] Creating new section:', {moment, idxKey, canonicalMoment});
      mydata.sections.push({ moment: canonicalMoment, singer });
      idx = mydata.sections.length - 1;
      sectionMap[norm] = idx;
  mydata.sections.push({ moment: formattedMoment, singer });
      idx = mydata.sections.length - 1;
      sectionMap[norm] = idx;
    }
    mydata.sections[idx].title = title;
    mydata.sections[idx].singer = singer;
    if (audio_url) mydata.sections[idx].audio_url = audio_url;
    if (local_audio_url) mydata.sections[idx].local_audio_url = local_audio_url;
    if (pdf) mydata.sections[idx].pdf_url = pdf;
    if (txt) mydata.sections[idx].txt_url = txt;
  }
  // Save updated mydata.json
  console.log('[importAll] Saving mydata.json:', mydata);
  await window.electronAPI.setMyData(mydata);
  document.getElementById('importStatus').innerText = 'Import complete!';
}

async function updateMyData() {
  const name = document.getElementById('massName').value;
  const cantor = document.getElementById('cantor').value;
  const ok = await window.electronAPI.updateMyData(name, cantor);
  document.getElementById('mydataStatus').innerText = ok ? 'Updated!' : 'Failed to update.';
}

window.selectFile = selectFile;
window.importAll = importAll;
window.updateMyData = updateMyData;

async function runScript(script) {
  document.getElementById('scriptStatus').innerText = '';
  document.getElementById('importStatus').innerText = '';
  document.getElementById('metadataStatus').innerText = '';
  document.getElementById('scriptStatus').innerText = `Running ${script}...`;
  const ok = await window.electronAPI.runScript(`tools/${script}`);
  document.getElementById('scriptStatus').innerText = ok ? `${script} finished!` : `${script} failed.`;
}
window.runScript = runScript;
