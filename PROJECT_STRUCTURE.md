# Project Structure

This document describes the organization of the Skribbl Hints project.

## Root Level

- **skribbl-hints-app/** - Main Next.js web application
- **python-similarity-api/** - Python API server for word similarity matching
- **backups/** - Historical backup and data files (not committed to production)
- **tools/** - Utility scripts and data for maintenance tasks
- **LICENSE** - Project license
- **README.md** - Main project readme
- **.gitignore** - Git ignore rules
- **start-skribbl.bat** / **start-skribbl.ps1** - Project startup scripts

## Key Folders

### `skribbl-hints-app/public/`

- **words.json** - Main comprehensive word list (3712+ words)
- **custom-words.json** - Custom word additions
- **userscripts/** - Browser userscripts for Skribbl.io enhancement
- **scripts/** - Utility scripts for word processing

### `backups/`

Historical versions and backup files (not tracked in git, excluded via .gitignore):
- backup-page.txt
- words-backup.json (previous version)
- custom-words-backup.json

### `tools/`

Utility scripts and data for maintenance:
- **extract_words.py** - Python script to extract words from HTML and merge into words.json
- **newwordList.txt** - Raw HTML data containing word definitions

## Word List Management

### Current Word Count
- **3712 total words** in words.json

### Adding New Words

Use the extraction tool:
```bash
# 1. Place new word list in tools/newwordList.txt (HTML format with <div class="solution">word</div>)
# 2. Run the extraction script
python tools/extract_words.py

# 3. Commit and push
git add skribbl-hints-app/public/words.json
git commit -m "Add new words"
git push
```

## Gitignore Strategy

- ✅ Committed: Main app files, utility scripts (extract_words.py), source data
- ❌ Ignored: Backup files (backups/), large raw data files (tools/newwordList.txt)

This keeps the repository lean while preserving tools for future maintenance.
