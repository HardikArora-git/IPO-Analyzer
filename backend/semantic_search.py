import math


def cosine_similarity(query_vector, document_vector):
    dot_product = sum(
        query_value * document_value
        for query_value, document_value in zip(query_vector, document_vector)
    )

    query_norm = math.sqrt(sum(value * value for value in query_vector))
    document_norm = math.sqrt(sum(value * value for value in document_vector))

    if query_norm == 0 or document_norm == 0:
        return 0.0

    return dot_product / (query_norm * document_norm)


def search(query_vector, chunks, embeddings, top_k=5):
    scored_chunks = []

    for index, document_vector in enumerate(embeddings):
        score = cosine_similarity(query_vector, document_vector)

        scored_chunks.append({
            "chunk": chunks[index],
            "score": round(score, 4)
        })

    return sorted(
        scored_chunks,
        key=lambda item: item["score"],
        reverse=True
    )[:top_k]