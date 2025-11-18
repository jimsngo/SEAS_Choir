// IMPORTANT: require('electron') must be placed BEFORE any ipcMain.handle calls!
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');

// Copy MP3 to mp3s folder and return local path
ipcMain.handle('copy-mp3-to-mp3s', async (event, { mp3Path }) => {
  const mp3sDir = path.resolve(__dirname, '..', 'mp3s');
  if (!fs.existsSync(mp3sDir)) fs.mkdirSync(mp3sDir);
  const mp3Base = path.basename(mp3Path);
  const destPath = path.join(mp3sDir, mp3Base);
  try {
    if (mp3Path !== destPath) {
      fs.copyFileSync(mp3Path, destPath);
    }
    return `mp3s/${mp3Base}`;
  } catch (err) {
    console.error('Failed to copy mp3:', err);
    return '';
  }
});
/**
 * SEAS Choir Electron Main Process
 * ---------------------------------
 * Purpose: This is the main backend script for the SEAS Choir workflow app.
 * It manages window creation, IPC communication, and all backend automation tasks.
 *
 * Key Functions:
 * - Loads and previews HTML UI (preview.html) from the project root.
 * - Handles file selection, copying, and metadata extraction for choir moments.
 * - Aggregates and updates metadata in mydata.json (project root).
 * - Serves cantors list from tools/cantors.json.
 * - Provides current files for each moment from moments/[moment]/ subfolders.
 * - Runs automation scripts in the tools/ directory.
 * - Serves mydata.json and moments_list.json to the renderer via IPC.
 *
 * Source Files:
 * - preview.html (project root): Main UI for previewing and automation.
 * - tools/renderer.js: Renderer logic for UI and automation.
 * - mydata.json (project root): Aggregated metadata for all moments.
 * - moments_list.json (project root): Ordered list of liturgical moments.
 * - tools/cantors.json: List of cantors for selection.
 * - moments/[moment]/: Subfolders containing .mp3, .pdf, .txt files for each moment.
 *
 * Destination Files:
 * - mydata.json: Updated by metadata extraction and import scripts.
 * - moments/[moment]/: Files may be copied here by import automation.
 *
 * All file paths are resolved relative to __dirname (tools/), with project root as '..'.
 *
 * If you encounter file referencing issues, check:
 * - Path resolution (use path.join or path.resolve)
 * - Whether the file is in the project root or tools/
 * - Electron's file protocol vs browser fetch
 */

// Remove stray opening brace and ensure all blocks are closed properly
// Clean, beautified, and deduplicated main.js
// IMPORTANT: require('electron') must be placed BEFORE any ipcMain.handle calls!
// const { app, BrowserWindow, ipcMain, dialog } = require('electron');
// ========== WINDOW CREATION & PREVIEW ========== //

// Serve mydata.json and moments_list.json to renderer via IPC
ipcMain.handle('get-mydata-json', async () => {
  const mydataPath = path.resolve(__dirname, '..', 'mydata.json');
  if (!fs.existsSync(mydataPath)) return {};
  return JSON.parse(fs.readFileSync(mydataPath, 'utf8'));
});

ipcMain.handle('get-moments-list-json', async () => {
  const momentsListPath = path.resolve(__dirname, '..', 'moments_list.json');
  if (!fs.existsSync(momentsListPath)) return [];
  return JSON.parse(fs.readFileSync(momentsListPath, 'utf8'));
});
// Save mydata.json (set-mydata) with debug logging
ipcMain.handle('set-mydata', async (event, newData) => {
  const mydataPath = path.resolve(__dirname, '..', 'mydata.json');
  console.log('[set-mydata] Writing to', mydataPath);
  try {
    fs.writeFileSync(mydataPath, JSON.stringify(newData, null, 2), 'utf8');
    console.log('[set-mydata] Write successful');
    return true;
  } catch (err) {
    console.error('[set-mydata] Failed to write mydata.json:', err);
    return false;
  }
});

// Preview HTML in a new window
ipcMain.handle('preview-html', async (event, { htmlPath }) => {
  // Loads any HTML file (preview.html or index.html) from project root for previewing the UI
  const previewWin = new BrowserWindow({
    width: 900,
    height: 1000,
    icon: path.join(__dirname, '../images/SEAS.jpg'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });
  // Always resolve relative to the tools directory
  const absPath = path.join(__dirname, '../', htmlPath);
  previewWin.loadFile(absPath);
});

// ========== IPC HANDLERS ==========
// ========== DATA & METADATA HANDLERS ========== //

// Cantors list from cantors.json
ipcMain.handle('get-cantors', async () => {
// Returns list of cantors from tools/cantors.json
  const cantorsPath = path.join(__dirname, 'cantors.json');
  if (!fs.existsSync(cantorsPath)) return [];
  return JSON.parse(fs.readFileSync(cantorsPath, 'utf8'));
});

// Mass Name and Cantor from mydata.json
ipcMain.handle('get-mydata', async () => {
// Returns mass name and cantor from mydata.json (project root)
  const mydataPath = path.resolve(__dirname, '..', 'mydata.json');
  if (!fs.existsSync(mydataPath)) return { name: '', cantor: '' };
    const data = JSON.parse(fs.readFileSync(mydataPath, 'utf8'));
  return { name: data.name || '', cantor: data.cantor || '' };
});

// Current files for each moment
ipcMain.handle('get-current-files', async () => {
// Returns current .mp3, .pdf, .txt files for each moment from moments/[moment]/ subfolders
// Returns full mydata.json contents for renderer (used for preview and automation)
// Returns moments_list.json contents for renderer (ordered list of moments)
  const mp3sDir = path.resolve(__dirname, '..', 'mp3s');
  const moments = [
    '1_entrance_antiphon',
    '2_responsorial_psalm',
    '3_gospel_acclamation',
    '4_offertory',
    '5_communion_antiphon',
    '6_communion',
    '7_meditation',
    '8_recessional',
    'Amen',
    'Glory_to_God',
    'Holy',
    'Lamb_of_God',
    'Lord_Have_Mercy',
    'When_We_Eat_This_Bread',
  ];
  const result = {};
  const mp3Files = fs.existsSync(mp3sDir) ? fs.readdirSync(mp3sDir).filter(f => f.toLowerCase().endsWith('.mp3')) : [];
  for (const moment of moments) {
    // Get the MP3 field from mydata.json if available
    let mp3Field = '';
    try {
      const mydataPath = path.resolve(__dirname, '..', 'mydata.json');
      if (fs.existsSync(mydataPath)) {
        const mydata = JSON.parse(fs.readFileSync(mydataPath, 'utf8'));
        const section = (mydata.sections || []).find(s => (s.moment || '').replace(/\s+/g, '_').toLowerCase() === moment.toLowerCase());
        if (section && section.audio_url) mp3Field = section.audio_url;
      }
    } catch (e) {}
    let mp3Base = mp3Field ? path.basename(mp3Field) : '';
    let mp3 = '';
    if (mp3Base && mp3Files.includes(mp3Base)) {
      mp3 = mp3Base;
    } else {
      if (mp3Base) {
        console.warn(`[get-current-files] MP3 basename '${mp3Base}' not found in mp3s folder for moment '${moment}'. Falling back to first mp3.`);
      }
      if (mp3Files.length > 0) mp3 = mp3Files[0];
    }
    result[moment] = {
      mp3: mp3 ? path.join(mp3sDir, mp3) : '',
      pdf: '',
      txt: '',
    };
  }
  return result;
});

// Run a script (Node.js)
ipcMain.handle('run-script', async (event, script) => {
  return new Promise((resolve) => {
    const scriptPath = path.join(__dirname, '../', script);
    exec(`node "${scriptPath}"`, { cwd: path.join(__dirname, '../..') }, (err, stdout, stderr) => {
      if (stdout) console.log(`[run-script stdout] ${stdout}`);
      if (stderr) console.error(`[run-script stderr] ${stderr}`);
      resolve(!err);
    });
  });
});

// File dialog
ipcMain.handle('select-file', async (event, { filters }) => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters,
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths[0];
});

// Git add, commit, and push
ipcMain.handle('git-push', async () => {
  return new Promise((resolve) => {
    const repoDir = path.join(__dirname, '../..');
    exec('git add . && git commit -m "Weekly update" && git push', { cwd: repoDir }, (err) => {
      resolve(!err);
    });
  });
});

// Copy files to a moment directory
ipcMain.handle('copy-files', async (event, { moment, files }) => {
  // Use project-relative path: tools/../moments = /Users/jim/SEAS_Choir/moments
  const mp3sDir = path.resolve(__dirname, '..', 'mp3s');
  if (!fs.existsSync(mp3sDir)) fs.mkdirSync(mp3sDir);
  for (const { type, filePath } of files) {
    if (type !== 'mp3') continue; // Only copy mp3 files
    if (filePath) {
      const dest = path.join(mp3sDir, path.basename(filePath));
      try {
        // Check if file is available locally
        fs.statSync(filePath);
      } catch (statErr) {
        console.warn(`[copy-files] File not available locally: ${filePath}`);
        continue;
      }
      console.log(`[copy-files] Copying ${filePath} -> ${dest}`);
      try {
        fs.copyFileSync(filePath, dest);
        console.log(`[copy-files] Success: ${filePath} -> ${dest}`);
         // Update local_audio_url in mydata.json
         const mydataPath = path.resolve(__dirname, '..', 'mydata.json');
         const momentsListPath = path.resolve(__dirname, '..', 'moments_list.json');
         let canonicalMoment = moment;
         if (fs.existsSync(momentsListPath)) {
           const momentsList = JSON.parse(fs.readFileSync(momentsListPath, 'utf8'));
           const idx = [
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
           ].indexOf(moment);
           if (idx >= 0 && momentsList[idx]) canonicalMoment = momentsList[idx];
         }
         if (fs.existsSync(mydataPath)) {
           const mydata = JSON.parse(fs.readFileSync(mydataPath, 'utf8'));
           if (Array.isArray(mydata.sections)) {
             for (const section of mydata.sections) {
               if ((section.moment || '').toLowerCase() === canonicalMoment.toLowerCase()) {
                 section.local_audio_url = `mp3s/${path.basename(filePath)}`;
               }
             }
             fs.writeFileSync(mydataPath, JSON.stringify(mydata, null, 2), 'utf8');
             console.log(`[copy-files] Updated local_audio_url for moment '${canonicalMoment}' in mydata.json.`);
           }
         }
      } catch (err) {
        console.error(`[copy-files] Failed: ${filePath} -> ${dest}`, err);
      }
    }
  }
  return true;
});

// Update mydata.json
ipcMain.handle('update-mydata', async (event, { name, cantor }) => {
  const mydataPath = path.resolve(__dirname, '..', 'mydata.json');
  if (!fs.existsSync(mydataPath)) return false;
  const data = JSON.parse(fs.readFileSync(mydataPath, 'utf8'));
  if (name) data.name = name;
  if (cantor) data.cantor = cantor;
  fs.writeFileSync(mydataPath, JSON.stringify(data, null, 2));
  return true;
});

// ========== WINDOW CREATION ==========


function createWindow() {
  const win = new BrowserWindow({
    width: 700,
    height: 800,
    icon: path.join(__dirname, '../images/SEAS.jpg'), // App window icon
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  win.loadFile(path.join(__dirname, '../preview.html'));
}


app.whenReady().then(createWindow);

// Ensure app quits cleanly on all platforms
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
