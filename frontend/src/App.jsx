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
  const [marketNews, setMarketNews] = useState([]);
  const [loadingNews, setLoadingNews] = useState(false);
  const [newsError, setNewsError] = useState("");
  const [activeView, setActiveView] = useState("home");
  const [homeSearch, setHomeSearch] = useState("");
  const [ipoTab, setIpoTab] = useState("Open");
  const [ipoFilter, setIpoFilter] = useState("All");
  const [ipoPage, setIpoPage] = useState(1);
  const [ipoIssues, setIpoIssues] = useState([]);
  const [loadingIpoIssues, setLoadingIpoIssues] = useState(false);
  const [ipoCalendarError, setIpoCalendarError] = useState("");
  const [ipoCalendarMeta, setIpoCalendarMeta] = useState(null);

  // market overview & category news states
  const [marketOverview, setMarketOverview] = useState([]);
  const [loadingMarketOverview, setLoadingMarketOverview] = useState(false);
  const [marketCategoryTab, setMarketCategoryTab] = useState("stocks");
  const [marketCategoryNews, setMarketCategoryNews] = useState([]);
  const [loadingMarketCategoryNews, setLoadingMarketCategoryNews] = useState(false);
  
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
     stock chart search
  ========================= */
  const loadMarketNews = async (company) => {
    setLoadingNews(true);
    setNewsError("");

    try {
      const response = await fetch(
        `${API_URL}/market/${encodeURIComponent(stockSymbol)}/news?company=${encodeURIComponent(company)}`
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(getErrorMessage(data));
      }

      setMarketNews(data.articles || []);
    } catch (error) {
      setMarketNews([]);
      setNewsError(error.message);
    } finally {
      setLoadingNews(false);
    }
  };

  const handleStockSearch = async (requestedRange = chartRange, requestedSymbol = stockSymbol) => {
  const selectedRange = typeof requestedRange === "string" ? requestedRange : chartRange;
  const selectedSymbol = requestedSymbol.trim().toUpperCase();

  if (!selectedSymbol || loadingStock) return;

  setLoadingStock(true);
  setStockError("");

  try {
    const response = await fetch(
      `${API_URL}/market/${encodeURIComponent(selectedSymbol)}?range_key=${selectedRange}`
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(getErrorMessage(data));
    }

    setStockSymbol(selectedSymbol);
    setChartRange(selectedRange);
    setStockData(data);
    loadMarketNews(data.company_name || selectedSymbol);
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


const loadIpoCalendar = async () => {
  setLoadingIpoIssues(true);
  setIpoCalendarError("");

  try {
    const response = await fetch(`${API_URL}/ipo-calendar`);
    const data = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(getErrorMessage(data));
    }

    // Support both the old "issues" format and the new
    // category-based format returned by the backend.
    let allIssues = [];

    if (Array.isArray(data?.issues)) {
      allIssues = data.issues;
    } else {
      const categories = [
        ["upcoming", "UPCOMING"],
        ["open", "OPEN"],
        ["closed", "CLOSED"],
        ["listed", "LISTED"],
      ];

      for (const [key, defaultStatus] of categories) {
        if (Array.isArray(data?.[key])) {
          const categoryIssues = data[key].map((issue) => ({
            ...issue,
            status: issue.status || defaultStatus,
          }));

          allIssues.push(...categoryIssues);
        }
      }
    }

    // Normalize field names so the existing table can display them.
    const normalizedIssues = allIssues.map((issue) => ({
      ...issue,
      company:
        issue.company ||
        issue.companyName ||
        issue.company_name ||
        issue.name ||
        "Unknown IPO",
      symbol: issue.symbol || "—",
      status: String(issue.status || "").toUpperCase(),

      price_band:
        issue.price_band ||
        issue.priceBand ||
        issue.issuePrice ||
        "—",
      open_date:
        issue.open_date ||
        issue.openDate ||
        issue.issueStartDate ||
        "—",
      close_date:
        issue.close_date ||
        issue.closeDate ||
        issue.issueEndDate ||
        "—",
      security_type:
        issue.security_type ||
        issue.securityType ||
        issue.type ||
        "—",
      subscription: issue.subscription ?? "—",
    }));

    console.log("IPO calendar response:", data);
    console.log("Normalized IPO issues:", normalizedIssues);

    setIpoIssues(normalizedIssues);

    setIpoCalendarMeta({
      source: data?.source || "IPO data provider",
      updatedAt: data?.updated_at,
      sourceUrl: data?.source_url,
      cached: data?.cached,
    });

    setIpoPage(1);
  } catch (requestError) {
    console.error("IPO calendar error:", requestError);

    setIpoCalendarError(
      requestError.message || "Unable to load the IPO calendar."
    );

    setIpoIssues([]);
  } finally {
    setLoadingIpoIssues(false);
  }
};



  /* =========================
     MARKET OVERVIEW
  ========================= */

  const getCategoryLabel = (key) => ({
    stocks:       "NSE / BSE Equities",
    ipo:          "Upcoming & Recent IPOs",
    fo:           "Futures & Options",
    mutual_funds: "Mutual Fund News",
  }[key] || key);

  const loadMarketOverview = async () => {
    setLoadingMarketOverview(true);
    try {
      const res = await fetch(`${API_URL}/market-overview`);
      const data = await res.json();
      setMarketOverview(data.indices || []);
    } catch {
      setMarketOverview([]);
    } finally {
      setLoadingMarketOverview(false);
    }
  };

  const loadMarketCategoryNews = async (category) => {
    setLoadingMarketCategoryNews(true);
    setMarketCategoryNews([]);
    try {
      const res = await fetch(`${API_URL}/market-news?category=${category}`);
      const data = await res.json();
      setMarketCategoryNews(data.articles || []);
    } catch {
      setMarketCategoryNews([]);
    } finally {
      setLoadingMarketCategoryNews(false);
    }
  };

  const openMarkets = () => {
    setActiveView("markets");
    loadMarketOverview();
    loadMarketCategoryNews("stocks");
    setMarketCategoryTab("stocks");
  };

  const openIpoZone = () => {
    setActiveView("ipo");
    loadIpoCalendar();
  };

  const isFollowing = stockData
  ? watchlist.includes(stockData.symbol)
  : false;

  const openResearch = () => {
    setActiveView("research");
  };

  const handleHomeSearch = (event) => {
    event.preventDefault();
    const symbol = homeSearch.trim().toUpperCase();

    if (symbol) {
      setStockSymbol(symbol);
    }

    setActiveView("markets");
    handleStockSearch(chartRange, symbol || stockSymbol);
  };

  const filteredIpoIssues = ipoIssues.filter((issue) => {
    const status = (issue.status || "").toLowerCase();
    const matchesTab =
      ipoTab === "Open"
        ? status.includes("active") || status.includes("open")
        : ipoTab === "Upcoming"
          ? status.includes("upcoming")
          : ipoTab === "Closed"
            ? status.includes("closed")
            : status.includes("listed");
    const matchesFilter = ipoFilter === "All" || issue.security_type === ipoFilter;
    return matchesTab && matchesFilter;
  });
  const ipoPageSize = 4;
  const ipoPageCount = Math.max(1, Math.ceil(filteredIpoIssues.length / ipoPageSize));
  const visibleIpoIssues = filteredIpoIssues.slice(
    (ipoPage - 1) * ipoPageSize,
    ipoPage * ipoPageSize
  );

  /* =========================
     RENDER
  ========================= */

  return (
    <div className="app">

      {/* ================= HEADER ================= */}

      <header className="site-header">
        <button className="brand" onClick={() => setActiveView("home")}>
          <span className="brand-mark">IX</span>
          <span>InsightX <em>AI</em></span>
        </button>

        <nav className="main-nav" aria-label="Main navigation">
          <button onClick={openMarkets}>Markets</button>
          <button onClick={openMarkets}>Stocks</button>
          <button onClick={() => setActiveView("home")}>Discover</button>
          <button onClick={openIpoZone}>IPOs</button>
          <button onClick={openResearch}>AI Research</button>
        </nav>

        <button className="profile-button" aria-label="Open profile">
          <span>H</span>
          <b>Profile</b>
        </button>
      </header>

      <main>

        {activeView === "home" && (
          <section className="home-page">
            <div className="home-hero" id="discover">
              <div className="hero-copy">
                <p className="eyebrow">INDIA'S RESEARCH-FIRST MARKET PLATFORM</p>
                <h1>Invest with <span>clarity,</span><br />not noise.</h1>
                <p className="hero-description">
                  Explore markets, understand IPO documents, and turn complex financial information into clear, AI-powered research.
                </p>

                <div className="hero-actions">
                  <button className="primary-cta" onClick={openResearch}>Start AI research <span>→</span></button>
                  <button className="secondary-cta" onClick={() => setActiveView("markets")}>Explore markets</button>
                </div>
              </div>

              <div className="hero-visual" aria-hidden="true">
                <div className="orb orb-one" />
                <div className="orb orb-two" />
                <div className="signal-card signal-main">
                  <div className="signal-heading"><span className="pulse-dot" /> MARKET SIGNAL</div>
                  <strong>Research before reaction.</strong>
                  <div className="mini-chart"><i /><i /><i /><i /><i /><i /><i /></div>
                </div>
                <div className="signal-card signal-float">
                  <span>AI RESEARCH</span>
                  <strong>DRHP → Insight</strong>
                </div>
              </div>
            </div>

            <section className="market-overview" id="market-overview">
              <div className="section-title-row">
                <div>
                  <p className="eyebrow">MARKET OVERVIEW</p>
                  <h2>Start with the market pulse.</h2>
                </div>
                <button className="text-link" onClick={() => setActiveView("markets")}>Open market workspace <span>→</span></button>
              </div>

              <div className="index-grid">
                {[
                  ["NIFTY 50", "India's 50 leading companies", "NI"],
                  ["SENSEX", "30 large-cap BSE companies", "SE"],
                  ["BANK NIFTY", "Banking sector benchmark", "BN"],
                  ["INDIA VIX", "Market volatility indicator", "VX"],
                ].map(([name, description, code]) => (
                  <button className="index-card" key={name} onClick={() => setActiveView("markets")}>
                    <span className="index-icon">{code}</span>
                    <span className="index-content"><b>{name}</b><small>{description}</small></span>
                    <span className="card-arrow">↗</span>
                  </button>
                ))}
              </div>
            </section>

            <form className="universal-search" onSubmit={handleHomeSearch}>
              <span className="search-icon">⌕</span>
              <input
                value={homeSearch}
                onChange={(event) => setHomeSearch(event.target.value)}
                placeholder="Search stocks, companies, IPOs, or ask InsightX AI..."
                aria-label="Search markets and research"
              />
              <kbd>Enter</kbd>
            </form>

            <section className="product-rail" id="stocks-preview">
              <article>
                <span className="feature-number">01</span>
                <h3>Markets & stocks</h3>
                <p>Company pages, price history, watchlists, and market context in one calm workspace.</p>
              </article>
              <article>
                <span className="feature-number">02</span>
                <h3>IPOs decoded</h3>
                <p>Upload a DRHP or RHP and surface the numbers, risks, and promises that matter.</p>
              </article>
              <article>
                <span className="feature-number">03</span>
                <h3>AI in your language</h3>
                <p>Ask in English, Hindi, or Hinglish and get simple, document-grounded answers.</p>
              </article>
            </section>
          </section>
        )}

        {activeView === "markets" && (
          <section className="market-page">

            {/* ── TOPBAR ── */}
            <div className="market-page-topbar">
              <button className="back-link" onClick={() => setActiveView("home")}>← Discover</button>
              <span>MARKETS</span>
              <button className="research-link" onClick={openResearch}>Analyze an IPO →</button>
            </div>

            {/* ── MARKET PULSE HERO ── */}
            <div className="mkt-hero">
              <div className="mkt-hero-copy">
                <p className="eyebrow">LIVE MARKET PULSE · INDIA</p>
                <h1>Markets at a glance.</h1>
                <p>Track indices, read category news, and research any listed stock — all in one workspace.</p>
              </div>
            </div>

            {/* ── LIVE INDEX TICKERS ── */}
            <div className="index-tickers">
              {loadingMarketOverview && (
                <div className="index-tickers-loading">Loading indices…</div>
              )}
              {marketOverview.map((idx) => (
                <div
                  key={idx.name}
                  className={`index-ticker-card ${idx.change == null ? "" : idx.change >= 0 ? "idx-up" : "idx-down"}`}
                >
                  <div className="idx-top">
                    <span className="idx-name">{idx.name}</span>
                    <span className="idx-label">{idx.label}</span>
                  </div>
                  <strong className="idx-price">
                    {idx.price == null ? "—" : idx.price.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                  </strong>
                  <span className={`idx-change ${idx.change == null ? "" : idx.change >= 0 ? "positive" : "negative"}`}>
                    {idx.change == null
                      ? "Data unavailable"
                      : `${idx.change >= 0 ? "+" : ""}${idx.change} (${idx.change_percent}%)`}
                  </span>
                </div>
              ))}
            </div>

            {/* ── MARKET CATEGORY NEWS ── */}
            <div className="market-cat-section">
              <div className="market-cat-header">
                <div>
                  <p className="eyebrow">MARKET NEWS</p>
                  <h2>News by segment.</h2>
                </div>
                <div className="market-cat-tabs">
                  {[
                    { key: "stocks",       label: "📈 Stocks" },
                    { key: "ipo",          label: "🚀 IPO" },
                    { key: "fo",           label: "⚡ F&O" },
                    { key: "mutual_funds", label: "💼 Mutual Funds" },
                  ].map(({ key, label }) => (
                    <button
                      key={key}
                      className={marketCategoryTab === key ? "active-cat-tab" : ""}
                      onClick={() => {
                        setMarketCategoryTab(key);
                        loadMarketCategoryNews(key);
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <p className="cat-subtitle">{getCategoryLabel(marketCategoryTab)}</p>

              {loadingMarketCategoryNews ? (
                <div className="cat-news-loading">
                  <span className="spinner" />
                  Loading latest news…
                </div>
              ) : (
                <div className="cat-news-grid">
                  {marketCategoryNews.length === 0 ? (
                    <p className="news-empty">No recent articles found.</p>
                  ) : (
                    marketCategoryNews.map((article, i) => (
                      <a
                        href={article.url}
                        target="_blank"
                        rel="noreferrer"
                        className="cat-news-card"
                        key={`${article.url}-${i}`}
                      >
                        <span className="cat-news-source">{article.source}</span>
                        <b className="cat-news-title">{article.title}</b>
                        <small className="cat-news-date">{new Date(article.published_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</small>
                      </a>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* ── COMPANY EXPLORER ── */}
            <div className="market-search-panel">
              <div>
                <p className="eyebrow">COMPANY EXPLORER</p>
                <h2>Research any listed company.</h2>
              </div>
              <div className="market-search-controls market-page-search">
                <input
                  value={stockSymbol}
                  onChange={(event) => setStockSymbol(event.target.value.toUpperCase())}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") handleStockSearch();
                  }}
                  placeholder="Enter NSE symbol, e.g. TCS"
                />
                <button onClick={() => handleStockSearch()} disabled={loadingStock}>
                  {loadingStock ? "Loading..." : "Search"}
                </button>
              </div>
            </div>

            {stockError && <p className="market-error" style={{padding:"0 clamp(20px,5vw,80px)"}}>{stockError}</p>}

            {!stockData && !loadingStock && (
              <div className="market-empty-state">
                <span>⌁</span>
                <h2>Start with a company symbol</h2>
                <p>Try RELIANCE, TCS, INFY, HDFCBANK, or ITC.</p>
              </div>
            )}

            {stockData && (
              <div className="stock-result-wrapper">
                <div className="company-profile-header">
                  <div>
                    <p className="eyebrow">NSE · {stockData.symbol.replace(".NS", "")}</p>
                    <h2>{stockData.company_name || stockData.symbol}</h2>
                    <p className="market-disclaimer">Delayed market data · For research, not investment advice</p>
                  </div>
                  <button className={`follow-btn ${isFollowing ? "following" : ""}`} onClick={handleFollow}>
                    {isFollowing ? "✓ Following" : "+ Follow"}
                  </button>
                </div>

                <div className="quote-row">
                  <div><span>Latest price</span><strong>₹{Number(stockData.price).toLocaleString("en-IN")}</strong></div>
                  <div><span>Day change</span><strong className={stockData.change >= 0 ? "positive" : "negative"}>{stockData.change >= 0 ? "+" : ""}{stockData.change} ({stockData.change_percent}%)</strong></div>
                  <div><span>Currency</span><strong>{stockData.currency || "INR"}</strong></div>
                </div>

                <div className="chart-ranges market-ranges">
                  {["1D", "5D", "1M", "6M", "YTD", "1Y", "5Y", "MAX"].map((range) => (
                    <button key={range} className={chartRange === range ? "active-range" : ""} onClick={() => handleStockSearch(range)} disabled={loadingStock}>{range}</button>
                  ))}
                </div>

                <div className="market-chart-card"><StockChart candles={stockData.candles} /></div>

                <div className="market-details-grid">
                  <section className="market-detail-card">
                    <div className="card-title-row"><h3>Market information</h3><span>LIVE VIEW</span></div>
                    <div className="metrics-grid">
                      {Object.entries(stockData.metrics || {}).map(([label, value]) => (
                        <div key={label}><span>{label}</span><b>{value == null ? "—" : `₹${Number(value).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`}</b></div>
                      ))}
                    </div>
                  </section>

                  <section className="market-detail-card news-card">
                    <div className="card-title-row"><h3>Relevant news</h3><span>{loadingNews ? "LOADING" : "LATEST"}</span></div>
                    {newsError && <p className="market-error">{newsError}</p>}
                    {!loadingNews && !newsError && marketNews.length === 0 && <p className="news-empty">No recent articles found for this company.</p>}
                    <div className="news-list">
                      {marketNews.map((article, index) => (
                        <a href={article.url} target="_blank" rel="noreferrer" key={`${article.url}-${index}`}>
                          <span>{article.source}</span>
                          <b>{article.title}</b>
                          <small>{article.published_at}</small>
                        </a>
                      ))}
                    </div>
                  </section>
                </div>
              </div>
            )}
          </section>
        )}

        {activeView === "ipo" && (
          <section className="ipo-zone">
            <div className="ipo-zone-topbar">
              <button className="back-link" onClick={() => setActiveView("home")}>← Discover</button>
              <span>IPO ZONE</span>
              <button className="research-link" onClick={openResearch}>Upload a DRHP →</button>
            </div>

            <div className="ipo-hero">
              <div>
                <p className="eyebrow">IPO RESEARCH, SIMPLIFIED</p>
                <h1>Know the business<br />before the <span>buzz.</span></h1>
                <p>Track upcoming issues, decode offer documents, compare key risks, and build your own evidence-based IPO thesis.</p>
                <div className="ipo-hero-actions">
                  <button className="primary-cta" onClick={openResearch}>Analyze a DRHP <span>→</span></button>
                  <button className="secondary-cta" onClick={() => document.getElementById("ipo-calendar")?.scrollIntoView({ behavior: "smooth" })}>View IPO calendar</button>
                </div>
              </div>

              <div className="ipo-score-preview" aria-label="IPO research preview">
                <div className="ipo-score-header"><span>INSIGHTX IPO SCORE</span><b>PRE-ISSUE</b></div>
                <div className="score-orbit"><strong>?</strong><small>Research begins<br />with the DRHP</small></div>
                <div className="score-factors"><span>Financial health</span><span>Valuation context</span><span>Risk factors</span></div>
              </div>
            </div>

            <section className="ipo-calendar" id="ipo-calendar">
              <div className="section-title-row">
                <div>
                  <p className="eyebrow">IPO CALENDAR</p>
                  <h2>Find the issue worth researching.</h2>
                </div>
                <div className="ipo-tabs" role="tablist" aria-label="IPO status">
                  {["Upcoming", "Open", "Closed", "Listed"].map((tab) => (
                    <button key={tab} onClick={() => { setIpoTab(tab); setIpoPage(1); }} className={ipoTab === tab ? "active-ipo-tab" : ""}>{tab}</button>
                  ))}
                </div>
              </div>

              <div className="ipo-tracker-note">
                <span>LIVE • NSE INDIA</span>
                <p>
                  Current public issues are loaded from NSE India. {ipoCalendarMeta?.cached ? "Recently refreshed data is being shown." : "Refresh for the latest available feed."}
                  {ipoCalendarMeta?.sourceUrl && <> <a href={ipoCalendarMeta.sourceUrl} target="_blank" rel="noreferrer">View source ↗</a></>}
                </p>
              </div>

              <div className="ipo-filter-bar">
                <div>
                  <span>Security type</span>
                  {["All", "EQ"].map((filter) => (
                    <button
                      key={filter}
                      className={ipoFilter === filter ? "active-filter" : ""}
                      onClick={() => {
                        setIpoFilter(filter);
                        setIpoPage(1);
                      }}
                    >
                      {filter}
                    </button>
                  ))}
                </div>
                <button className="filter-icon" onClick={loadIpoCalendar} disabled={loadingIpoIssues}>
                  {loadingIpoIssues ? "Refreshing…" : "↻ Refresh live data"}
                </button>
              </div>

              <div className="ipo-table-shell">
                <table className="ipo-table">
                  <thead>
                    <tr>
                      <th>Company</th>
                      <th>Symbol</th>
                      <th>Price band</th>
                      <th>Open</th>
                      <th>Close</th>
                      <th>Status</th>
                      <th>Subscription</th>
                      <th aria-label="Open IPO analysis" />
                    </tr>
                  </thead>
                  <tbody>
                    {loadingIpoIssues && (
                      <tr><td className="ipo-table-message" colSpan="8">Loading the latest NSE public issues…</td></tr>
                    )}
                    {!loadingIpoIssues && ipoCalendarError && (
                      <tr><td className="ipo-table-message ipo-table-error" colSpan="8">{ipoCalendarError}</td></tr>
                    )}
                    {!loadingIpoIssues && !ipoCalendarError && visibleIpoIssues.length === 0 && (
                      <tr><td className="ipo-table-message" colSpan="8">No {ipoTab.toLowerCase()} NSE issues are available in the current feed.</td></tr>
                    )}
                    {!loadingIpoIssues && visibleIpoIssues.map((issue) => (
                      <tr key={issue.company}>
                        <td><b>{issue.company}</b><small>{issue.security_type}</small></td>
                        <td>{issue.symbol}</td>
                        <td>{issue.price_band}</td>
                        <td>{issue.open_date ? new Date(issue.open_date).toLocaleDateString("en-IN", { timeZone: "UTC" }) : "—"}</td>
                        <td>{issue.close_date ? new Date(issue.close_date).toLocaleDateString("en-IN", { timeZone: "UTC" }) : "—"}</td>
                        <td><span className="ipo-status">{issue.status}</span></td>
                        <td className="growth-cell">{issue.subscription}</td>
                        <td><button className="read-ipo-btn" onClick={openResearch}>Analyze</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="ipo-pagination" aria-label="IPO tracker pages">
                <button disabled={ipoPage === 1} onClick={() => setIpoPage((page) => page - 1)}>←</button>
                {Array.from({ length: ipoPageCount }, (_, index) => index + 1).map((page) => (
                  <button key={page} className={ipoPage === page ? "active-page" : ""} onClick={() => setIpoPage(page)}>{page}</button>
                ))}
                <button disabled={ipoPage === ipoPageCount} onClick={() => setIpoPage((page) => page + 1)}>→</button>
              </div>
            </section>

            <section className="ipo-tool-grid">
              <article className="ipo-tool ipo-tool-featured">
                <span className="tool-icon">✦</span>
                <p className="eyebrow">DRHP INTELLIGENCE</p>
                <h3>Turn a 600-page prospectus into a research brief.</h3>
                <p>Extract the company story, financial signals, use of proceeds, risks, and question-ready evidence.</p>
                <button className="text-link" onClick={openResearch}>Upload a document <span>→</span></button>
              </article>
              <article className="ipo-tool">
                <span className="tool-icon">◌</span>
                <h3>Subscription tracker</h3>
                <p>Compare retail, HNI, and QIB subscription when a verified live IPO feed is connected.</p>
                <span className="coming-soon">DATA FEED READY</span>
              </article>
              <article className="ipo-tool">
                <span className="tool-icon">↗</span>
                <h3>Listing radar</h3>
                <p>Track listing-day performance, post-listing price action, and the gap between hype and reality.</p>
                <span className="coming-soon">COMING NEXT</span>
              </article>
              <article className="ipo-tool">
                <span className="tool-icon">◎</span>
                <h3>Peer comparison</h3>
                <p>Put issue valuation, growth, margins, and risks next to listed peers—not social-media tips.</p>
                <span className="coming-soon">COMING NEXT</span>
              </article>
            </section>

            <section className="ipo-checklist">
              <div>
                <p className="eyebrow">THE INSIGHTX FRAMEWORK</p>
                <h2>Four questions before you apply.</h2>
              </div>
              <ol>
                <ol><p><b>1. What is changing?</b></p><span>Identify the growth trigger, not just the headline.</span></ol>
                <ol><p><b>2. Where does the money go?</b></p><span>Review use of proceeds, debt reduction, and promoter exits.</span></ol>
                <ol><p><b>3. What can go wrong?</b></p><span>Read the concentration, litigation, governance, and execution risks.</span></ol>
                <ol><p><b>4. What are the alternatives?</b></p><span>Compare the business and its valuation with listed peers.</span></ol>
              </ol>
            </section>

            <footer className="site-footer">
              <div className="footer-brand">
                <button className="brand" onClick={() => setActiveView("home")}>
                  <span className="brand-mark">IX</span>
                  <span>InsightX <em>AI</em></span>
                </button>
                <p>Market intelligence for curious investors. Research first, react later.</p>
              </div>
              <div className="footer-links">
                <div><b>Product</b><button onClick={() => setActiveView("markets")}>Markets</button><button onClick={openIpoZone}>IPO Zone</button><button onClick={openResearch}>AI Research</button></div>
                <div><b>Research</b><button onClick={openResearch}>Upload a DRHP</button><button onClick={openResearch}>IPO checklist</button><button onClick={() => setActiveView("markets")}>Watchlist</button></div>
                <div><b>Support</b><button>Privacy</button><button>Terms</button><button>Contact</button></div>
              </div>
              <div className="footer-bottom">
                <p>ⓘ InsightX does not provide buy/sell recommendations or investment tips. Information is for educational and research purposes only.</p>
                <span>© 2026 InsightX AI</span>
              </div>
            </footer>
          </section>
        )}

        {/* ================= UPLOAD SCREEN ================= */}

        {activeView === "research" && !uploaded && (
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

        {activeView === "research" && uploaded && (

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
