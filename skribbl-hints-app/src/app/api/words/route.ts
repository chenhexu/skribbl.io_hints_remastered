import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const CUSTOM_WORDS_FILE = path.join(process.cwd(), 'public', 'custom-words.json');
const ORIGINAL_WORDS_FILE = path.join(process.cwd(), 'public', 'words.json');

export async function GET() {
  try {
    const customWords = JSON.parse(fs.readFileSync(CUSTOM_WORDS_FILE, 'utf8'));
    return NextResponse.json(customWords);
  } catch (error) {
    return NextResponse.json([]);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { word } = await request.json();
    
    if (!word || typeof word !== 'string' || word.trim().length === 0) {
      return NextResponse.json({ error: 'Word is required' }, { status: 400 });
    }
    
    const trimmedWord = word.trim();
    
    // Read original words list
    let originalWords: string[] = [];
    try {
      originalWords = JSON.parse(fs.readFileSync(ORIGINAL_WORDS_FILE, 'utf8'));
    } catch (error) {
      originalWords = [];
    }
    
    // Read existing custom words
    let customWords: string[] = [];
    try {
      customWords = JSON.parse(fs.readFileSync(CUSTOM_WORDS_FILE, 'utf8'));
    } catch (error) {
      customWords = [];
    }
    
    // Check if word already exists in original list (case-insensitive)
    if (originalWords.some(w => w.toLowerCase() === trimmedWord.toLowerCase())) {
      return NextResponse.json({ error: 'Word already exists in original database' }, { status: 400 });
    }
    
    // Check if word already exists in custom words (case-insensitive)
    if (customWords.some(w => w.toLowerCase() === trimmedWord.toLowerCase())) {
      return NextResponse.json({ error: 'Word already exists in custom words' }, { status: 400 });
    }
    
    // Add the new word
    customWords.push(trimmedWord);
    customWords.sort(); // Keep it sorted alphabetically
    
    // Write back to file
    fs.writeFileSync(CUSTOM_WORDS_FILE, JSON.stringify(customWords, null, 2));
    
    return NextResponse.json({ success: true, word: trimmedWord });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to add word' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { word } = await request.json();
    
    if (!word || typeof word !== 'string' || word.trim().length === 0) {
      return NextResponse.json({ error: 'Word is required' }, { status: 400 });
    }
    
    const trimmedWord = word.trim();
    
    // Read existing custom words
    let customWords: string[] = [];
    try {
      customWords = JSON.parse(fs.readFileSync(CUSTOM_WORDS_FILE, 'utf8'));
    } catch (error) {
      return NextResponse.json({ error: 'Custom words file not found' }, { status: 404 });
    }
    
    // Find and remove the word (case-insensitive)
    const originalLength = customWords.length;
    customWords = customWords.filter(w => w.toLowerCase() !== trimmedWord.toLowerCase());
    
    if (customWords.length === originalLength) {
      return NextResponse.json({ error: 'Word not found in custom words' }, { status: 404 });
    }
    
    // Write back to file
    fs.writeFileSync(CUSTOM_WORDS_FILE, JSON.stringify(customWords, null, 2));
    
    return NextResponse.json({ success: true, word: trimmedWord });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete word' }, { status: 500 });
  }
}
