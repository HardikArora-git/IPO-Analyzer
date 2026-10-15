import os
import requests
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("API_KEY")


def generate_answer(context, question,language = "hinglish"):

    url = (
        "https://generativelanguage.googleapis.com/"
        "v1beta/models/gemini-3.8-flash:generateContent"
        f"?key={API_KEY}"
    )

    prompt = f"""
You are an IPO document analysis assistant.

Answer the user's question using ONLY the provided context.

If the answer is not available in the context, say:

"Information not found in the provided IPO document."

Context:
{context}

Question:
{question}

Language and style rules:
- Detect the language and script used in the user's question.
- Reply in exactly the same language, script, and conversational style as the user's question.
- If the user writes Hinglish (Hindi in English letters), reply in Hinglish.
- If the user writes Hindi in Devanagari, reply in Hindi in Devanagari.
- If the user writes English, reply in English.
- If the question mixes languages, naturally use the same mix.
- Explain difficult financial terms in very simple words.
- Do not give direct buy, sell, or investment advice.

Give a clear and simple answer."""

    data = {
        "contents": [
            {
                "parts": [
                    {
                        "text": prompt
                    }
                ]
            }
        ]
    }

    response = requests.post(url, json=data)

    response.raise_for_status()

    result = response.json()

    answer = result["candidates"][0]["content"]["parts"][0]["text"]

    return answer