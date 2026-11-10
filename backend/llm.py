import os
import time
import requests
from dotenv import load_dotenv

load_dotenv()

# Support both environment variable names
API_KEY = os.getenv("GEMINI_API_KEY") or os.getenv("API_KEY")

# Keep model configurable through Render environment variables
MODEL_NAME = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")

BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models"


def generate_answer(context, question, language="hinglish"):

    if not API_KEY:
        raise RuntimeError(
            "Gemini API key is missing. Set GEMINI_API_KEY in environment variables."
        )

    url = f"{BASE_URL}/{MODEL_NAME}:generateContent"

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

Give a clear and simple answer.
"""

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

    headers = {
        "Content-Type": "application/json"
    }

    max_retries = 3

    for attempt in range(max_retries):

        try:
            response = requests.post(
                url,
                headers=headers,
                params={"key": API_KEY},
                json=data,
                timeout=(10, 60)
            )

            if response.status_code in [429, 500, 502, 503, 504]:

                if attempt < max_retries - 1:
                    wait_time = 2 ** (attempt + 1)

                    print(
                        f"Gemini temporary error: {response.status_code}. "
                        f"Retrying in {wait_time} seconds..."
                    )

                    time.sleep(wait_time)
                    continue

            response.raise_for_status()

            result = response.json()

            candidates = result.get("candidates", [])

            if not candidates:
                raise RuntimeError(
                    "Gemini returned no answer. Please try another question."
                )

            answer = (
                candidates[0]
                .get("content", {})
                .get("parts", [{}])[0]
                .get("text")
            )

            if not answer:
                raise RuntimeError("Gemini returned an empty answer.")

            return answer

        except requests.exceptions.Timeout:
            if attempt < max_retries - 1:
                time.sleep(2 ** (attempt + 1))
                continue

            raise RuntimeError(
                "Gemini request timed out after multiple attempts."
            )

        except requests.exceptions.HTTPError as e:
            status_code = e.response.status_code

            if status_code == 401 or status_code == 403:
                raise RuntimeError(
                    "Gemini API authentication failed. Check your API key."
                )

            if status_code == 429:
                raise RuntimeError(
                    "Gemini API quota or rate limit exceeded. Try again later."
                )

            if status_code in [500, 502, 503, 504]:
                raise RuntimeError(
                    "Gemini service is temporarily unavailable. Please try again later."
                )

            raise RuntimeError(
                f"Gemini API returned HTTP {status_code}: "
                f"{e.response.text[:500]}"
            )

        except requests.exceptions.RequestException:
            if attempt < max_retries - 1:
                time.sleep(2 ** (attempt + 1))
                continue

            raise RuntimeError(
                "Unable to connect to Gemini API. Check your internet connection."
            )

    raise RuntimeError("Gemini request failed after multiple attempts.")