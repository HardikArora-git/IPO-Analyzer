"""Sparse TF-IDF embeddings to avoid dense chunk-by-vocabulary matrices."""
import math
import re
from collections import Counter


def tokenize(text):
    return re.findall(r"\b[a-zA-Z0-9]+\b", str(text).lower())


def create_embedding(chunks):
    tokenized = [tokenize(chunk) for chunk in chunks]
    document_frequency = Counter()
    for words in tokenized:
        document_frequency.update(set(words))

    total_documents = max(len(tokenized), 1)
    vocabulary = {word: index for index, word in enumerate(document_frequency)}
    idf = {
        word: math.log((total_documents + 1) / (frequency + 1)) + 1
        for word, frequency in document_frequency.items()
    }

    embeddings = []
    for words in tokenized:
        counts = Counter(words)
        embeddings.append({word: count * idf[word] for word, count in counts.items()})
    return embeddings, vocabulary, idf


def create_query_embedding(query, vocabulary, idf):
    counts = Counter(word for word in tokenize(query) if word in vocabulary)
    return {word: count * idf[word] for word, count in counts.items()}
