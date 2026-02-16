# Project Cleanup - Verification Checklist

## ✅ Cleanup Operations Completed

- [x] Created `/archive/` folder
- [x] Moved `src/app/file-upload-app/` → `/archive/file-upload-app/`
- [x] Moved `shell-scripts/start_app.sh` → `/archive/start_app.sh`
- [x] Moved `src/scripts/batchCleanLyrics.js` → `/archive/batchCleanLyrics.js`
- [x] Created `/archive/README.md` (documentation for archive)
- [x] Created `CLEANUP_SUMMARY.md` (summary of cleanup)

---

## ✅ Kept Files (Still in Use)

### Scripts Referenced in `run_script.sh`

- [x] `src/scripts/extractMetaFromSongTxt.js` - Menu option 2
- [x] `src/scripts/buildAndMergePdfs.js` - Menu option 3
- [x] `src/scripts/buildAndMergeTxtToPdf.js` - Menu option 4
- [x] `src/scripts/cleanTxtFile.js` - Dependency for metadata extraction

### Active Application Files

- [x] `server.js` - Main Express server
- [x] `src/app/index.html` - Public display page
- [x] `src/app/lyrics-processor.html` - Admin panel
- [x] `src/app/myscript.js` - Auto-polling client
- [x] `src/app/mystyle.css` - Styling
- [x] `shell-scripts/run_script.sh` - Main automation script
- [x] `shell-scripts/show_tree.sh` - Utility script

---

## 📊 Archive Contents

Location: `/archive/`  
Total Size: 92 KB

```
archive/
├── README.md                  (Why items are archived)
├── batchCleanLyrics.js
├── file-upload-app/           (entire legacy app)
└── start_app.sh
```

---

## 🔄 How to Restore (if needed)

```bash
# Restore single file:
mv archive/batchCleanLyrics.js src/scripts/

# Restore entire folder:
mv archive/file-upload-app src/app/

# Restore shell script:
mv archive/start_app.sh shell-scripts/
```

---

## 📋 Monitoring Checklist (Next 2 Weeks)

### Daily/Weekly Checks

- [ ] Server starts correctly: `npm start`
- [ ] Public page loads at `http://127.0.0.1:3000`
- [ ] Admin panel loads at `http://127.0.0.1:3000/lyrics-processor`
- [ ] Auto-polling updates display (30-second refresh)
- [ ] Admin can update moments
- [ ] Metadata extraction runs automatically on save
- [ ] Old files are deleted when songs are updated
- [ ] PDF generation works (run_script.sh options 3 & 4)

---

## ⏰ Final Cleanup Schedule

- **Today** (Jan 20): Archive obsolete files ✅
- **Monitor Period**: Jan 20 - Feb 3 (2 weeks)
- **After Review**: Safe to delete `/archive/` folder permanently

---

**Status**: ✅ CLEANUP COMPLETE - Ready for monitoring period
