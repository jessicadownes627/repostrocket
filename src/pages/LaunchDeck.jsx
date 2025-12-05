import React, { useState, useRef, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useListingStore } from "../store/useListingStore";
import "../styles/launchdeck.css";
import "../styles/trendSense.css";

import { runAIReview } from "../utils/safeAI/runAIReview";
import { runMagicFill } from "../utils/safeAI/runMagicFill";
import { runAutoFill } from "../utils/safeAI/runAutoFill";
import { mergeAITurboSignals } from "../utils/aiTurboMerge";
import { saveLaunchProgress, loadLaunchProgress } from "../utils/saveListing";
import { v4 as uuidv4 } from "uuid";
import { runTrendSense } from "../engines/trendSense";
import { runTrendSensePro } from "../engines/trendSensePro";
import { runTrendSenseUltra } from "../utils/trendSenseUltra";

import {
  formatEbay,
  formatMercari,
  formatPoshmark,
  formatDepop,
  formatEtsy,
  formatFacebook,
  formatGrailed,
  formatVinted,
  formatKidizen,
} from "../utils/formatters";

export default function LaunchDeck() {
  const location = useLocation();
  const storeListing = useListingStore((s) => s.listingData);

  // Accept batch items (from SingleListing) OR fallback to store for single-item mode
  const incomingItems = location.state?.items || null;
  const [items] = useState(incomingItems || (storeListing ? [storeListing] : []));
  const [currentIndex, setCurrentIndex] = useState(0);

  const item = items[currentIndex] || null;

  // Treat this as the current item for launch/export
  const currentItem = item;

  const outputRef = useRef(null);

  const [formattedOutput, setFormattedOutput] = useState("");
  const [enhancedOutput, setEnhancedOutput] = useState("");

  const [aiReview, setAiReview] = useState(null);
  const [aiMagic, setAiMagic] = useState(null);
  const [aiAuto, setAiAuto] = useState(null);
  const [aiMerged, setAiMerged] = useState(null);
  const [aiSuggestions, setAiSuggestions] = useState([]);

  const [activePlatform, setActivePlatform] = useState(null);
  const [showAI, setShowAI] = useState(false);

  const [toast, setToast] = useState("");
  const [trendSense, setTrendSense] = useState(null);

  // Launch progress (per listing, persisted to localStorage)
  const [launchId] = useState(() => currentItem?.id || uuidv4());
  const [launchProgress, setLaunchProgress] = useState(
    loadLaunchProgress(launchId) || {
      mercari: false,
      poshmark: false,
      depop: false,
      ebay: false,
      etsy: false,
      facebook: false,
      grailed: false,
      vinted: false,
      kidizen: false,
    }
  );

  const { trendScore, trendReasons } = runTrendSense(item);
  const trendPro = runTrendSensePro(item);

  useEffect(() => {
    async function loadTS() {
      if (item) {
        const ts = await runTrendSenseUltra(item);
        setTrendSense(ts);
      } else {
        setTrendSense(null);
      }
    }
    loadTS();
  }, [item]);

  if (!item) {
    return (
      <div style={{ padding: "2rem", color: "white" }}>
        No listing found.
      </div>
    );
  }

  /** --------------------------
   * Utilities
   * -------------------------- */

  function updateProgress(platformKey) {
    const updated = {
      ...launchProgress,
      [platformKey]: true,
    };
    setLaunchProgress(updated);
    saveLaunchProgress(launchId, updated);
  }

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(""), 1300);
  }

  function copyText(text) {
    navigator.clipboard.writeText(text);
    showToast("Copied!");
  }

  function normalizeTip(raw) {
    if (!raw) return "";
    if (typeof raw === "string") return raw;
    if (typeof raw.text === "string") return raw.text;
    if (typeof raw.msg === "string") return raw.msg;
    return JSON.stringify(raw);
  }

  function extractSuggestions(merged) {
    if (!merged) return [];
    const pool = [];
    if (merged.review?.suggestions) pool.push(...merged.review.suggestions);
    if (merged.magic?.suggestions) pool.push(...merged.magic.suggestions);
    if (merged.auto?.suggestions) pool.push(...merged.auto.suggestions);
    return [...new Set(pool.map(normalizeTip))].slice(0, 6);
  }

  function applySuggestionToOutput(suggestion) {
    const base = enhancedOutput || formattedOutput;
    const newText = `${base}\n\n${suggestion}`;
    setEnhancedOutput(newText);
    showToast("Suggestion added");
  }

  /** --------------------------
   * Platform Formatter Map
   * -------------------------- */
  const platformFormatters = {
    ebay: formatEbay,
    mercari: formatMercari,
    poshmark: formatPoshmark,
    depop: formatDepop,
    etsy: formatEtsy,
    facebook: formatFacebook,
    grailed: formatGrailed,
    vinted: formatVinted,
    kidizen: formatKidizen,
  };

  /** --------------------------
   * Format Handler (per platform)
   * -------------------------- */
  async function handlePlatformClick(key) {
    if (!item) return;

    setActivePlatform(key);
    setShowAI(false);
    setEnhancedOutput("");

    const formatter = platformFormatters[key];
    const text = formatter ? formatter(item) : "Missing formatter.";

    setFormattedOutput(text);
    copyText(text);
    updateProgress(key);

    setTimeout(() => {
      if (outputRef.current) {
        outputRef.current.scrollIntoView({ behavior: "smooth" });
      }
    }, 150);

    // AI review + merge
    let review = null;
    try {
      review = await runAIReview(item);
      setAiReview(review);
    } catch {
      setAiReview({ summary: "AI Review unavailable." });
    }

    let magic = null;
    try {
      magic = await runMagicFill(item);
      setAiMagic(magic);
    } catch {
      setAiMagic({ summary: "Magic Fill unavailable." });
    }

    let auto = null;
    try {
      auto = await runAutoFill(item);
      setAiAuto(auto);
    } catch {
      setAiAuto({ summary: "Auto Fill unavailable." });
    }

    const merged = mergeAITurboSignals({ review, magic, auto });
    setAiMerged(merged);
    setAiSuggestions(extractSuggestions(merged));
    setShowAI(true);
  }

  /** --------------------------
   * Batch Navigation
   * -------------------------- */
  function goPrev() {
    if (currentIndex > 0) setCurrentIndex((i) => i - 1);
  }

  function goNext() {
    if (currentIndex < items.length - 1) setCurrentIndex((i) => i + 1);
  }

  /** --------------------------
   * Render
   * -------------------------- */
  return (
    <div style={{ padding: "1rem", color: "white", maxWidth: "900px", margin: "0 auto" }}>

      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "1.2rem",
        }}
      >
        <h1 style={{ fontSize: "1.6rem" }}>
          Launch Deck — {item.title || "Untitled"}
        </h1>

        {items.length > 1 && (
          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            <button
              onClick={goPrev}
              disabled={currentIndex === 0}
              style={{ background: "#111", border: "1px solid #333", padding: "8px 12px", borderRadius: "8px" }}
            >
              ◀
            </button>
            <span>
              {currentIndex + 1} / {items.length}
            </span>
            <button
              onClick={goNext}
              disabled={currentIndex === items.length - 1}
              style={{ background: "#111", border: "1px solid #333", padding: "8px 12px", borderRadius: "8px" }}
            >
              ▶
            </button>
          </div>
        )}
      </div>

      {/* TrendSense ULTRA insight */}
      {trendSense && (
        <div
          className="trendSense-card"
          style={{ marginBottom: "1.5rem" }}
        >
          <div className="trendSense-header">TrendSense Insight</div>

          <div className="trendSense-line">
            <strong>📈 Trend:</strong>{" "}
            {trendSense.trendScore > 0
              ? `Up ${Math.round(trendSense.trendScore * 100)}%`
              : `Down ${Math.round(
                  Math.abs(trendSense.trendScore) * 100
                )}%`}
          </div>

          <div className="trendSense-line">
            <strong>🔍 Search:</strong>{" "}
            {Math.round(trendSense.searchBoost * 100)}% interest
          </div>

          <div className="trendSense-line">
            <strong>🕒 Timing:</strong> {trendSense.timingNote}
          </div>

          <div className="trendSense-line">
            <strong>💰 Price Range:</strong>{" "}
            ${trendSense.priceFloor}–${trendSense.priceCeiling}
          </div>

          {trendSense.luxeBadges?.length > 0 && (
            <div className="trendSense-badges">
              {trendSense.luxeBadges.map((b, i) => (
                <span key={i} className="trendSense-badge">
                  {b}
                </span>
              ))}
            </div>
          )}

          <div className="trendSense-summary">{trendSense.summary}</div>
        </div>
      )}

      {/* Item photo */}
      {item.photos?.[0] && (
        <img
          src={item.photos[0]}
          alt="main"
          style={{
            width: "100%",
            maxWidth: "420px",
            borderRadius: "16px",
            marginBottom: "1.2rem",
          }}
        />
      )}

      {/* Platform cards with one-click copy */}
      <div className="launchdeck-grid">
        {Object.keys(platformFormatters).map((key) => {
          const completed = launchProgress[key];

          return (
            <div key={key} className="launchdeck-card">
              <div className="launchdeck-header">
                <span className="launchdeck-title">{key.toUpperCase()}</span>
                {completed ? (
                  <span className="launchdeck-check">✓</span>
                ) : (
                  <span className="launchdeck-pending">•</span>
                )}
              </div>

              <button
                className="launchdeck-copybtn"
                onClick={() => handlePlatformClick(key)}
              >
                Copy Full Listing →
              </button>
            </div>
          );
        })}
      </div>

      {/* Output */}
      {formattedOutput && (
        <div style={{ marginTop: "2rem" }}>
          <strong>Formatted Output:</strong>
          <pre
            ref={outputRef}
            style={{
              marginTop: "0.7rem",
              whiteSpace: "pre-wrap",
              background: "#0c0c0c",
              padding: "1rem",
              borderRadius: "12px",
              border: "1px solid #222",
            }}
          >
            {enhancedOutput || formattedOutput}
          </pre>
        </div>
      )}

      {/* AI Section */}
      {showAI && (
        <div
          style={{
            marginTop: "1.5rem",
            background: "#111",
            border: "1px solid #333",
            borderRadius: "12px",
            padding: "1rem",
          }}
        >
          <button
            onClick={() => setShowAI(!showAI)}
            style={{
              width: "100%",
              background: "transparent",
              color: "white",
              border: "none",
              fontSize: "1rem",
              marginBottom: "0.5rem",
              textAlign: "left",
            }}
          >
            {showAI ? "▼ AI Turbo Insights" : "▶ AI Turbo Insights"}
          </button>

          {showAI && (
            <div style={{ marginTop: "0.5rem" }}>
              <p><strong>AI Review:</strong> {aiReview?.summary || "—"}</p>
              <p><strong>Magic Fill:</strong> {aiMagic?.summary || "—"}</p>
              <p><strong>Auto Fill:</strong> {aiAuto?.summary || "—"}</p>

              {aiSuggestions.length > 0 && (
                <div style={{ marginTop: "1rem" }}>
                  <strong>Suggested Edits:</strong>
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "8px",
                      marginTop: "0.5rem",
                    }}
                  >
                    {aiSuggestions.map((s, i) => (
                      <button
                        key={i}
                        onClick={() => applySuggestionToOutput(s)}
                        style={{
                          padding: "6px 10px",
                          background: "#1c1c1c",
                          border: "1px solid #444",
                          borderRadius: "8px",
                          fontSize: "0.85rem",
                          cursor: "pointer",
                        }}
                      >
                        + {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TrendSense PRO panel */}
      <div className="trendpro-card">
        <div className="trendpro-header">TrendSense PRO™</div>

        <div className="trendpro-score">
          {trendPro.trendScore}% • {trendPro.demandLabel.toUpperCase()}
        </div>

        <div className="trendpro-speed">{trendPro.saleSpeed}</div>

        <div className="trendpro-priceblock">
          <div>Smart Price Range</div>
          <div className="trendpro-range">
            <span>${trendPro.smartPriceRange.min}</span>
            <span className="trendpro-target">
              ${trendPro.smartPriceRange.target}
            </span>
            <span>${trendPro.smartPriceRange.max}</span>
          </div>
        </div>

        <ul className="trendpro-list">
          {trendPro.proReasons.map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ul>
      </div>

      {/* TrendSense panel */}
      <div className="trend-card">
        <div className="trend-title">TrendSense™ Score</div>
        <div className="trend-number">{trendScore}%</div>
        <ul className="trend-list">
          {trendReasons.map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ul>
      </div>

      <div className="launchdeck-footer">
        Your listing is always saved. Come back anytime.
      </div>

      {/* Toast */}
      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: "2.2rem",
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(30,30,30,0.95)",
            padding: "10px 18px",
            borderRadius: "12px",
            border: "1px solid #444",
            color: "white",
            fontSize: "0.9rem",
            zIndex: 9999,
            animation: "fadeInOut 1.2s ease",
          }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}
