"""Cosine similarity search supporting sparse TF-IDF dictionaries."""
import math


def cosine_similarity(query_vector, document_vector):
    if isinstance(query_vector, dict) and isinstance(document_vector, dict):
        if len(query_vector) > len(document_vector):
            query_vector, document_vector = document_vector, query_vector
        dot_product = sum(value * document_vector.get(key, 0.0) for key, value in query_vector.items())
        query_norm = math.sqrt(sum(value * value for value in query_vector.values()))
        document_norm = math.sqrt(sum(value * value for value in document_vector.values()))
    else:
        dot_product = sum(a * b for a, b in zip(query_vector, document_vector))
        query_norm = math.sqrt(sum(value * value for value in query_vector))
        document_norm = math.sqrt(sum(value * value for value in document_vector))

    if query_norm == 0 or document_norm == 0:
        return 0.0
    return dot_product / (query_norm * document_norm)


def search(query_vector, chunks, embeddings, top_k=5):
    scored_chunks = []
    for index, document_vector in enumerate(embeddings):
        score = cosine_similarity(query_vector, document_vector)
        scored_chunks.append({"chunk": chunks[index], "score": round(score, 4)})
    return sorted(scored_chunks, key=lambda item: item["score"], reverse=True)[:top_k]
