import importlib
import json
from pathlib import Path

import numpy as np

database_path = Path(__file__).resolve().parent.parent / "chroma_db"
chromadb_spec = importlib.util.find_spec("chromadb")

if chromadb_spec is not None:
    chromadb_module = importlib.import_module("chromadb")
    client = chromadb_module.PersistentClient(path=str(database_path))
    collection = client.get_or_create_collection(name="ipo_analyzer")
else:
    collection = None

def store_embeddings(chunks, embeddings):
    ids = [f"chunk_{i}" for i in range(len(chunks))]

    if collection is not None:
        collection.add(
            ids=ids,
            documents=chunks,
            embeddings=embeddings.tolist()
        )
    else:
        database_path.mkdir(parents=True, exist_ok=True)
        np.save(database_path / "embeddings.npy", embeddings)
        (database_path / "documents.json").write_text(
            json.dumps(dict(zip(ids, chunks)), ensure_ascii=True, indent=2),
            encoding="utf-8"
        )

    backend_name = "ChromaDB" if collection is not None else "local NumPy store"
    print(f"Stored {len(chunks)} chunks using {backend_name}.")