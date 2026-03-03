# Skribbl Auto Guesser – Chrome Extension

Chrome Web Store build of the Skribbl.io Auto Guesser (userscript). Runs only on `https://skribbl.io/*`.

- **Privacy:** [PRIVACY.md](PRIVACY.md) (also at repo root) — extension does not collect user data.
- **License:** [LICENSE](../LICENSE) (MIT).

## Development / load unpacked

1. Open `chrome://extensions/`.
2. Enable **Developer mode**.
3. Click **Load unpacked** and select this folder (`skribbl-auto-guesser-extension`).

## Icons (for Chrome Web Store)

The manifest has no `icons` entry so the extension loads unpacked without extra files. For store submission, add an `icons` folder and this to `manifest.json`:

```json
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
```

Use 16×16, 48×48, and 128×128 PNGs.

## Updating from the userscript

The script is generated from the userscript. To refresh:

1. Copy `skribbl-hints-app/public/userscripts/skribbl-auto-guesser.user.js` into this folder.
2. Remove the header (lines 1–8, from `// ==UserScript==` through `// ==/UserScript==`).
3. Save the rest as `content.js`.
4. Bump `version` in `manifest.json` to match the script version.

## Publishing to Chrome Web Store

1. Create a ZIP of this folder (contents only: `manifest.json`, `content.js`, `icons/`).
2. Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole).
3. **New item** → upload the ZIP → fill listing (description, screenshots, category) → submit.
