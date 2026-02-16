const express = require('express');
const fileUpload = require('express-fileupload');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');

const app = express();
const PORT = 3000;

// 1. SETUP PATHS
const DATA_DIR = path.join(__dirname, 'src', 'data');
const MOMENTS_DIR = path.join(DATA_DIR, 'Moments');
const CONFIG_DIR = path.join(__dirname, 'config');
const MOMENTS_JSON_PATH = path.join(CONFIG_DIR, 'moments.json');

// Ensure the Moments folder exists
if (!fs.existsSync(MOMENTS_DIR)) {
    fs.mkdirSync(MOMENTS_DIR, { recursive: true });
}

// 2. MIDDLEWARE
app.use(express.json());
app.use(fileUpload());

// 3. STATIC SERVING & ROUTES

// Main Choir View (Root)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Admin/Server Manager View
app.get('/server', (req, res) => {
    // Note: Kept in src/app if you haven't moved server.html yet
    const serverPath = path.join(__dirname, 'src', 'app', 'server.html');
    res.sendFile(serverPath);
});

// Serve assets and configuration folders explicitly
app.use('/config', express.static(CONFIG_DIR));
app.use('/src', express.static(path.join(__dirname, 'src')));
app.use('/output', express.static(path.join(__dirname, 'output')));

// Serve root-level files (myscript.js, mystyle.css, etc.)
app.use(express.static(__dirname));


// --- 4. API ROUTES ---

// Get moments data
app.get('/api/moments', (req, res) => {
    if (fs.existsSync(MOMENTS_JSON_PATH)) {
        const data = JSON.parse(fs.readFileSync(MOMENTS_JSON_PATH, 'utf8'));
        res.json(data);
    } else {
        res.status(404).json({ error: "moments.json not found" });
    }
});

// Update moments.json manually
app.post('/api/moments', (req, res) => {
    fs.writeFileSync(MOMENTS_JSON_PATH, JSON.stringify(req.body, null, 4));
    res.json({ success: true });
});

// Upload Files with Auto-Metadata Sync
app.post('/upload', (req, res) => {
    const { momentName } = req.body;
    
    if (!momentName) {
        console.error("🚨 Error: No momentName received.");
        return res.status(400).json({ error: "Missing moment name." });
    }

    const uploadedFile = req.files.file;
    const ext = path.extname(uploadedFile.name).toLowerCase();
    const targetDir = path.join(MOMENTS_DIR, momentName);

    if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
    }

    const uploadPath = path.join(targetDir, uploadedFile.name);

    uploadedFile.mv(uploadPath, (err) => {
        if (err) {
            console.error(`❌ [${momentName}] Upload Failed:`, err);
            return res.status(500).send(err);
        }

        console.log(`✅ [${momentName}] Saved: ${uploadedFile.name}`);

        // Cleanup: Only keep 1 file per extension per moment
        const files = fs.readdirSync(targetDir);
        files.forEach(file => {
            if (path.extname(file).toLowerCase() === ext && file !== uploadedFile.name) {
                fs.unlinkSync(path.join(targetDir, file));
                console.log(`🗑️ Replaced old ${ext}`);
            }
        });

        // Trigger Metadata Extraction script if a TXT file is uploaded
        if (ext === '.txt') {
            console.log(`📑 [${momentName}] Running Metadata Script...`);
            exec('node src/scripts/extractMetaFromSongTxt.js', (error, stdout, stderr) => {
                if (error) {
                    console.error(`🚨 Script Error: ${error.message}`);
                    return;
                }
                console.log(`✅ Metadata Sync Complete: ${stdout.trim()}`);
            });
        }

        const relativePath = `src/data/Moments/${momentName}/${uploadedFile.name}`;
        res.json({ success: true, path: relativePath });
    });
});

app.listen(PORT, () => {
    console.log(`
    ╔════════════════════════════════════════════╗
    ║      SEAS Choir Server (Root Active)       ║
    ║                                            ║
    ║   View Site:    http://localhost:${PORT}/      ║
    ║   Admin Panel:  http://localhost:${PORT}/server  ║
    ╚════════════════════════════════════════════╝
    `);
});