from llm import generate_answer
from pathlib import Path

from pdf_processor import extract_text, clean_text, create_chunks
from embedding import create_embedding, create_query_embedding
from vector_store import store_embeddings
from semantic_search import search

# PDF path
pdf_path = Path(__file__).resolve().parent.parent / "data" / "PPT3_HowtoinvestinIPO.pdf"

# Step 1: Extract text
raw_text = extract_text(pdf_path)

# Step 2: Clean text
cleaned_text = clean_text(raw_text)

# Step 3: Create chunks
chunks = create_chunks(cleaned_text)

# Step 4: Create embeddings
embeddings, vocabulary, idf = create_embedding(chunks)

print(f"Total chunks created: {len(chunks)}")
print(f"embeddings shape: {embeddings.shape}")
# print("\nfirst chunks")

# print(chunks[0])

# Step 5: Store embeddings

# step 6: question answer loop and llm 
store_embeddings(chunks, embeddings)

while True:

    query = input("\nAsk a question about the IPO document (type 'exit' to quit): ")

    if query.lower() == "exit":
        print("\nGoodbye! 👋")
        break

    query_embedding = create_query_embedding(query, vocabulary, idf)

    results = search(query_embedding, chunks, embeddings, top_k=3)

    context = "\n\n".join(
        [result["chunk"] for result in results]
    )

    answer = generate_answer(context, query)

    print("\n🤖 AI Answer:\n")
    print(answer)

# print(f"\nTop 3 results for query: \n")

# for result in results:
#     print(f"question: {query}")
#     print(f"Score: {result['score']}")
#     print(f"Chunk: {result['chunk']}\n")
#     print("-" * 50)