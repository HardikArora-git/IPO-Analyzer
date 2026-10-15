from pypdf import PdfReader

def extract_text(pdf_path):
    reader = PdfReader(pdf_path)
    text = ""
    for page in reader.pages:
        page_text = page.extract_text()

        if page_text:
            text += page_text + "\n"

    return text

def clean_text(text):
    # Remove extra whitespace and newlines
    text = text.replace('\n', ' ')
    text = ' '.join(text.split())
    return text

def create_chunks(text, chunk_size=1000, overlap=100):
    chunks = []

    start = 0

    while start < len(text):
        end = start + chunk_size
        chunk = text[start:end]
        chunks.append(chunk)
        start = end - overlap  # Move the start index back by the overlap amount
    return chunks