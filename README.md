# Skribbl.io Word List Database

A modern, feature-rich web application for searching and managing Skribbl.io word lists. Built with Next.js, React, and Tailwind CSS.

## Features

### 🔍 Advanced Search
- **Underscore Pattern Search**: Use `_` to represent unknown letters (e.g., `c__` finds "cat", "car", "cup")
- **Letter Count Search**: Multiple pattern formats supported:
  - `7` - Find 7-letter words
  - `5 6` - Find two-word phrases (5 letters + 6 letters)
  - `1-3` - Find hyphenated words (1 letter + hyphen + 3 letters)
  - `3e4` - Find words with 'e' at position 4 (3 letters + 'e' + 4 letters)
  - `3e` or `3ed` - Find words ending with specific letters
  - `tr3` - Find words starting with specific letters (e.g., "train")
  - `2r3e1` - Complex patterns with multiple letter positions
- **Fuzzy Search**: Find similar words even with misspellings
- **Semantic Search**: Toggle "Similar Words" to find contextually related words (e.g., search "country" to find "France", "Japan", etc.)
- **Two-Way Sync**: Letter pattern and underscore pattern inputs sync automatically

### ✨ User Experience
- **Click to Copy**: Click any word to copy it to clipboard with visual feedback
- **Alphabetical Sorting**: Results are always sorted alphabetically
- **Justified Layout**: Words are displayed in a clean, justified grid
- **Responsive Design**: Works on desktop and mobile devices

### 📝 Word Management
- **Add Custom Words**: Add your own words to the database
- **Delete Words**: Remove custom words with double-click confirmation
- **Duplicate Prevention**: Automatically prevents adding duplicate words
- **Persistent Storage**: Custom words are saved and persist across sessions

## Getting Started

### Prerequisites
- Node.js 18+ installed
- npm or yarn package manager

### Installation

1. Clone the repository:
```bash
git clone https://github.com/chenhexu/skribbl.io_hints_remastered.git
cd skribbl.io_hints_remastered
```

2. Navigate to the app directory:
```bash
cd skribbl-hints-app
```

3. Install dependencies:
```bash
npm install
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Usage Examples

### Pattern Search Examples
- `____` - Find all 4-letter words
- `c_t` - Find words like "cat", "cut", "cot"
- `5 2 3` - Find three-word phrases
- `t-5` - Find hyphenated words starting with 't'
- `3e` - Find 4-letter words ending with 'e'
- `tr3` - Find 5-letter words starting with 'tr' (like "train")

### Semantic Search
1. Type a category word (e.g., "country", "bird", "color")
2. Click the "Similar Words" button
3. See all related words from that category

## Tech Stack

- **Framework**: Next.js 15.5.4
- **UI Library**: React 19
- **Styling**: Tailwind CSS
- **Language**: TypeScript
- **API**: Next.js API Routes for word management

## Project Structure

```
skribbl-hints-app/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── words/
│   │   │       └── route.ts      # API endpoints for word management
│   │   ├── layout.tsx             # Root layout
│   │   └── page.tsx               # Main application component
│   └── types/
│       └── index.ts               # TypeScript type definitions
├── public/
│   ├── words.json                 # Original Skribbl.io word list
│   └── custom-words.json          # User-added custom words
└── package.json
```

## Contributing

Contributions are welcome! Feel free to submit issues or pull requests.

## License

MIT License - feel free to use this project for your own purposes.

## Acknowledgments

- Original Skribbl.io word list
- Built with modern web technologies for optimal performance

