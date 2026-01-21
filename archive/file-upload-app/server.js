
// ...existing code...

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;
app.use(express.json());

// Automation endpoint for frontend task buttons
const { exec } = require('child_process');
app.post('/run-automation', (req, res) => {
  const { task } = req.body || {};
  if (task === 'extract-metadata') {
    exec('node extractMetaFromSongTxt.js', { cwd: __dirname + '/..' }, (error, stdout, stderr) => {
      if (error) {
        return res.json({ success: false, message: 'Metadata extraction failed.', error: stderr || error.message });
      }
      res.json({ success: true, message: 'Metadata extraction completed successfully.', output: stdout });
    });
    return;
  }
  let message = '';
  switch (task) {
    case 'generate-music-pdf':
      message = 'Music PDF generation started (placeholder).';
      break;
    case 'generate-lyrics-pdf':
      message = 'Lyrics PDF generation started (placeholder).';
      break;
    case 'push-github':
      message = 'Push to GitHub started (placeholder).';
      break;
    default:
      message = 'Unknown automation task.';
  }
  res.json({ message });
});



// Serve static files from public directory (for /app.html and assets)
app.use(express.static(path.join(__dirname, 'public')));
// Also serve static files from the project root
app.use(express.static(path.join(__dirname, '..')));

// Serve app.html as the default page for '/'
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'app.html'));
});

// Serve mass_info.json for mass section defaults
app.get('/mass_info.json', (req, res) => {
  const filePath = path.join(__dirname, '../../../config/mass_info.json');
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      return res.status(500).json({ error: 'Cannot read mass_info.json' });
    }
    res.type('application/json').send(data);
  });
});

// Save mass_info.json from frontend
app.post('/mass_info.json', (req, res) => {
  const filePath = path.join(__dirname, '../../../config/mass_info.json');
  const newMassInfo = req.body;
  // Basic validation: must be an object with required fields
  if (!newMassInfo || typeof newMassInfo !== 'object' || !newMassInfo.mass_name || !newMassInfo.date || !newMassInfo.time || !newMassInfo.cantor) {
    return res.status(400).json({ error: 'Invalid mass info data' });
  }
  fs.writeFile(filePath, JSON.stringify(newMassInfo, null, 2), 'utf8', err => {
    if (err) {
      return res.status(500).json({ error: 'Failed to save mass_info.json' });
    }
    res.json({ success: true });
  });
});

// Serve moments.json for frontend moment metadata
app.get('/moments.json', (req, res) => {
  const filePath = path.join(__dirname, '../../../config/moments.json');
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      return res.status(500).json({ error: 'Cannot read moments.json' });
    }
    res.type('application/json').send(data);
  });
});

// Serve moments_list.json for moment blocks
app.get('/moments_list.json', (req, res) => {
  const filePath = path.join(__dirname, '../../../config/moments_list.json');
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      return res.status(500).json({ error: 'Cannot read moments_list.json' });
    }
    res.type('application/json').send(data);
  });
});

// Serve cantors.json for cantor dropdown
app.get('/cantors.json', (req, res) => {
  const filePath = path.join(__dirname, '../../../config/cantors.json');
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      return res.status(500).json({ error: 'Cannot read cantors.json' });
    }
    res.type('application/json').send(data);
  });
});

// Catch-all error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ success: false, error: 'Internal server error', details: err.message });
});



// Set up Multer for file uploads
const upload = multer({ dest: 'uploads/' });

// Handle uploads for mp3, pdf, and txt, save to correct folders, and update moments.json
app.post('/upload', upload.fields([
  { name: 'mp3', maxCount: 1 },
  { name: 'pdf', maxCount: 1 },
  { name: 'text', maxCount: 1 }
]), (req, res) => {
  // momentObj is defined after moments are loaded, so move this block after that
  const files = req.files;
  const momentName = req.body.moment;
  const momentsFile = path.join(__dirname, '../../../config/moments.json');
  let moments = [];
  if (fs.existsSync(momentsFile)) {
    try {
      moments = JSON.parse(fs.readFileSync(momentsFile, 'utf8'));
    } catch (e) { moments = []; }
  }
  const momentObj = moments.find(m => m.moment === momentName);
  if (!momentObj) {
    return res.status(400).json({ success: false, error: 'Moment not found' });
  }
  // MP3
  if (files && files['mp3']) {
    // Delete old mp3 if it exists
    if (momentObj.mp3) {
      const oldMp3Path = path.join(__dirname, '../../../', momentObj.mp3);
      if (fs.existsSync(oldMp3Path)) {
        try { fs.unlinkSync(oldMp3Path); } catch (e) { /* ignore */ }
      }
    }
    const file = files['mp3'][0];
    const destDir = path.join(__dirname, '../../../src/data/mp3s');
    if (!fs.existsSync(destDir)) fs.mkdirSync(destDir);
    const destPath = path.join(destDir, file.originalname);
    fs.renameSync(file.path, destPath);
    momentObj.mp3 = path.relative(path.join(__dirname, '../../../'), destPath);
    if ('external_mp3' in momentObj) delete momentObj.external_mp3;
  }
  // PDF
  if (files && files['pdf']) {
    // Delete old pdf if it exists
    if (momentObj.pdf) {
      const oldPdfPath = path.join(__dirname, '../../../', momentObj.pdf);
      if (fs.existsSync(oldPdfPath)) {
        try { fs.unlinkSync(oldPdfPath); } catch (e) { /* ignore */ }
      }
    }
    const file = files['pdf'][0];
    const destDir = path.join(__dirname, '../../../src/data/pdfs');
    if (!fs.existsSync(destDir)) fs.mkdirSync(destDir);
    const destPath = path.join(destDir, file.originalname);
    fs.renameSync(file.path, destPath);
    momentObj.pdf = path.relative(path.join(__dirname, '../../../'), destPath);
    if ('external_pdf' in momentObj) delete momentObj.external_pdf;
  }
  // TXT
  let extractionOutput = '';
  if (files && files['text']) {
    // Delete old txt if it exists
    if (momentObj.txt) {
      const oldTxtPath = path.join(__dirname, '../../../', momentObj.txt);
      if (fs.existsSync(oldTxtPath)) {
        try { fs.unlinkSync(oldTxtPath); } catch (e) { /* ignore */ }
      }
    }
    const file = files['text'][0];
    const destDir = path.join(__dirname, '../../../src/data/lyrics');
    if (!fs.existsSync(destDir)) fs.mkdirSync(destDir);
    const destPath = path.join(destDir, file.originalname);
    // Read uploaded file, clean, and write only cleaned version
    const { cleanText } = require('../../../src/scripts/cleanTxtFile');
    const rawTxt = fs.readFileSync(file.path, 'utf8');
    const cleanedTxt = cleanText(rawTxt);
    fs.writeFileSync(destPath, cleanedTxt, { encoding: 'utf8' });
    fs.unlinkSync(file.path); // Remove temp upload
    momentObj.txt = path.relative(path.join(__dirname, '../../../'), destPath);
    if ('external_text' in momentObj) delete momentObj.external_text;
    // Run metadata extraction synchronously and capture output
    try {
      const execSync = require('child_process').execSync;
      const scriptPath = path.join(__dirname, '../../../src/scripts/extractMetaFromSongTxt.js');
      extractionOutput = execSync(`node ${scriptPath}`, { cwd: path.join(__dirname, '../../../'), encoding: 'utf8' });
    } catch (err) {
      extractionOutput = (err.stdout ? err.stdout.toString() : '') +
                        (err.stderr ? err.stderr.toString() : '') +
                        (err.message ? err.message : '');
      // Respond immediately with error if extraction fails
      fs.writeFileSync(momentsFile, JSON.stringify(moments, null, 2));
      return res.status(500).json({ success: false, error: 'Metadata extraction failed', extractionOutput });
    }
  }
  // Remove old fields if present
  if ('lyrics' in momentObj) delete momentObj.lyrics;
  fs.writeFileSync(momentsFile, JSON.stringify(moments, null, 2));
  res.json({ success: true, extractionOutput });
});

app.listen(PORT, () => {
  console.log(`File upload app running at http://localhost:${PORT}`);
});
