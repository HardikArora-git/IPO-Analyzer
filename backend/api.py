from operator import index

from fastapi import FastAPI, UploadFile, File, HTTPException
from pydantic import BaseModel
import shutil
from pathlib import Path
from fastapi.middleware.cors import CORSMiddleware
from pdf_processor import extract_text, clean_text, create_chunks
from embedding import create_embedding, create_query_embedding
from semantic_search import search
from llm import generate_answer
import json
import re
# import yfinance as yf
import operator
import requests
import time
from datetime import datetime, timezone
from xml.etree import ElementTree as ET

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class QueryRequest(BaseModel):
    question: str
    language: str = "hinglish"  # default language

UPLOAD_FOLDER = Path("uploads")
UPLOAD_FOLDER.mkdir(exist_ok=True)

# global storage for current upload document
document_data = {}

# NSE blocks repeated anonymous requests quite aggressively. Keep a short
# in-memory cache so every browser refresh does not create a new request.
ipo_calendar_cache = {"updated_at": 0.0, "payload": None}
NSE_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122 Safari/537.36",
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "en-IN,en;q=0.9",
    "Referer": "https://www.nseindia.com/market-data/all-upcoming-issues-ipo",
}

@app.get("/")
def home():
    return {
        "message": "IPO AI Analyzer Backend is Running! 🚀",
    }

@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):

    # check pdf
    if not file.filename.endswith(".pdf"):
        return {"error": "Only PDF files are allowed."}

    file_path = UPLOAD_FOLDER / file.filename

    # save the uploaded file
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    #  extract text
    raw_text = extract_text(file_path)
    # Clean text
    cleaned_text = clean_text(raw_text)
    # Create chunks
    chunks = create_chunks(cleaned_text)

    # Create embeddings
    embeddings, vocabulary, idf = create_embedding(chunks)

    # store document data
    document_data.clear()


    # store document data
    document_data[file.filename] = {
        "chunks": chunks,
        "embeddings": embeddings,
        "vocabulary": vocabulary,
        "idf": idf
    }

    return {
        "message": f"File '{file.filename}' uploaded successfully.",
        "filename": file.filename,
        "path": str(file_path),
        "total_chunks": len(chunks)
    }

@app.post("/ask")
async def ask_question(request: QueryRequest):

    # Check whether any document has been uploaded
    if not document_data:
        raise HTTPException(
            status_code=400,
            detail="Please upload a document first."
        )

    # Get the latest uploaded document
    latest_filename = list(document_data.keys())[-1]

    data = document_data[latest_filename]

    chunks = data["chunks"]
    embeddings = data["embeddings"]
    vocabulary = data["vocabulary"]
    idf = data["idf"]

    # Create embedding for user question
    query_embedding = create_query_embedding(
        request.question,
        data["vocabulary"],
        data["idf"]
    )

    # Search relevant chunks
    results = search(
        query_embedding,
        chunks,
        data["embeddings"],
        top_k=3
    )

    # Create context from search results
    context = "\n\n".join(
        [result["chunk"] for result in results]
    )

    # Generate AI answer
    answer = generate_answer(
        context,
        request.question,
        request.language
    )

    return {
        "answer": answer
    }


#  summary add
@app.get("/summary")
async def generate_summary():

    # Check document uploaded
    if not document_data:
        raise HTTPException(
            status_code=400,
            detail="Please upload a document first."
        )

    # Get latest uploaded document
    latest_filename = list(document_data.keys())[-1]

    data = document_data[latest_filename]

    chunks = data["chunks"]

    # Use document content
    context = "\n\n".join(chunks[:10])

    prompt_question = """
Generate a concise and clear summary of this IPO document.

Include:
1. What the document is about
2. Important IPO concepts
3. Key information for an investor
4. Important financial or investment-related points

Use simple language and clear bullet points.
"""

    answer = generate_answer(context, prompt_question)

    return {
        "summary": answer
    }

@app.get("/risk-analysis")
async def risk_analysis():

    # Check document uploaded
    if not document_data:
        raise HTTPException(
            status_code=400,
            detail="Please upload a document first."
        )

    # Get latest uploaded document
    latest_filename = list(document_data.keys())[-1]

    data = document_data[latest_filename]

    chunks = data["chunks"]

    # Combine document content
    context = "\n\n".join(chunks[:15])

    prompt_question = """
Analyze the risk factors found in the IPO document.

Return the answer strictly in clean Markdown format.

Use proper headings and bullet points.

Example format:

## Business Risks

- **Risk:** Description
- **Explanation:** Simple explanation
- **Investor Impact:** How this affects investors

## Financial Risks

- **Risk:** Description
- **Explanation:** Simple explanation
- **Investor Impact:** How this affects investors

## Market Risks

- **Risk:** Description
- **Explanation:** Simple explanation
- **Investor Impact:** How this affects investors

## Regulatory Risks

- **Risk:** Description
- **Explanation:** Simple explanation
- **Investor Impact:** How this affects investors

## Operational Risks

- **Risk:** Description
- **Explanation:** Simple explanation
- **Investor Impact:** How this affects investors

Rules:
- Put every section on separate lines.
- Use Markdown headings.
- Use bullet points properly.
- Do not put the entire answer in one paragraph.
- Only use information available in the provided context.
- Do not invent information.
"""

    answer = generate_answer(context, prompt_question)

    return {
        "risk_analysis": answer
    }


@app.get("/financial-analysis")
async def financial_analysis():

    # Check document uploaded
    if not document_data:
        raise HTTPException(
            status_code=400,
            detail="Please upload a document first."
        )
        # Get latest uploaded document
    latest_filename = list(document_data.keys())[-1]

    data = document_data[latest_filename]

    chunks = data["chunks"]

    # Combine document content
    context = "\n\n".join(chunks[:15])

    prompt_question = """Analyze the financial performance of the company using ONLY the provided IPO document.

Return the response in clean Markdown format.

Include these sections when information is available:

## Revenue and Income
## Profitability
## Assets
## Liabilities
## Cash Flow
## Key Financial Highlights

For each section:
- Mention important figures if available.
- Explain the financial information in simple language.
- Compare financial performance across years if the document provides multiple years.

If information is not available, clearly mention:
"Information not found in the provided IPO document."

Do not invent financial numbers."""

    answer = generate_answer(context, prompt_question)
    return {
        "financial_analysis": answer
    }

@app.get("/risk-score")
async def risk_score():

    # Check document uploaded
    if not document_data:
        raise HTTPException(
            status_code=400,
            detail="Please upload a document first."
        )

    try:
        # Get latest uploaded document
        latest_filename = list(document_data.keys())[-1]

        data = document_data[latest_filename]

        chunks = data["chunks"]

        # Use document content
        context = "\n\n".join(chunks[:20])

        prompt_question = """
Analyze this IPO document and calculate an IPO Risk Score.

Return ONLY valid JSON.

Use exactly this structure:

{
  "overall_score": 0,
  "risk_level": "Low",
  "financial_risk": 0,
  "business_risk": 0,
  "market_risk": 0,
  "regulatory_risk": 0,
  "operational_risk": 0,
  "summary": "Short explanation of the overall IPO risk"
}

Rules:

- All scores must be numbers between 0 and 100.
- 0-30 means Low Risk.
- 31-60 means Medium Risk.
- 61-100 means High Risk.
- Analyze ONLY the provided IPO document.
- Do not invent information.
- Return ONLY JSON.
- Do not use ```json or markdown formatting.
"""

        # Generate AI response
        answer = generate_answer(context, prompt_question)

        # Debug print
        print("\nRISK SCORE RAW RESPONSE:")
        print(answer)

        # If answer is already a dictionary
        if isinstance(answer, dict):
            # Sometimes Gemini function may return a full API object
            if "candidates" in answer:
                raise ValueError(
                    "generate_answer returned the full Gemini response instead of text."
                )

            risk_data = answer

        else:
            # Convert answer to string
            answer_text = str(answer).strip()

            # Remove markdown if AI still sends it
            answer_text = re.sub(
                r"^```json\s*",
                "",
                answer_text,
                flags=re.IGNORECASE
            )

            answer_text = re.sub(
                r"^```\s*",
                "",
                answer_text
            )

            answer_text = re.sub(
                r"\s*```$",
                "",
                answer_text
            )

            # Parse JSON
            risk_data = json.loads(answer_text)

        return risk_data

    except json.JSONDecodeError:
        raise HTTPException(
            status_code=500,
            detail="AI did not return valid JSON for the risk score."
        )

    except Exception as e:

        print("RISK SCORE ERROR:", str(e))

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


@app.get("/key-insights")
async def key_insights():

    if not document_data:
        raise HTTPException(
            status_code=400,
            detail="Please upload a document first."
        )

    # Latest uploaded document
    latest_filename = list(document_data.keys())[-1]

    data = document_data[latest_filename]

    chunks = data["chunks"]

    # Use document content
    context = "\n\n".join(chunks[:15])

    prompt_question = """
Analyze the IPO document and extract the most important IPO information.

Return ONLY valid JSON.

Use exactly this format:

{
    "company_name": "",
    "issue_size": "",
    "price_band": "",
    "listing_exchange": "",
    "promoters": "",
    "ipo_date": "",
    "major_risk": "",
    "financial_highlight": ""
}

Rules:

- Use ONLY information available in the provided IPO document.
- Do not invent information.
- If information is unavailable, write:
  "Not available in the document"
- Keep each value short and clear.
"""

    answer = generate_answer(context, prompt_question)

    return {
        "insights": answer
    }

@app.get("/ipo-snapshot")
async def ipo_snapshot():

    if not document_data:
        raise HTTPException(
            status_code=400,
            detail="Please upload a document first."
        )

    # Latest uploaded document
    latest_filename = list(document_data.keys())[-1]

    data = document_data[latest_filename]

    chunks = data["chunks"]

    # Use document content
    context = "\n\n".join(chunks[:60])

    prompt_question = """
Extract an IPO snapshot from the document.

Return ONLY valid JSON. Do not use markdown or ```json fences.

Use exactly these keys:
{
  "company_name": "",
  "sector": "",
  "issue_size": "",
  "price_band": "",
  "lot_size": "",
  "ipo_open_date": "",
  "ipo_close_date": "",
  "listing_date": "",
  "use_of_proceeds": "",
  "top_risks": ""
}

Rules:
- Use only information available in the document.
- If a value is unavailable, use "Not found in document".
- Keep each answer short and simple.
"""

    answer = generate_answer(context, prompt_question)

    try:
        clean_answer = re.sub(
            r"^```json\s*", "", 
            answer.strip(), 
            flags=re.IGNORECASE
        )

        snapshot = json.loads(clean_answer)

    except (json.JSONDecodeError, TypeError):
        raise HTTPException(
            status_code=502,
            detail="Could not create a structured IPO snapshot. Please check the document or try again."
        )

    return {
        "snapshot": snapshot
    }

# stock market data endpoint
@app.get("/market/{symbol}")
async def get_market_data(symbol: str, range_key: str = "1M"):

    ticker_symbol = symbol.upper().strip()

    if "." not in ticker_symbol:
        ticker_symbol = f"{ticker_symbol}.NS"

    range_config = {
        "1D": {"range": "1d", "interval": "5m", "intraday": True},
        "5D": {"range": "5d", "interval": "15m", "intraday": True},
        "1M": {"range": "1mo", "interval": "1d", "intraday": False},
        "6M": {"range": "6mo", "interval": "1d", "intraday": False},
        "YTD": {"range": "ytd", "interval": "1d", "intraday": False},
        "1Y": {"range": "1y", "interval": "1d", "intraday": False},
        "5Y": {"range": "5y", "interval": "1wk", "intraday": False},
        "MAX": {"range": "max", "interval": "1mo", "intraday": False},
    }

    selected_range = range_config.get(range_key.upper(), range_config["1M"])

    try:
        response = requests.get(
            f"https://query1.finance.yahoo.com/v8/finance/chart/{ticker_symbol}",
            params={
                "range": selected_range["range"],
                "interval": selected_range["interval"],
            },
            headers={"User-Agent": "Mozilla/5.0"},
            timeout=15,
        )

        response.raise_for_status()

        payload = response.json()
        result = payload["chart"]["result"][0]

        timestamps = result["timestamp"]
        quote = result["indicators"]["quote"][0]
        metadata = result["meta"]
        candles = []

        for index, timestamp in enumerate(timestamps):
            open_price = quote["open"][index]
            high_price = quote["high"][index]
            low_price = quote["low"][index]
            close_price = quote["close"][index]

            if None in [open_price, high_price, low_price, close_price]:
                continue

            candle_time = (
                timestamp
                if selected_range["intraday"]
                else datetime.fromtimestamp(
                    timestamp,
                    tz=timezone.utc
                ).strftime("%Y-%m-%d")
            )

            candles.append({
                "time": candle_time,
                "open": round(float(open_price), 2),
                "high": round(float(high_price), 2),
                "low": round(float(low_price), 2),
                "close": round(float(close_price), 2),
            })

        if len(candles) < 2:
            raise HTTPException(
                status_code=404,
                detail=f"No market data found for {ticker_symbol}."
            )

        price = candles[-1]["close"]
        previous_close = (
            metadata.get("previousClose")
            or metadata.get("chartPreviousClose")
            or candles[-2]["close"]
        )

        change = round(price - float(previous_close), 2)
        change_percent = round(
            (change / float(previous_close)) * 100,
            2
        )

        return {
            "company_name": metadata.get(
                "longName",
                metadata.get("shortName", ticker_symbol)
            ),
            "symbol": metadata.get("symbol", ticker_symbol),
            "price": price,
            "change": change,
            "change_percent": change_percent,
            "currency": metadata.get("currency", "INR"),
            "range": range_key.upper(),
            "is_delayed": True,
            "metrics": {
                "Open": metadata.get("regularMarketOpen"),
                "Day high": metadata.get("regularMarketDayHigh"),
                "Day low": metadata.get("regularMarketDayLow"),
                "52-wk high": metadata.get("fiftyTwoWeekHigh"),
                "52-wk low": metadata.get("fiftyTwoWeekLow"),
            },
            "candles": candles,
        }

    except HTTPException:
        raise

    except Exception as error:
        raise HTTPException(
            status_code=502,
            detail=f"Unable to retrieve market data: {str(error)}"
        )


@app.get("/market/{symbol}/news")
async def get_company_news(symbol: str, company: str = ""):
    query = company.strip() or symbol.replace(".NS", "")

    try:
        response = requests.get(
            "https://news.google.com/rss/search",
            params={
                "q": f"{query} stock India",
                "hl": "en-IN",
                "gl": "IN",
                "ceid": "IN:en",
            },
            headers={"User-Agent": "Mozilla/5.0"},
            timeout=12,
        )
        response.raise_for_status()

        root = ET.fromstring(response.content)
        articles = []

        for item in root.findall("./channel/item")[:6]:
            source = item.find("source")
            articles.append({
                "title": item.findtext("title", "Market update"),
                "url": item.findtext("link", "#"),
                "published_at": item.findtext("pubDate", "Recent"),
                "source": source.text if source is not None else "News",
            })

        return {"articles": articles}

    except Exception as error:
        raise HTTPException(
            status_code=502,
            detail=f"Unable to retrieve company news: {str(error)}"
        )


@app.get("/ipo-calendar")
async def get_ipo_calendar():
    """Return the current official NSE public-issue feed without inventing data."""
    cache_age_seconds = 300
    now = time.time()

    if (
        ipo_calendar_cache["payload"] is not None
        and now - ipo_calendar_cache["updated_at"] < cache_age_seconds
    ):
        return {**ipo_calendar_cache["payload"], "cached": True}

    try:
        session = requests.Session()
        session.headers.update(NSE_HEADERS)

        # NSE normally sets the required cookies on its home page. The API can
        # still respond without them on some networks, so do not fail early.
        try:
            session.get("https://www.nseindia.com", timeout=10)
        except requests.RequestException:
            pass

        response = session.get(
            "https://www.nseindia.com/api/ipo-current-issue",
            timeout=15,
        )
        response.raise_for_status()
        raw_issues = response.json()

        if isinstance(raw_issues, dict):
            raw_issues = raw_issues.get("data", [])
        elif not isinstance(raw_issues, list):
            raw_issues = []

        issues = []
        for issue in raw_issues:
            if not isinstance(issue, dict):
                continue

            subscription = issue.get("noOfTime")
            try:
                subscription_display = f"{float(subscription):.2f}x"
            except (TypeError, ValueError):
                subscription_display = "—"

            issues.append({
                "company": issue.get("companyName") or issue.get("symbol") or "NSE issue",
                "symbol": issue.get("symbol") or "—",
                "security_type": issue.get("series") or "—",
                "open_date": issue.get("issueStartDate") or "—",
                "close_date": issue.get("issueEndDate") or "—",
                "price_band": issue.get("issuePrice") or "—",
                "status": issue.get("status") or "Unknown",
                "subscription": subscription_display,
            })

        payload = {
            "issues": issues,
            "source": "NSE India",
            "source_url": "https://www.nseindia.com/market-data/all-upcoming-issues-ipo",
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "cached": False,
        }
        ipo_calendar_cache["updated_at"] = now
        ipo_calendar_cache["payload"] = payload
        return payload

    except (requests.RequestException, ValueError, TypeError) as error:
        raise HTTPException(
            status_code=502,
            detail=(
                "NSE's live IPO feed is temporarily unavailable. "
                "Please try Refresh live data in a moment."
            ),
        ) from error
