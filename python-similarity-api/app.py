from flask import Flask, request, jsonify
from flask_cors import CORS
import re
from collections import Counter
import math

app = Flask(__name__)
CORS(app)  # Allow requests from Next.js frontend

# Simple stop words list
STOP_WORDS = {
    'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'has', 'he', 'in', 'is', 'it', 'its',
    'of', 'on', 'that', 'the', 'to', 'was', 'will', 'with', 'i', 'you', 'we', 'they', 'this', 'these',
    'those', 'have', 'had', 'do', 'does', 'did', 'can', 'could', 'would', 'should', 'may', 'might'
}

def preprocess_text(text):
    """Clean and preprocess text for better similarity matching"""
    # Convert to lowercase
    text = text.lower()
    # Remove special characters but keep spaces and hyphens
    text = re.sub(r'[^\w\s\-]', ' ', text)
    # Remove extra whitespace
    text = ' '.join(text.split())
    return text

def get_word_frequency(text):
    """Get word frequency from text"""
    words = text.split()
    # Remove stop words
    words = [word for word in words if word not in STOP_WORDS and len(word) > 1]
    return Counter(words)

def calculate_similarity(query, word):
    """Calculate similarity between query and word using multiple methods"""
    query_lower = query.lower()
    word_lower = word.lower()
    
    # Exact match gets highest score
    if query_lower == word_lower:
        return 1.0
    
    # Contains match gets high score
    if word_lower.find(query_lower) != -1 or query_lower.find(word_lower) != -1:
        return 0.8
    
    # Word frequency similarity for multi-word terms
    query_freq = get_word_frequency(query)
    word_freq = get_word_frequency(word)
    
    if not query_freq or not word_freq:
        return 0.0
    
    # Get all unique words
    all_words = set(query_freq.keys()) | set(word_freq.keys())
    
    if not all_words:
        return 0.0
    
    # Calculate dot product and magnitudes
    dot_product = sum(query_freq.get(w, 0) * word_freq.get(w, 0) for w in all_words)
    query_magnitude = math.sqrt(sum(query_freq.get(w, 0) ** 2 for w in all_words))
    word_magnitude = math.sqrt(sum(word_freq.get(w, 0) ** 2 for w in all_words))
    
    if query_magnitude == 0 or word_magnitude == 0:
        return 0.0
    
    cosine_sim = dot_product / (query_magnitude * word_magnitude)
    
    # Boost score for shared words
    shared_words = set(query_freq.keys()) & set(word_freq.keys())
    if shared_words:
        cosine_sim += 0.2 * len(shared_words)
    
    return min(cosine_sim, 1.0)

@app.route('/similar', methods=['POST'])
def find_similar():
    data = request.json
    query = data.get('query', '').strip().lower()
    words = data.get('words', [])
    threshold = data.get('threshold', 0.1)  # Similarity threshold
    
    if not query or not words:
        return jsonify({'error': 'Query and words are required'}), 400
    
    # Calculate similarity for each word
    results = []
    for word in words:
        # Calculate similarity
        similarity = calculate_similarity(query, word)
        
        # Only include words above threshold
        if similarity >= threshold:
            results.append({
                'word': word,
                'similarity': similarity
            })
    
    # Sort by similarity (highest first)
    results.sort(key=lambda x: x['similarity'], reverse=True)
    
    # Return just the words (sorted by similarity)
    return jsonify({
        'words': [r['word'] for r in results],
        'count': len(results)
    })

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'healthy', 'model': 'simple-cosine-similarity'})

if __name__ == '__main__':
    print("Starting spaCy similarity API on http://localhost:5000")
    app.run(host='0.0.0.0', port=5000, debug=True)
