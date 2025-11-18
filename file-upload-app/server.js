
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
    exec('node tools/extractMetaFromSongTxt.js', { cwd: __dirname + '/..' }, (error, stdout, stderr) => {
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

// Serve mass_info.json for mass section defaults
app.get('/mass_info.json', (req, res) => {
  const filePath = path.join(__dirname, '../mass_info.json');
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      return res.status(500).json({ error: 'Cannot read mass_info.json' });
    }
    res.type('application/json').send(data);
  });
});

// Save mass_info.json from frontend
app.post('/mass_info.json', (req, res) => {
  const filePath = path.join(__dirname, '../mass_info.json');
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
  const filePath = path.join(__dirname, '../moments.json');
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      return res.status(500).json({ error: 'Cannot read moments.json' });
    }
    res.type('application/json').send(data);
  });
});

// Serve moments_list.json for moment blocks
app.get('/moments_list.json', (req, res) => {
  const filePath = path.join(__dirname, '../moments_list.json');
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      return res.status(500).json({ error: 'Cannot read moments_list.json' });
    }
    res.type('application/json').send(data);
  });
});

// Serve cantors.json for cantor dropdown
app.get('/cantors.json', (req, res) => {
  const filePath = path.join(__dirname, '../cantors.json');
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

app.post('/upload', upload.fields([
  { name: 'mp3', maxCount: 1 },
  { name: 'pdf', maxCount: 1 },
  { name: 'txt', maxCount: 1 }
]), (req, res) => {
  const files = req.files;
  let result = {};
  let mp3Path = '', pdfPath = '', txtPath = '';
  ['mp3', 'pdf', 'txt'].forEach(type => {
    if (files && files[type]) {
      const file = files[type][0];
      const destDir = type === 'mp3' ? '../mp3s' : type === 'pdf' ? '../pdfs' : '../lyrics';
      const destPath = path.join(__dirname, destDir, file.originalname);
      fs.renameSync(file.path, destPath);
      // Save relative path only
      const relPath = path.relative(path.join(__dirname, '..'), destPath);
      result[type] = relPath;
      if (type === 'mp3') mp3Path = relPath;
      if (type === 'pdf') pdfPath = relPath;
      if (type === 'txt') txtPath = relPath;
    }
  });

  // Update moments.json with new file links and extract metadata from TXT
  const momentName = req.body.moment;
  const momentsFile = path.join(__dirname, '../moments.json');
  fs.readFile(momentsFile, 'utf8', (err, data) => {
    if (err) {
      // If error reading, just respond with upload result
      return res.json({ success: true, files: result, error: 'Could not update moments.json' });
    }
    let moments = [];
    try {
      moments = JSON.parse(data);
    } catch (parseErr) {
      return res.json({ success: true, files: result, error: 'Could not parse moments.json' });
    }
    // Extract metadata from TXT file if uploaded
    let meta = {};
    if (txtPath) {
      try {
        const txtFullPath = path.join(__dirname, '..', txtPath);
        if (fs.existsSync(txtFullPath)) {
          const lines = fs.readFileSync(txtFullPath, 'utf8').split(/\r?\n/);
          let currentSection = null;
          let buffer = [];
          let foundTitle = false, foundAuthor = false;
          let snippetSections = {};
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            const sectionMatch = line.match(/^\[(.+?)\]$/);
            if (sectionMatch) {
              if (currentSection && buffer.length) {
                const content = buffer.join(' ').trim();
                if (currentSection === 'Title' && !foundTitle) {
                  meta.title = content;
                  foundTitle = true;
                } else if (currentSection === 'Author' && !foundAuthor) {
                  meta.author = content;
                  foundAuthor = true;
                } else if (["Response","Refrain","Acclamation","Verse","Verse 1"].includes(currentSection)) {
                  snippetSections[currentSection] = content;
                }
              }
              currentSection = sectionMatch[1];
              buffer = [];
            } else if (currentSection) {
              buffer.push(line);
            }
          }
          if (currentSection && buffer.length) {
            const content = buffer.join(' ').trim();
            if (currentSection === 'Title' && !foundTitle) {
              meta.title = content;
            } else if (currentSection === 'Author' && !foundAuthor) {
              meta.author = content;
            } else if (["Response","Refrain","Acclamation","Verse","Verse 1"].includes(currentSection)) {
              snippetSections[currentSection] = content;
            }
          }
          meta.snippet = snippetSections['Response'] || snippetSections['Refrain'] || snippetSections['Acclamation'] || snippetSections['Verse 1'] || snippetSections['Verse'] || '';
        }
      } catch (e) {
        // Ignore extraction errors
      }
    }
    // Find the moment and update file links and metadata
    let updated = false;
    for (let m of moments) {
      if (m.moment === momentName) {
        if (mp3Path) m.mp3 = mp3Path;
        if (pdfPath) m.pdf = pdfPath;
        if (txtPath) {
          m.lyrics = txtPath;
          m.title = meta.title || '';
          m.author = meta.author || '';
          m.snippet = meta.snippet || '';
        }
        updated = true;
      }
    }
    if (updated) {
      fs.writeFile(momentsFile, JSON.stringify(moments, null, 2), err2 => {
        if (err2) {
          return res.json({ success: true, files: result, error: 'Could not write moments.json' });
        }
        res.json({ success: true, files: result });
      });
    } else {
      res.json({ success: true, files: result, error: 'Moment not found in moments.json' });
    }
  });
});

app.listen(PORT, () => {
  console.log(`File upload app running at http://localhost:${PORT}`);
});
