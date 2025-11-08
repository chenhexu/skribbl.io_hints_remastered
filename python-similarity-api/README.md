# Semantic Similarity API with Simple Cosine Similarity

## Setup

1. Install Python dependencies:
```bash
pip install -r requirements.txt
```

2. Run the server:
```bash
python app.py
```

The API will run on http://localhost:5000

## Usage

The API will be automatically called by the Next.js frontend when "Similar Words" is enabled.

Example request:
```bash
curl -X POST http://localhost:5000/similar \
  -H "Content-Type: application/json" \
  -d '{
    "query": "country",
    "words": ["France", "Japan", "dog", "cat", "Brazil"],
    "threshold": 0.1
  }'
```

Response:
```json
{
  "words": ["France", "Japan", "Brazil"],
  "count": 3
}
```

## How it works

This API uses simple cosine similarity with word frequency vectors to find semantically related words. It's lightweight and doesn't require any heavy dependencies like scikit-learn or spaCy.
