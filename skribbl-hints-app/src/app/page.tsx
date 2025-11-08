'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { WordsDatabase } from '@/types';

export default function Home() {
  const [wordsData, setWordsData] = useState<WordsDatabase>([]);
  const [customWords, setCustomWords] = useState<WordsDatabase>([]);
  const [searchPattern, setSearchPattern] = useState('');
  const [newWord, setNewWord] = useState('');
  const [loading, setLoading] = useState(true);
  const [addingWord, setAddingWord] = useState(false);
  const [message, setMessage] = useState('');
  const [copiedWord, setCopiedWord] = useState<string | null>(null);
  const [showSimilar, setShowSimilar] = useState(false);
  const [semanticResults, setSemanticResults] = useState<string[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [letterPattern, setLetterPattern] = useState('');
  const lastEditedRef = useRef<'search' | 'letter' | null>(null);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [wordAction, setWordAction] = useState<'add' | 'delete' | null>(null);
  const [deleteClickCount, setDeleteClickCount] = useState(0);
  const deleteTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const loadWords = async () => {
      try {
        // Load both original words and custom words
        const [originalResponse, customResponse] = await Promise.all([
          fetch('/words.json'),
          fetch('/api/words')
        ]);
        
        const originalData = await originalResponse.json();
        const customData = await customResponse.json();
        
        setWordsData(originalData);
        setCustomWords(customData);
      } catch (error) {
        console.error('Error loading words data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadWords();
  }, []);

  // Helper functions for conversion
  const convertToLetterPattern = (p: string): string => {
    const cleaned = p.replace(/['".,!?()]/g, '');
    
    if (cleaned.includes(' ')) {
      const words = cleaned.split(' ');
      const letterCounts = words.map(word => {
        const underscoreCount = (word.match(/_/g) || []).length;
        const letterCount = (word.match(/[a-z]/gi) || []).length;
        return underscoreCount + letterCount;
      });
      return letterCounts.join(' ');
    }
    
    if (cleaned.includes('-')) {
      const parts = cleaned.split('-');
      if (parts.length === 2) {
        const before = (parts[0].match(/[_a-z]/gi) || []).length;
        const after = (parts[1].match(/[_a-z]/gi) || []).length;
        return `${before}-${after}`;
      }
    }
    
    const knownLetters: { pos: number; letter: string }[] = [];
    let totalLength = 0;
    
    for (let i = 0; i < cleaned.length; i++) {
      if (cleaned[i] === '_' || /[a-z]/i.test(cleaned[i])) {
        totalLength++;
        if (/[a-z]/i.test(cleaned[i])) {
          knownLetters.push({ pos: totalLength, letter: cleaned[i] });
        }
      }
    }
    
    if (knownLetters.length === 1) {
      const { pos, letter } = knownLetters[0];
      const before = pos - 1;
      const after = totalLength - pos;
      return `${before}${letter}${after}`;
    }
    
    return totalLength.toString();
  };

  const convertToUnderscorePattern = (p: string): string => {
    const parts = p.trim().split(/\s+/);
    
    if (parts.length === 1) {
      const pattern = parts[0];
      
      // Pattern like "7" - convert to _______
      if (/^\d+$/.test(pattern)) {
        const count = parseInt(pattern);
        return '_'.repeat(count);
      }
      
      // Pattern like "1-3" - convert to _-___
      if (/^\d+-\d+$/.test(pattern)) {
        const [before, after] = pattern.split('-').map(n => parseInt(n));
        return '_'.repeat(before) + '-' + '_'.repeat(after);
      }
      
      // Pattern like "3e4", "3ea4", or "2r3e1" - convert to ___e____, ___ea____, or __r___e_
      if (/^\d+[a-zA-Z]+/.test(pattern) && /[a-zA-Z]+\d+/.test(pattern)) {
        // Parse pattern into segments
        const segments: Array<{type: 'count' | 'letters', value: string}> = [];
        let current = '';
        let currentType: 'count' | 'letters' | null = null;
        
        for (let i = 0; i < pattern.length; i++) {
          const char = pattern[i];
          const isDigit = /\d/.test(char);
          const type = isDigit ? 'count' : 'letters';
          
          if (currentType === null || currentType === type) {
            current += char;
            currentType = type;
          } else {
            segments.push({type: currentType, value: current});
            current = char;
            currentType = type;
          }
        }
        if (current) {
          segments.push({type: currentType!, value: current});
        }
        
        // Build underscore pattern
        let result = '';
        for (const segment of segments) {
          if (segment.type === 'count') {
            result += '_'.repeat(parseInt(segment.value));
          } else {
            result += segment.value;
          }
        }
        return result;
      }
      
      // Pattern like "3e" or "3ed" - convert to ___e or ___ed (3 letters + ending)
      if (/^\d+[a-zA-Z]+$/.test(pattern)) {
        const match = pattern.match(/^(\d+)([a-zA-Z]+)$/);
        if (match) {
          const count = parseInt(match[1]);
          const ending = match[2];
          return '_'.repeat(count) + ending;
        }
      }
      
      // Pattern like "e3", "p2", or "tr3" - convert to e___, p__, or tr___
      if (/^[a-zA-Z]+\d+$/.test(pattern)) {
        const match = pattern.match(/^([a-zA-Z]+)(\d+)$/);
        if (match) {
          const startLetters = match[1];
          const count = parseInt(match[2]);
          return startLetters + '_'.repeat(count);
        }
      }
    }
    
    // Multiple words pattern like "5 6" - convert to _____ ______
    if (parts.every(p => /^\d+$/.test(p))) {
      return parts.map(p => '_'.repeat(parseInt(p))).join(' ');
    }
    
    return '';
  };

  // Sync searchPattern to letterPattern (only when searchPattern is edited)
  useEffect(() => {
    if (lastEditedRef.current !== 'search') return;
    
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }
    
    syncTimeoutRef.current = setTimeout(() => {
      const pattern = searchPattern.toLowerCase();
      
      if (!pattern.includes('_')) {
        if (letterPattern) {
          setLetterPattern('');
        }
        return;
      }
      
      const newLetterPattern = convertToLetterPattern(pattern);
      if (newLetterPattern !== letterPattern) {
        setLetterPattern(newLetterPattern);
      }
      
      lastEditedRef.current = null;
    }, 100);
    
    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, [searchPattern]);

  // Sync letterPattern to searchPattern (only when letterPattern is edited)
  useEffect(() => {
    if (lastEditedRef.current !== 'letter') return;
    
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }
    
    syncTimeoutRef.current = setTimeout(() => {
      // If letter pattern is cleared, clear the search pattern too
      if (!letterPattern.trim()) {
        if (searchPattern !== '') {
          setSearchPattern('');
        }
        lastEditedRef.current = null;
        return;
      }
      
      const newSearchPattern = convertToUnderscorePattern(letterPattern);
      if (newSearchPattern && newSearchPattern !== searchPattern) {
        setSearchPattern(newSearchPattern);
      }
      
      lastEditedRef.current = null;
    }, 100);
    
    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, [letterPattern]);

  // Simple category-based similarity search
  useEffect(() => {
    if (!showSimilar || !searchPattern || searchPattern.includes('_')) {
      setSemanticResults([]);
      return;
    }

    const allWords = [...wordsData, ...customWords];
    const query = searchPattern.toLowerCase().trim();
    
    // Define categories and their related words
    const categories: Record<string, string[]> = {
      'country': ['france', 'japan', 'brazil', 'canada', 'germany', 'italy', 'spain', 'australia', 'china', 'india', 'mexico', 'russia', 'england', 'america', 'usa', 'united states'],
      'countries': ['france', 'japan', 'brazil', 'canada', 'germany', 'italy', 'spain', 'australia', 'china', 'india', 'mexico', 'russia', 'england', 'america', 'usa', 'united states'],
      'bird': ['eagle', 'parrot', 'penguin', 'owl', 'chicken', 'duck', 'goose', 'swan', 'crow', 'robin', 'sparrow', 'hawk', 'falcon', 'peacock', 'flamingo', 'toucan', 'hummingbird', 'humming', 'cardinal', 'bluebird', 'woodpecker', 'canary', 'finch', 'wren', 'jay', 'magpie', 'raven', 'vulture', 'ostrich', 'emu', 'kiwi', 'pelican', 'heron', 'crane', 'stork', 'ibis', 'egret', 'seagull', 'albatross', 'puffin', 'gull', 'tern', 'sandpiper', 'plover', 'pheasant', 'partridge', 'quail', 'grouse', 'turkey', 'guinea', 'fowl', 'rooster', 'hen', 'chick', 'gosling', 'duckling', 'cygnet', 'eaglet', 'fledgling', 'nestling', 'chickadee', 'titmouse', 'nuthatch', 'creeper', 'kinglet', 'warbler', 'tanager', 'grosbeak', 'bunting', 'junco', 'towhee', 'thrasher', 'mockingbird', 'catbird'],
      'birds': ['eagle', 'parrot', 'penguin', 'owl', 'chicken', 'duck', 'goose', 'swan', 'crow', 'robin', 'sparrow', 'hawk', 'falcon', 'peacock', 'flamingo', 'toucan', 'hummingbird', 'humming', 'cardinal', 'bluebird', 'woodpecker', 'canary', 'finch', 'wren', 'jay', 'magpie', 'raven', 'vulture', 'ostrich', 'emu', 'kiwi', 'pelican', 'heron', 'crane', 'stork', 'ibis', 'egret', 'seagull', 'albatross', 'puffin', 'gull', 'tern', 'sandpiper', 'plover', 'pheasant', 'partridge', 'quail', 'grouse', 'turkey', 'guinea', 'fowl', 'rooster', 'hen', 'chick', 'gosling', 'duckling', 'cygnet', 'eaglet', 'fledgling', 'nestling', 'chickadee', 'titmouse', 'nuthatch', 'creeper', 'kinglet', 'warbler', 'tanager', 'grosbeak', 'bunting', 'junco', 'towhee', 'thrasher', 'mockingbird', 'catbird'],
      'space': ['nasa', 'moon', 'astronaut', 'rocket', 'satellite', 'planet', 'mars', 'jupiter', 'saturn', 'neptune', 'uranus', 'mercury', 'venus', 'earth', 'galaxy', 'star', 'comet', 'asteroid'],
      'insect': ['butterfly', 'bee', 'ant', 'spider', 'fly', 'mosquito', 'beetle', 'ladybug', 'dragonfly', 'grasshopper', 'cricket', 'moth', 'wasp', 'hornet', 'caterpillar'],
      'insects': ['butterfly', 'bee', 'ant', 'spider', 'fly', 'mosquito', 'beetle', 'ladybug', 'dragonfly', 'grasshopper', 'cricket', 'moth', 'wasp', 'hornet', 'caterpillar'],
      'animal': ['dog', 'cat', 'lion', 'tiger', 'elephant', 'bear', 'wolf', 'fox', 'rabbit', 'squirrel', 'deer', 'horse', 'cow', 'pig', 'sheep', 'goat', 'monkey', 'giraffe', 'zebra', 'panda', 'koala'],
      'animals': ['dog', 'cat', 'lion', 'tiger', 'elephant', 'bear', 'wolf', 'fox', 'rabbit', 'squirrel', 'deer', 'horse', 'cow', 'pig', 'sheep', 'goat', 'monkey', 'giraffe', 'zebra', 'panda', 'koala'],
      'food': ['pizza', 'burger', 'sandwich', 'pasta', 'rice', 'bread', 'cake', 'cookie', 'apple', 'banana', 'orange', 'grape', 'strawberry', 'chocolate', 'ice cream', 'soup', 'salad', 'cheese', 'milk', 'juice'],
      'sport': ['football', 'basketball', 'soccer', 'tennis', 'baseball', 'golf', 'swimming', 'running', 'cycling', 'boxing', 'wrestling', 'hockey', 'volleyball', 'badminton', 'cricket', 'rugby'],
      'sports': ['football', 'basketball', 'soccer', 'tennis', 'baseball', 'golf', 'swimming', 'running', 'cycling', 'boxing', 'wrestling', 'hockey', 'volleyball', 'badminton', 'cricket', 'rugby'],
      'color': ['red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink', 'black', 'white', 'brown', 'gray', 'grey', 'silver', 'gold', 'turquoise', 'magenta', 'cyan'],
      'colors': ['red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink', 'black', 'white', 'brown', 'gray', 'grey', 'silver', 'gold', 'turquoise', 'magenta', 'cyan'],
      'vehicle': ['car', 'truck', 'bus', 'motorcycle', 'bicycle', 'train', 'plane', 'helicopter', 'boat', 'ship', 'submarine', 'rocket', 'tank', 'ambulance', 'fire truck', 'police car'],
      'vehicles': ['car', 'truck', 'bus', 'motorcycle', 'bicycle', 'train', 'plane', 'helicopter', 'boat', 'ship', 'submarine', 'rocket', 'tank', 'ambulance', 'fire truck', 'police car'],
      'fruit': ['apple', 'banana', 'orange', 'grape', 'strawberry', 'blueberry', 'raspberry', 'blackberry', 'cherry', 'peach', 'pear', 'pineapple', 'watermelon', 'lemon', 'lime', 'kiwi', 'mango', 'avocado'],
      'fruits': ['apple', 'banana', 'orange', 'grape', 'strawberry', 'blueberry', 'raspberry', 'blackberry', 'cherry', 'peach', 'pear', 'pineapple', 'watermelon', 'lemon', 'lime', 'kiwi', 'mango', 'avocado'],
      'vegetable': ['carrot', 'broccoli', 'spinach', 'lettuce', 'tomato', 'potato', 'onion', 'garlic', 'pepper', 'cucumber', 'celery', 'cabbage', 'cauliflower', 'corn', 'peas', 'beans', 'radish', 'beet'],
      'vegetables': ['carrot', 'broccoli', 'spinach', 'lettuce', 'tomato', 'potato', 'onion', 'garlic', 'pepper', 'cucumber', 'celery', 'cabbage', 'cauliflower', 'corn', 'peas', 'beans', 'radish', 'beet']
    };

    // Find matching category
    const matchingCategory = categories[query];
    
    if (matchingCategory) {
      // Find words that match the category with more precise matching
      const matchingWords = allWords.filter(word => {
        const wordLower = word.toLowerCase();
        
        // Check if the word exactly matches any category word
        if (matchingCategory.includes(wordLower)) {
          return true;
        }
        
        // Check if the word contains any category word as a whole word (not substring)
        return matchingCategory.some((categoryWord: string) => {
          // Split the word by spaces and hyphens to check individual parts
          const wordParts = wordLower.split(/[\s\-]+/);
          return wordParts.some(part => part === categoryWord);
        });
      });
      setSemanticResults(matchingWords);
    } else {
      // Fallback: find words that contain the query or are contained in the query
      const matchingWords = allWords.filter(word => {
        const wordLower = word.toLowerCase();
        return wordLower.includes(query) || query.includes(wordLower);
      });
      setSemanticResults(matchingWords);
    }
  }, [showSimilar, searchPattern, wordsData, customWords]);

  // Calculate similarity score between two strings (Levenshtein distance based)
  const getSimilarityScore = (str1: string, str2: string): number => {
    const s1 = str1.toLowerCase();
    const s2 = str2.toLowerCase();
    
    // Exact match gets highest score
    if (s1 === s2) return 1000;
    
    // Starts with pattern gets very high score
    if (s2.startsWith(s1)) return 900;
    
    // Contains pattern gets high score
    if (s2.includes(s1)) return 800;
    
    // Calculate Levenshtein distance for fuzzy matching
    const matrix: number[][] = [];
    
    for (let i = 0; i <= s2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= s1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= s2.length; i++) {
      for (let j = 1; j <= s1.length; j++) {
        if (s2.charAt(i - 1) === s1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          );
        }
      }
    }
    
    const distance = matrix[s2.length][s1.length];
    const maxLength = Math.max(s1.length, s2.length);
    
    // Convert distance to similarity score (lower distance = higher score)
    return Math.max(0, 700 - (distance / maxLength) * 700);
  };

  const matchesLetterPattern = (word: string, pattern: string): boolean => {
    if (!pattern.trim()) return true;
    
    const parts = pattern.trim().split(/\s+/);
    
    // Single pattern
    if (parts.length === 1) {
      const p = parts[0];
      
      // Pattern like "7" - exact letter count for SINGLE WORD ONLY (no spaces, no hyphens)
      if (/^\d+$/.test(p)) {
        const count = parseInt(p);
        // Must not contain spaces or hyphens
        if (word.includes(' ') || word.includes('-')) return false;
        return word.replace(/[^a-zA-Z]/g, '').length === count;
      }
      
      // Pattern like "1-3" - hyphen at specific position
      if (/^\d+-\d+$/.test(p)) {
        const [before, after] = p.split('-').map(n => parseInt(n));
        const totalLetters = before + after;
        const hyphenPos = before;
        
        // Must contain a hyphen
        if (!word.includes('-')) return false;
        // Must not contain spaces
        if (word.includes(' ')) return false;
        
        // Check if word has hyphen at the right position
        const letters = word.match(/[a-zA-Z]/g) || [];
        if (letters.length !== totalLetters) return false;
        
        // Count letters before hyphen in the actual word
        let letterCount = 0;
        for (let i = 0; i < word.length; i++) {
          if (/[a-zA-Z]/.test(word[i])) {
            letterCount++;
            if (letterCount === hyphenPos && i + 1 < word.length && word[i + 1] === '-') {
              return true;
            }
          }
        }
        return false;
      }
      
      // Pattern like "e3" or "tr3" - starts with letters followed by count
      // (e.g., "e3" = starts with 'e' + 3 more letters = 4 letters total, "tr3" = starts with 'tr' + 3 more letters = 5 letters total)
      if (/^[a-zA-Z]+\d+$/.test(p)) {
        const match = p.match(/^([a-zA-Z]+)(\d+)$/);
        if (match) {
          const startLetters = match[1].toLowerCase();
          const count = parseInt(match[2]);
          
          // Must not contain spaces or hyphens
          if (word.includes(' ') || word.includes('-')) return false;
          
          const letters = word.match(/[a-zA-Z]/g) || [];
          const wordLower = word.toLowerCase();
          
          return letters.length === startLetters.length + count && wordLower.startsWith(startLetters);
        }
      }
      
      // Pattern like "3e4", "3ea4", or "2r3e1" - letters at specific positions
      // (e.g., 3e4 = 3 letters + 'e' + 4 letters, 2r3e1 = 2 letters + 'r' + 3 letters + 'e' + 1 letter)
      if (/^\d+[a-zA-Z]+/.test(p) && /[a-zA-Z]+\d+/.test(p)) {
        // Parse pattern like "2r3e1" into segments
        const segments: Array<{type: 'count' | 'letters', value: string}> = [];
        let current = '';
        let currentType: 'count' | 'letters' | null = null;
        
        for (let i = 0; i < p.length; i++) {
          const char = p[i];
          const isDigit = /\d/.test(char);
          const type = isDigit ? 'count' : 'letters';
          
          if (currentType === null || currentType === type) {
            current += char;
            currentType = type;
          } else {
            segments.push({type: currentType, value: current});
            current = char;
            currentType = type;
          }
        }
        if (current) {
          segments.push({type: currentType!, value: current});
        }
        
        // Must not contain spaces or hyphens
        if (word.includes(' ') || word.includes('-')) return false;
        
        const letters = word.match(/[a-zA-Z]/g) || [];
        
        // Calculate total length and build expected pattern
        let totalLength = 0;
        let position = 0;
        
        for (const segment of segments) {
          if (segment.type === 'count') {
            totalLength += parseInt(segment.value);
            position += parseInt(segment.value);
          } else {
            totalLength += segment.value.length;
            // Check if letters at this position match
            for (let i = 0; i < segment.value.length; i++) {
              if (letters[position + i]?.toLowerCase() !== segment.value[i].toLowerCase()) {
                return false;
              }
            }
            position += segment.value.length;
          }
        }
        
        return letters.length === totalLength;
      }
      
      // Pattern like "3e" or "3ed" - count + ending letters (e.g., 3e = 3 letters + ends with 'e', 3ed = 3 letters + ends with 'ed')
      if (/^\d+[a-zA-Z]+$/.test(p)) {
        const match = p.match(/^(\d+)([a-zA-Z]+)$/);
        if (match) {
          const count = parseInt(match[1]);
          const ending = match[2].toLowerCase();
          
          // Must not contain spaces or hyphens
          if (word.includes(' ') || word.includes('-')) return false;
          
          const letters = word.match(/[a-zA-Z]/g) || [];
          const wordLower = word.toLowerCase();
          
          // Total length should be count + ending length, and word should end with the ending
          return letters.length === count + ending.length && wordLower.endsWith(ending);
        }
      }
    }
    
    // Multiple words pattern like "5 6" or "4 3 4"
    if (parts.every(p => /^\d+$/.test(p))) {
      const wordParts = word.split(/\s+/);
      if (wordParts.length !== parts.length) return false;
      
      return wordParts.every((wordPart, i) => {
        const expectedCount = parseInt(parts[i]);
        const actualCount = wordPart.replace(/[^a-zA-Z]/g, '').length;
        return actualCount === expectedCount;
      });
    }
    
    return true;
  };

  const filteredWords = useMemo(() => {
    // Combine original words and custom words
    const allWords = [...wordsData, ...customWords];
    
    // Apply letter pattern filter first
    let filtered = allWords;
    if (letterPattern) {
      filtered = filtered.filter(word => matchesLetterPattern(word, letterPattern));
    }
    
    if (!searchPattern) {
      // Sort alphabetically when only using letter pattern
      return filtered.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
    }

    const pattern = searchPattern.toLowerCase();
    
    // If pattern contains underscores, treat as hint pattern
    if (pattern.includes('_')) {
      const matches = filtered.filter(word => {
        const wordLower = word.toLowerCase();
        
        // Remove only special chars but keep spaces and hyphens
        const patternCleaned = pattern.replace(/['".,!?()]/g, '');
        const wordCleaned = wordLower.replace(/['".,!?()]/g, '');
        
        // Length must match exactly (including spaces and hyphens)
        if (wordCleaned.length !== patternCleaned.length) return false;
        
        // Character by character matching
        for (let i = 0; i < patternCleaned.length; i++) {
          // Underscore matches only letters (not spaces, not hyphens)
          if (patternCleaned[i] === '_') {
            // Underscore can ONLY match letters (a-z)
            if (wordCleaned[i] === ' ' || wordCleaned[i] === '-') {
              return false;
            }
            continue;
          }
          
          // Non-underscore characters must match exactly (spaces, hyphens, and letters)
          if (patternCleaned[i] !== wordCleaned[i]) {
            return false;
          }
        }
        
        return true;
      });
      
      // Sort alphabetically
      return matches.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
    }
    
    // Semantic similarity search using spaCy API (only if showSimilar is enabled)
    if (showSimilar) {
      return semanticResults.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
    }
    
    // Regular search - only exact contains matches
    return filtered
      .filter(word => word.toLowerCase().includes(pattern))
      .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
  }, [wordsData, customWords, searchPattern, showSimilar, semanticResults, letterPattern]);

  const handleAddWord = async () => {
    if (!newWord.trim()) return;
    
    setWordAction('add');
    setMessage('');
    
    try {
      const response = await fetch('/api/words', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ word: newWord.trim() }),
      });
      
      const result = await response.json();
      
      if (response.ok) {
        setMessage(`✅ Added "${result.word}" successfully!`);
        setNewWord('');
        // Reload custom words
        const customResponse = await fetch('/api/words');
        const customData = await customResponse.json();
        setCustomWords(customData);
      } else {
        setMessage(`❌ ${result.error}`);
      }
    } catch (error) {
      setMessage('❌ Failed to add word');
    } finally {
      setWordAction(null);
    }
  };

  const handleDeleteWord = async () => {
    if (!newWord.trim()) return;
    
    // First click - show confirmation message
    if (deleteClickCount === 0) {
      setDeleteClickCount(1);
      setMessage('⚠️ Click Delete again to confirm deletion');
      
      // Reset after 3 seconds
      if (deleteTimeoutRef.current) {
        clearTimeout(deleteTimeoutRef.current);
      }
      deleteTimeoutRef.current = setTimeout(() => {
        setDeleteClickCount(0);
        setMessage('');
      }, 3000);
      return;
    }
    
    // Second click - actually delete
    if (deleteTimeoutRef.current) {
      clearTimeout(deleteTimeoutRef.current);
    }
    setDeleteClickCount(0);
    
    setWordAction('delete');
    setMessage('');
    
    try {
      const response = await fetch('/api/words', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ word: newWord.trim() }),
      });
      
      const result = await response.json();
      
      if (response.ok) {
        setMessage(`✅ Deleted "${result.word}" successfully!`);
        setNewWord('');
        // Reload custom words
        const customResponse = await fetch('/api/words');
        const customData = await customResponse.json();
        setCustomWords(customData);
      } else {
        setMessage(`❌ ${result.error}`);
      }
    } catch (error) {
      setMessage('❌ Failed to delete word');
    } finally {
      setWordAction(null);
    }
  };

  const handleCopyWord = async (word: string) => {
    try {
      await navigator.clipboard.writeText(word);
      setCopiedWord(word);
      
      // Start fading out immediately after a tiny delay (so the green shows first)
      setTimeout(() => {
        setCopiedWord(null);
      }, 50);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-xl">Loading words database...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white font-sans">
      <div className="container mx-auto max-w-6xl px-6 md:px-8 py-10">
        {/* Header */}
        <h1 className="text-3xl font-normal text-center mb-6 text-gray-900">
          skribbl.io word list database
        </h1>

        {/* Add/Delete Custom Word */}
        <div className="mb-6 border-2 border-gray-300 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-900">Add / Delete Word</h3>
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <input
                type="text"
                placeholder="Add or Delete a word..."
                value={newWord}
                onChange={(e) => setNewWord(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddWord();
                  }
                }}
                className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 text-base"
                disabled={wordAction !== null}
              />
              <button
                onClick={handleAddWord}
                disabled={wordAction !== null || !newWord.trim()}
                className="px-6 py-3 bg-blue-400 text-white rounded-lg hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap text-base font-medium"
              >
                {wordAction === 'add' ? 'Adding...' : 'Add'}
              </button>
              <button
                onClick={handleDeleteWord}
                disabled={wordAction !== null || !newWord.trim()}
                className="px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-400 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap text-base font-medium"
              >
                {wordAction === 'delete' ? 'Deleting...' : 'Delete'}
              </button>
            </div>
            
            {message && (
              <div className="text-sm">
                {message}
              </div>
            )}
          </div>
        </div>

        {/* Search Input */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <input
              type="text"
              placeholder="Search by blanks, for example ____b____"
              value={searchPattern}
              onChange={(e) => {
                lastEditedRef.current = 'search';
                setSearchPattern(e.target.value);
              }}
              className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 text-base"
            />
            
            <input
              type="text"
              placeholder="Search by number"
              value={letterPattern}
              onChange={(e) => {
                lastEditedRef.current = 'letter';
                setLetterPattern(e.target.value);
              }}
              className="w-full sm:w-48 px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 text-base"
              title="Examples: 7 (7 letters), 5 6 (two words), 1-3 (hyphen), 3e4 or 2r3e1 (letters at positions), 3e or 3ed (ending), e3 or tr3 (starting)"
            />
            
            <button
              onClick={() => setShowSimilar(!showSimilar)}
              className={`px-6 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-base font-medium whitespace-nowrap transition-colors ${
                showSimilar
                  ? 'bg-blue-400 border-blue-400 text-white hover:bg-blue-500'
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {showSimilar ? '✓ Similar Words' : 'Similar Words'}
            </button>
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-4">
          <p className="text-gray-600 text-sm">
            Found {filteredWords.length} words
            {customWords.length > 0 && (
              <span className="text-sm text-gray-500 ml-2">
                ({wordsData.length} original + {customWords.length} custom)
              </span>
            )}
          </p>
        </div>

        {/* Word Grid */}
        <div className="flex flex-wrap justify-between gap-2 after:content-[''] after:flex-auto">
          {filteredWords.map((word) => (
            <div
              key={word}
              onClick={() => handleCopyWord(word)}
              className={`inline-block whitespace-nowrap rounded-lg border-2 px-4 py-2 text-sm text-center cursor-pointer text-gray-900 ${
                copiedWord === word
                  ? 'bg-green-400 border-green-500 transition-none'
                  : 'bg-white border-gray-300 hover:bg-gray-50 transition-all duration-1000'
              }`}
            >
              {word}
            </div>
          ))}
        </div>

        {filteredWords.length === 0 && searchPattern && (
          <div className="text-center py-8 text-gray-500">
            No words found matching "{searchPattern}"
          </div>
        )}
      </div>
    </div>
  );
}
