#!/usr/bin/env python3
"""Extract words from HTML div elements and merge with words.json."""

import json
import re
from pathlib import Path

def extract_words_from_html(html_content: str) -> list[str]:
    """Extract words from <div class="solution">{word}</div> pattern."""
    # Match pattern: <div class="solution">word</div>
    pattern = r'<div\s+class="solution"\s*>([^<]+)</div>'
    matches = re.findall(pattern, html_content)
    
    words = []
    for match in matches:
        word = match.strip()
        # Skip empty strings and very short invalid entries
        if word and len(word) > 0:
            words.append(word)
    
    return words

def main():
    # Read the HTML file
    html_path = Path("newwordList.txt")
    if not html_path.exists():
        print(f"Error: {html_path} not found")
        return 1
    
    html_content = html_path.read_text(encoding="utf-8")
    
    # Extract words
    extracted = extract_words_from_html(html_content)
    print(f"Extracted {len(extracted)} words from HTML")
    
    if not extracted:
        print("No words found!")
        return 1
    
    # Read existing words.json
    words_path = Path("skribbl-hints-app/public/words.json")
    if not words_path.exists():
        print(f"Error: {words_path} not found")
        return 1
    
    existing_words = json.loads(words_path.read_text(encoding="utf-8"))
    print(f"Found {len(existing_words)} existing words")
    
    # Create set of existing words (case-insensitive)
    existing_lower = {w.lower() for w in existing_words}
    
    # Find new words
    new_words = []
    seen = set()
    
    for word in extracted:
        word_lower = word.lower()
        # Skip duplicates in extracted and already existing
        if word_lower in seen or word_lower in existing_lower:
            continue
        seen.add(word_lower)
        new_words.append(word)
    
    print(f"Found {len(new_words)} new unique words")
    
    if new_words:
        print("\nNew words:")
        for word in sorted(new_words):
            print(f"  - {word}")
        
        # Merge and save
        merged = existing_words + new_words
        words_path.write_text(json.dumps(merged, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(f"\nMerged {len(new_words)} new words. Total: {len(merged)}")
    else:
        print("No new words to add")
    
    return 0

if __name__ == "__main__":
    import sys
    sys.exit(main())
