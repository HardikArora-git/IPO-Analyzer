"""Simple persistent JSON store for sparse TF-IDF document vectors."""
import json
from pathlib import Path


database_path = Path(__file__).resolve().parent.parent / "chroma_db"


def store_embeddings(chunks, embeddings):
    database_path.mkdir(parents=True, exist_ok=True)
    payload = {
        "documents": chunks,
        "embeddings": embeddings,
        "embedding_type": "sparse_tfidf",
    }
    (database_path / "document_store.json").write_text(
        json.dumps(payload, ensure_ascii=True),
        encoding="utf-8",
    )
    print(f"Stored {len(chunks)} chunks using the local sparse JSON store.")
