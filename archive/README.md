# Archive Folder - Obsolete Files (Scheduled for Deletion)

This folder contains files that are no longer actively used in the SEAS Choir project. They have been archived for a 2-week monitoring period before permanent deletion.

## Contents

### `file-upload-app/` (Entire Folder)
**Reason for Archive**: Legacy file upload server from old two-port architecture  
**Was Used For**: Separate backend server on port 3000  
**Why Obsolete**: Consolidated to single-port architecture with root `server.js`  
**Status**: ✅ Safe to delete after monitoring period

### `start_app.sh`
**Reason for Archive**: Shell script that started the file-upload-app server  
**Why Obsolete**: file-upload-app is no longer used; replaced by `run_script.sh`  
**Status**: ✅ Safe to delete after monitoring period

### `batchCleanLyrics.js`
**Reason for Archive**: Manual batch lyrics cleaning utility  
**Why Obsolete**: Text cleaning is now handled by `cleanTxtFile.js` (used by extraction script)  
**Kept Instead**: `buildAndMergePdfs.js` and `buildAndMergeTxtToPdf.js` (still referenced in run_script.sh)  
**Status**: ✅ Safe to delete after monitoring period

---

## Monitoring Period

**Date Archived**: January 20, 2026  
**Review Date**: ~February 3, 2026  

During this period, monitor your project for any issues or missing features. If everything works smoothly, these files can be permanently deleted.

## Restoration

If you need to restore any archived files:
```bash
# Example: Restore file-upload-app
mv archive/file-upload-app src/app/

# Example: Restore start_app.sh
mv archive/start_app.sh shell-scripts/
```

---

## Active Project Structure (Current)

After cleanup, your project structure is now much cleaner:

```
src/app/
├── index.html              (Public page)
├── lyrics-processor.html   (Admin panel)
├── myscript.js            (Auto-polling)
└── mystyle.css

src/scripts/
├── extractMetaFromSongTxt.js   (Active - auto-triggered)
├── cleanTxtFile.js             (Active - dependency)
├── buildAndMergePdfs.js        (Kept - referenced in run_script.sh)
└── buildAndMergeTxtToPdf.js    (Kept - referenced in run_script.sh)

shell-scripts/
├── run_script.sh    (Main automation)
└── show_tree.sh     (Utility)
```

---

**Next Steps After Monitoring Period**:
1. Delete this archive folder
2. Consider simplifying root `index.html` (it's just a redirect)
3. Review if `/config/moments_list.json` is actually used
