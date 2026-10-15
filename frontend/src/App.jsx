import { useState } from "react";
import ReactMarkdown from "react-markdown";
import "./App.css";
import StockChart from "./StockChart"; // Import the StockChart component
const API_URL = "http://127.0.0.1:8000";

function App() {
  /* =========================
     STATES
  ========================= */

  const [file, setFile] = useState(null);
  const [uploaded, setUploaded] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([]);
  const [asking, setAsking] = useState(false);

  const [language, setLanguage] = useState("hinglish");

  const [summarizing, setSummarizing] = useState(false);
  const [analyzingRisk, setAnalyzingRisk] = useState(false);
  const [analyzingFinancial, setAnalyzingFinancial] = useState(false);

  const [loadingRiskScore, setLoadingRiskScore] = useState(false);
  const [riskScore, setRiskScore] = useState(null);

  const [loadingInsights, setLoadingInsights] = useState(false);
  const [keyInsights, setKeyInsights] = useState(null);

  const [error, setError] = useState("");

  // snapshot states adds here:
  const [snapshot, setSnapshot] = useState(null);
  const [loadingSnapshot, setLoadingSnapshot] = useState(false);

  // stock chart state
  const [stockSymbol, setStockSymbol] = useState("RELIANCE");
  const [stockData, setStockData] = useState(null);
  const [loadingStock, setLoadingStock] = useState(false);
  const [stockError, setStockError] = useState("");
  const [chartRange, setChartRange] = useState("1M"); // Default range is 1 month
  
  /* =========================
     HELPER: API ERROR
  ========================= */

  const getErrorMessage = (data) => {
    if (!data) return "Something went wrong.";

    if (typeof data.detail === "string") {
      return data.detail;
    }

    if (typeof data.detail === "object") {
      return (
        data.detail.message ||
        data.detail.error ||
        JSON.stringify(data.detail)
      );
    }

    if (typeof data.error === "string") {
      return data.error;
    }

    return "Something went wrong.";
  };

  const formatInsights = (data) => {
  try {
    if (typeof data === "string") {
      return JSON.parse(data);
    }

    return data;
  } catch (error) {
    console.error("Insights parsing error:", error);
    return null;
  }
};

  /* =========================
     UPLOAD PDF
  ========================= */

  const handleUpload = async () => {
    if (!file) {
      alert("Please select a PDF first!");
      return;
    }

    setUploading(true);
    setError("");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(`${API_URL}/upload`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(getErrorMessage(data));
      }

      setUploaded(true);

      setMessages([
        {
          type: "ai",
          text: `# Document Ready ✅

Your IPO document has been successfully processed.

**${data.total_chunks} chunks** were created from the document.

You can now:

- Ask questions
- Generate a summary
- Analyze risk factors
- Analyze financial performance
- Calculate IPO risk score
- Generate key insights`,
        },
      ]);
    } catch (error) {
      console.error("Upload Error:", error);

      setError(error.message);

      alert(`Upload failed: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  /* =========================
     ASK QUESTION
  ========================= */

  const handleAsk = async () => {
    if (!question.trim() || asking) return;

    const userQuestion = question;

    setMessages((prev) => [
      ...prev,
      {
        type: "user",
        text: userQuestion,
      },
    ]);

    setQuestion("");
    setAsking(true);

    try {
      const response = await fetch(`${API_URL}/ask`, {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          question: userQuestion,
          language: language,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(getErrorMessage(data));
      }

      let answer = data.answer;

      if (typeof answer === "object") {
        answer =
          answer?.text ||
          answer?.message ||
          JSON.stringify(answer);
      }

      setMessages((prev) => [
        ...prev,
        {
          type: "ai",
          text: answer || "No answer received from AI.",
        },
      ]);
    } catch (error) {
      console.error("Ask Error:", error);

      setMessages((prev) => [
        ...prev,
        {
          type: "ai",
          text: `## Error ❌

${error.message}`,
        },
      ]);
    } finally {
      setAsking(false);
    }
  };

  /* =========================
     GENERATE SUMMARY
  ========================= */

  const handleSummary = async () => {
    if (summarizing) return;

    setSummarizing(true);

    setMessages((prev) => [
      ...prev,
      {
        type: "user",
        text: "📄 Generate a summary of this IPO document",
      },
    ]);

    try {
      const response = await fetch(`${API_URL}/summary`);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(getErrorMessage(data));
      }

      setMessages((prev) => [
        ...prev,
        {
          type: "ai",
          text: data.summary || "Summary not available.",
        },
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          type: "ai",
          text: `## Error ❌

${error.message}`,
        },
      ]);
    } finally {
      setSummarizing(false);
    }
  };

  /* =========================
     RISK ANALYSIS
  ========================= */

  const handleRiskAnalysis = async () => {
    if (analyzingRisk) return;

    setAnalyzingRisk(true);

    setMessages((prev) => [
      ...prev,
      {
        type: "user",
        text: "⚠️ Analyze the risk factors in this IPO document",
      },
    ]);

    try {
      const response = await fetch(`${API_URL}/risk-analysis`);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(getErrorMessage(data));
      }

      setMessages((prev) => [
        ...prev,
        {
          type: "ai",
          text: data.risk_analysis || "Risk analysis not available.",
        },
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          type: "ai",
          text: `## Error ❌

${error.message}`,
        },
      ]);
    } finally {
      setAnalyzingRisk(false);
    }
  };

  /* =========================
     FINANCIAL ANALYSIS
  ========================= */

  const handleFinancialAnalysis = async () => {
    if (analyzingFinancial) return;

    setAnalyzingFinancial(true);

    setMessages((prev) => [
      ...prev,
      {
        type: "user",
        text: "📊 Analyze the financial performance of this company",
      },
    ]);

    try {
      const response = await fetch(`${API_URL}/financial-analysis`);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(getErrorMessage(data));
      }

      setMessages((prev) => [
        ...prev,
        {
          type: "ai",
          text:
            data.financial_analysis ||
            data.answer ||
            "Financial analysis not available.",
        },
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          type: "ai",
          text: `## Error ❌

${error.message}`,
        },
      ]);
    } finally {
      setAnalyzingFinancial(false);
    }
  };

  /* =========================
     RISK SCORE
  ========================= */

  const handleRiskScore = async () => {
    if (loadingRiskScore) return;

    setLoadingRiskScore(true);

    try {
      const response = await fetch(`${API_URL}/risk-score`);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(getErrorMessage(data));
      }

      setRiskScore(data);

      setMessages((prev) => [
        ...prev,
        {
          type: "user",
          text: "🎯 Calculate IPO Risk Score",
        },
        {
          type: "ai",
          text: `# IPO Risk Score 🎯

## Overall Score: ${data.overall_score}/100

**Risk Level:** ${data.risk_level}

The detailed risk dashboard is displayed above.`,
        },
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          type: "ai",
          text: `## Risk Score Error ❌

${error.message}`,
        },
      ]);
    } finally {
      setLoadingRiskScore(false);
    }
  };

  /* =========================
     KEY INSIGHTS
  ========================= */

  const handleInsights = async () => {
  try {
    setLoadingInsights(true);

    const response = await fetch(
      "http://127.0.0.1:8000/insights"
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || "Failed to generate insights");
    }

    let insights = data.insights;

    // Convert JSON string to object if needed
    if (typeof insights === "string") {
      try {
        insights = JSON.parse(insights);
      } catch {
        // If normal text, keep it
      }
    }

    setKeyInsights(insights);

  } catch (error) {
    console.error(error);

    setKeyInsights({
      error: error.message,
    });
  } finally {
    setLoadingInsights(false);
  }
};

  /* =========================
     IPO SNAPSHOT
  ========================= */
  const handleSnapshot = async () => {
    if (loadingSnapshot) return;
    
    setLoadingSnapshot(true);

    try {
      const response = await fetch(`${API_URL}/ipo-snapshot`);
      const data = await response.json(); 

      if (!response.ok) {
        throw new Error(getErrorMessage(data));
      }
      
      setSnapshot(data.snapshot);
    } catch (error) {
      console.error("Snapshot Error:", error);
      setSnapshot({ error: error.message });
    } finally {
      setLoadingSnapshot(false);
    }
  };


  /* =========================
     QUICK QUESTIONS
  ========================= */

  const handleQuickQuestion = (quickQuestion) => {
    if (asking) return;

    setQuestion(quickQuestion);

    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          type: "user",
          text: quickQuestion,
        },
      ]);
    }, 0);
  };

  /* =========================
     stock chart search
  ========================= */
  const handleStockSearch = async (requestedRange = chartRange) => {
  if (!stockSymbol.trim() || loadingStock) return;

  setLoadingStock(true);
  setStockError("");

  try {
    const response = await fetch(
      `${API_URL}/market/${encodeURIComponent(stockSymbol)}?range_key=${requestedRange}`
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(getErrorMessage(data));
    }

    setChartRange(requestedRange);
    setStockData(data);
  } catch (error) {
    setStockData(null);
    setStockError(error.message);
  } finally {
    setLoadingStock(false);
  }
};

  /* =========================
     follow button / watch list
  ========================= */
  const [watchlist, setWatchlist] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("ipo_watchlist")) || [];
    } catch {
      return [];
    }
  });
  
  const handleFollow = () => {
    if (!stockData) return;

    setWatchlist((previous) => {
      const alreadyFollowing = previous.includes(stockData.symbol);

      const updated = alreadyFollowing
        ? previous.filter((symbol) => symbol !== stockData.symbol)
        : [...previous, stockData.symbol];

      localStorage.setItem("ipo_watchlist", JSON.stringify(updated));

      return updated;
    });
  };
  /* =========================
     NEW DOCUMENT
  ========================= */

  const handleNewDocument = () => {
    setUploaded(false);
    setFile(null);
    setMessages([]);
    setQuestion("");

    setRiskScore(null);
    setKeyInsights(null);

    setError("");
    setSnapshot(null);
  };

  const isFollowing = stockData
  ? watchlist.includes(stockData.symbol)
  : false;

  /* =========================
     RENDER
  ========================= */

  return (
    <div className="app">

      {/* ================= HEADER ================= */}

      <header>
        <h1>📊 IPO AI Analyzer</h1>

        <p>
          AI-powered IPO document analysis for smarter investment research
        </p>
      </header>

      <main>

        {/* ================= UPLOAD SCREEN ================= */}

        {!uploaded && (
          <section className="upload-card">

            <h2>📄 Upload IPO Document</h2>

            <p>
              Upload your IPO PDF, DRHP, RHP or financial document and let AI
              analyze it.
            </p>

            <input
              type="file"
              accept=".pdf"
              onChange={(e) => setFile(e.target.files[0])}
            />

            {file && (
              <p className="file-name">
                ✅ Selected: {file.name}
              </p>
            )}

            <button
              onClick={handleUpload}
              disabled={uploading}
            >
              {uploading
                ? "⏳ Processing PDF..."
                : "🚀 Upload & Analyze"}
            </button>

            {error && (
              <p
                style={{
                  marginTop: "15px",
                  color: "#dc2626",
                }}
              >
                {error}
              </p>
            )}

          </section>
        )}

        {/* ================= MAIN DASHBOARD ================= */}

        {uploaded && (

          <>

            {/* ================= MARKET DASHBOARD ================= */}
            <section className="market-dashboard">
              <div className="market-search">
                <div>
                  <h2>📈 Market Dashboard</h2>
                  <p>Search an NSE symbol, for example: RELIANCE, TCS, INFY</p>
                </div>

                <div className="market-search-controls">
                  <input
                    value={stockSymbol}
                    onChange={(e) => setStockSymbol(e.target.value.toUpperCase())}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleStockSearch();
                    }}
                    placeholder="NSE symbol"
                  />

                  <button onClick={() => handleStockSearch()} disabled={loadingStock}>
                    {loadingStock ? "Loading..." : "View Chart"}
                  </button>
                </div>
              </div>

              {stockError && <p className="market-error">{stockError}</p>}

              {stockData && (
                <>
                  {/* company header */}
                  <div className="company-header">
                    <div>
                      <h2>{stockData.company_name}</h2>
                      <p>NSE: {stockData.symbol.replace(".NS", "")}</p>
                    </div>

                    <button
                      className={`follow-btn ${isFollowing ? "following" : ""}`}
                      onClick={handleFollow}
                    >
                      {isFollowing ? "✓ Following" : "+ Follow"}
                    </button>   
                  </div>

                  {/* market price card */}
                  <div className="market-price-card">
                    <div>
                      <span>Symbol</span>
                      <h3>{stockData.symbol}</h3>
                    </div>

                    <div>
                      <span>Latest Price</span>
                      <h3>₹{stockData.price}</h3>
                    </div>

                    <div>
                      <span>Day Change</span>
                      <h3 className={stockData.change >= 0 ? "positive" : "negative"}>
                        {stockData.change >= 0 ? "+" : ""}
                        {stockData.change} ({stockData.change_percent}%)
                      </h3>
                    </div>

                    <div className="delayed-label">
                      Delayed/demo data • Not investment advice
                    </div>
                  </div>

                  {/* chart range */}
                  <div className="chart-ranges">
                    {["1D", "5D", "1M", "6M", "YTD", "1Y", "5Y", "MAX"].map((range) => (
                      <button
                        key={range}
                        className={chartRange === range ? "active-range" : ""}
                        onClick={() => handleStockSearch(range)}
                        disabled={loadingStock}
                      >
                        {range}
                      </button>
                    ))}
                  </div>

                  <StockChart candles={stockData.candles} />
                </>
              )}
            </section>
            {/* ================= CHAT ================= */}

            <section className="chat-container">

              {/* HEADER */}

              <div className="chat-header">

                <h2>🤖 IPO AI Assistant</h2>

                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  aria-label="Answer language"
                >
                  <option value="hinglish">Hinglish</option>
                  <option value="hindi">हिंदी</option>
                  <option value="english">English</option>
                </select>

                <button
                  className="summary-btn"
                  onClick={handleSummary}
                  disabled={summarizing}
                >
                  {summarizing
                    ? "Generating..."
                    : "📄 Summary"}
                </button>

                <button
                  className="snapshot-btn"
                  onClick={handleSnapshot}
                  disabled={loadingSnapshot}
                >
                  {loadingSnapshot
                    ? "Extracting..."
                    : "🖼️ IPO Snapshot"}
                </button>

                <button
                  className="risk-btn"
                  onClick={handleRiskAnalysis}
                  disabled={analyzingRisk}
                >
                  {analyzingRisk
                    ? "Analyzing..."
                    : "⚠️ Risk Analysis"}
                </button>

                <button
                  className="financial-btn"
                  onClick={handleFinancialAnalysis}
                  disabled={analyzingFinancial}
                >
                  {analyzingFinancial
                    ? "Analyzing..."
                    : "📊 Financials"}
                </button>

                <button
                  className="feature-btn"
                  onClick={handleRiskScore}
                  disabled={loadingRiskScore}
                >
                  {loadingRiskScore
                    ? "Calculating..."
                    : "🎯 Risk Score"}
                </button>

                <button
                  className="insights-btn"
                  onClick={handleInsights}
                  disabled={loadingInsights}
                >
                  {loadingInsights
                    ? "Generating..."
                    : "💡 Insights"}
                </button>

                <button
                  className="new-document"
                  onClick={handleNewDocument}
                >
                  📁 New Document
                </button>

              </div>


              {/* ================= RISK DASHBOARD ================= */}

              {riskScore && (

                <div className="risk-dashboard">

                  <h2>🎯 IPO Risk Score</h2>

                  <div className="overall-score">

                    <h1>
                      {riskScore.overall_score ?? 0}
                    </h1>

                    <p>/ 100</p>

                  </div>

                  <h3>
                    Risk Level: {riskScore.risk_level || "Unknown"}
                  </h3>


                  <div className="risk-grid">

                    <div className="risk-card">
                      📊 Financial Risk
                      <strong>
                        {riskScore.financial_risk ?? 0}/100
                      </strong>
                    </div>

                    <div className="risk-card">
                      🏢 Business Risk
                      <strong>
                        {riskScore.business_risk ?? 0}/100
                      </strong>
                    </div>

                    <div className="risk-card">
                      📈 Market Risk
                      <strong>
                        {riskScore.market_risk ?? 0}/100
                      </strong>
                    </div>

                    <div className="risk-card">
                      🏛️ Regulatory Risk
                      <strong>
                        {riskScore.regulatory_risk ?? 0}/100
                      </strong>
                    </div>

                    <div className="risk-card">
                      ⚙️ Operational Risk
                      <strong>
                        {riskScore.operational_risk ?? 0}/100
                      </strong>
                    </div>

                  </div>


                  <div className="risk-summary">

                    <h3>AI Risk Summary</h3>

                    <p>
                      {riskScore.summary ||
                        "No risk summary available."}
                    </p>

                  </div>

                </div>

              )}


              {/* ================= KEY INSIGHTS ================= */}

              {keyInsights && (
                <section className="insights-dashboard">

                  <div className="section-heading">
                    <span className="section-icon">💡</span>

                    <div>
                      <span className="ai-badge">AI GENERATED</span>

                      <h2>Key IPO Insights</h2>

                      <p>
                        Important information extracted from the IPO document.
                      </p>
                    </div>
                  </div>

                  <div className="insights-grid">

                    {Object.entries(
                      typeof keyInsights === "string"
                        ? formatInsights(keyInsights) || {}
                        : keyInsights
                    ).map(([key, value], index) => (

                      <div className="insight-card" key={index}>

                        <div className="insight-label">
                          {key
                            .replace(/_/g, " ")
                            .replace(/\b\w/g, (char) => char.toUpperCase())}
                        </div>

                        <div className="insight-value">
                          {typeof value === "object"
                            ? JSON.stringify(value)
                            : value || "Information not available"}
                        </div>

                      </div>

                    ))}

                  </div>

                </section>
              )}
              {snapshot && (
                <section className="snapshot-card">
                  <h2>📌 IPO Snapshot</h2>

                  {snapshot.error ? (
                    <p className="snapshot-error">{snapshot.error}</p>
                  ) : (
                    <div className="snapshot-grid">
                      {Object.entries(snapshot).map(([key, value]) => (
                        <div className="snapshot-item" key={key}>
                          <span>
                            {key.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase())}
                          </span>
                          <strong>{value || "Not found in document"}</strong>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              )}
              {/* ================= MESSAGES ================= */}

              <div className="messages">

                {messages.map((message, index) => (

                  <div
                    key={index}
                    className={`message ${message.type}`}
                  >

                    <strong>
                      {message.type === "user"
                        ? "👤 You"
                        : "🤖 IPO AI"}
                    </strong>

                    <ReactMarkdown>
                      {message.text}
                    </ReactMarkdown>

                  </div>

                ))}


                {(asking ||
                  summarizing ||
                  analyzingRisk ||
                  analyzingFinancial) && (

                  <div className="message ai">

                    <strong>🤖 IPO AI</strong>

                    <p>
                      Thinking and analyzing your IPO document...
                    </p>

                  </div>

                )}

              </div>


              {/* ================= QUESTION BOX ================= */}

              <div className="question-box">

                <input
                  type="text"
                  placeholder="Ask anything about the IPO document..."
                  value={question}
                  onChange={(e) =>
                    setQuestion(e.target.value)
                  }
                  onKeyDown={(e) => {

                    if (e.key === "Enter") {
                      handleAsk();
                    }

                  }}
                  disabled={asking}
                />

                <button
                  onClick={handleAsk}
                  disabled={asking || !question.trim()}
                >
                  {asking
                    ? "Thinking..."
                    : "Send 🚀"}
                </button>

              </div>

            </section>

          </>

        )}

      </main>

    </div>
  );
}

export default App;