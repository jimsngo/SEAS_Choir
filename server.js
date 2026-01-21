const express = require('express');
const path = require('path');
const fs = require('fs');
const bodyParser = require('body-parser');
const multer = require('multer');
const { exec } = require('child_process');

const app = express();
const PORT = 3000;

// Configure multer for file uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      // Determine destination based on file extension
      let dest = path.join(__dirname, 'src/data');
      if (file.originalname.endsWith('.txt')) {
        dest = path.join(__dirname, 'src/data/lyrics');
      } else if (file.originalname.endsWith('.pdf')) {
        dest = path.join(__dirname, 'src/data/pdfs');
      } else if (file.originalname.endsWith('.mp3')) {
        dest = path.join(__dirname, 'src/data/mp3s');
      }
      // Create directory if it doesn't exist
      if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
      }
      cb(null, dest);
    },
    filename: (req, file, cb) => {
      // Keep original filename
      cb(null, file.originalname);
    }
  }),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Enable CORS for Live Server on port 5500
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'http://127.0.0.1:5500');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Serve static files from src/app
app.use(express.static(path.join(__dirname, 'src/app')));

// Serve data files (lyrics, mp3s, pdfs, images)
app.use('/src/data', express.static(path.join(__dirname, 'src/data')));

// Serve output files (PDFs)
app.use('/output', express.static(path.join(__dirname, 'output')));

// Serve documentation files
app.use('/docs', express.static(path.join(__dirname, 'docs')));

// ==========================================
// FILE UPLOAD ENDPOINT
// ==========================================

app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  res.json({
    success: true,
    filename: req.file.originalname,
    path: req.file.path,
    size: req.file.size
  });
});

// ==========================================
// API ENDPOINTS
// ==========================================

// GET mass_info.json
app.get('/config/mass_info.json', (req, res) => {
  const filePath = path.join(__dirname, 'config', 'mass_info.json');
  try {
    // Disable caching for config files
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    const data = fs.readFileSync(filePath, 'utf8');
    res.json(JSON.parse(data));
  } catch (error) {
    console.error('Error reading mass_info.json:', error);
    res.status(500).json({ error: 'Failed to read mass info' });
  }
});

// POST mass_info.json (save updates)
app.post('/config/mass_info.json', (req, res) => {
  const filePath = path.join(__dirname, 'config', 'mass_info.json');
  try {
    const data = req.body;
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    res.json({ success: true, message: 'Mass info saved' });
  } catch (error) {
    console.error('Error writing mass_info.json:', error);
    res.status(500).json({ error: 'Failed to save mass info' });
  }
});

// GET moments.json
app.get('/config/moments.json', (req, res) => {
  const filePath = path.join(__dirname, 'config', 'moments.json');
  try {
    // Disable caching for config files
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    const data = fs.readFileSync(filePath, 'utf8');
    res.json(JSON.parse(data));
  } catch (error) {
    console.error('Error reading moments.json:', error);
    res.status(500).json({ error: 'Failed to read moments' });
  }
});

// DELETE file endpoint
app.post('/delete-file', (req, res) => {
  const { filePath } = req.body;
  if (!filePath) {
    return res.status(400).json({ error: 'No file path provided' });
  }

  try {
    const fullPath = path.join(__dirname, filePath);
    // Security: Make sure the path is within our data directory
    const dataDir = path.join(__dirname, 'src/data');
    if (!fullPath.startsWith(dataDir)) {
      return res.status(403).json({ error: 'Invalid file path' });
    }

    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      console.log(`Deleted file: ${filePath}`);
      res.json({ success: true, message: 'File deleted' });
    } else {
      res.json({ success: true, message: 'File not found' });
    }
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

// POST moments.json (save updates)
app.post('/config/moments.json', (req, res) => {
  const filePath = path.join(__dirname, 'config', 'moments.json');
  try {
    const data = req.body;
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    
    // Auto-run extraction script to update metadata from text files
    exec('node src/scripts/extractMetaFromSongTxt.js', { cwd: __dirname }, (error, stdout, stderr) => {
      if (error) {
        console.error('Metadata extraction error:', stderr || error.message);
      } else {
        console.log('Metadata extraction completed');
      }
    });
    
    res.json({ success: true, message: 'Moments saved' });
  } catch (error) {
    console.error('Error writing moments.json:', error);
    res.status(500).json({ error: 'Failed to save moments' });
  }
});

// GET cantors.json
app.get('/config/cantors.json', (req, res) => {
  const filePath = path.join(__dirname, 'config', 'cantors.json');
  try {
    // Disable caching for config files
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    const data = fs.readFileSync(filePath, 'utf8');
    res.json(JSON.parse(data));
  } catch (error) {
    console.error('Error reading cantors.json:', error);
    res.status(500).json({ error: 'Failed to read cantors' });
  }
});

// Serve client.html as default
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'src/app', 'client.html'));
});

// Serve server.html admin panel
app.get('/server', (req, res) => {
  res.sendFile(path.join(__dirname, 'src/app', 'server.html'));
});

// ==========================================
// START SERVER
// ==========================================

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║  SEAS Choir Server Started             ║
║  Port: ${PORT}                            ║
║  Public Page: http://localhost:${PORT}     ║
║  Admin Panel: http://localhost:${PORT}/server ║
║  Press Ctrl+C to stop                  ║
╚════════════════════════════════════════╝
  `);
});
