import React, { useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import "../styles/launchdeck.css";

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

import { runAIReview } from "../utils/safeAI/runAIReview";
import { runMagicFill } from "../utils/safeAI/runMagicFill";
import { runAutoFill } from "../utils/safeAI/runAutoFill";
import { mergeAITurboSignals } from "../utils/aiTurboMerge";

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

export default function LaunchDeckBatch() {
  const location = useLocation();
  const navigate = useNavigate();

  const items = location.state?.items || [];

  if (!items.length) {
    navigate("/");
    return null;
  }

  return (
    <div
      className="ld-batch-wrapper"
      style={{ maxWidth: "1100px", margin: "0 auto", padding: "1rem", color: "white" }}
    >
      <h1 className="ld-title">LaunchDeck — Batch Mode</h1>

      <div className="ld-grid">
        {items.map((item, index) => (
          <BatchCard key={index} item={item} index={index} />
        ))}
      </div>
    </div>
  );
}

function BatchCard({ item, index }) {
  const outputRef = useRef(null);

  const [activePlatform, setActivePlatform] = useState(null);
  const [formattedOutput, setFormattedOutput] = useState("");
  const [enhancedOutput, setEnhancedOutput] = useState("");

  const [aiReview, setAiReview] = useState(null);
  const [aiMagic, setAiMagic] = useState(null);
  const [aiAuto, setAiAuto] = useState(null);
  const [aiMerged, setAiMerged] = useState(null);
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [showAI, setShowAI] = useState(false);

  async function handlePlatformClick(key) {
    const formatter = platformFormatters[key];
    const text = formatter ? formatter(item) : "";

    setActivePlatform(key);
    setEnhancedOutput("");
    setFormattedOutput(text);

    // Scroll into view
    setTimeout(() => {
      if (outputRef.current) {
        outputRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 120);

    // AI block
    let review = null;
    let magic = null;
    let auto = null;

    try {
      review = await runAIReview(item);
    } catch {}
    try {
      magic = await runMagicFill(item);
    } catch {}
    try {
      auto = await runAutoFill(item);
    } catch {}

    setAiReview(review);
    setAiMagic(magic);
    setAiAuto(auto);

    const merged = mergeAITurboSignals({ review, magic, auto });
    setAiMerged(merged);

    const suggestions = extractSuggestions(merged);
    setAiSuggestions(suggestions);

    const autoPicks = autoPickTopSuggestions(merged);

    if (autoPicks.length > 0) {
      setEnhancedOutput(`${text}\n\n${autoPicks.join("\n\n")}`);
    }

    setShowAI(true);
  }

  function extractSuggestions(merged) {
    if (!merged) return [];
    const pool = [];
    if (merged.review?.suggestions) pool.push(...merged.review.suggestions);
    if (merged.magic?.suggestions) pool.push(...merged.magic.suggestions);
    if (merged.auto?.suggestions) pool.push(...merged.auto.suggestions);
    return [...new Set(pool)].slice(0, 6);
  }

  function autoPickTopSuggestions(merged) {
    if (!merged) return [];
    const pool = [];
    if (merged.review?.suggestions) pool.push(...merged.review.suggestions);
    if (merged.magic?.suggestions) pool.push(...merged.magic.suggestions);
    if (merged.auto?.suggestions) pool.push(...merged.auto.suggestions);
    return [...new Set(pool)].slice(0, 3);
  }

  function applySuggestion(s) {
    const base = enhancedOutput || formattedOutput;
    setEnhancedOutput(`${base}\n\n${s}`);
  }

  return (
    <div className="ld-card">
      <div className="ld-card-header">
        <h2 className="ld-item-title">{item?.title || `Item ${index + 1}`}</h2>
      </div>

      {item.photos?.[0] && (
        <img src={item.photos[0]} className="ld-photo" alt="item" />
      )}

      <div className="ld-platform-buttons">
        {Object.keys(platformFormatters).map((key) => (
          <button
            key={key}
            className={`ld-platform-btn ${
              activePlatform === key ? "ld-platform-btn-active" : ""
            }`}
            onClick={() => handlePlatformClick(key)}
          >
            {key.toUpperCase()}
          </button>
        ))}
      </div>

      {formattedOutput && (
        <div ref={outputRef} className="ld-output-block">
          <pre className="ld-output-text">
            {enhancedOutput || formattedOutput}
          </pre>
        </div>
      )}

      {showAI && (
        <div className="ld-ai-block">
          <button
            onClick={() => setShowAI(!showAI)}
            className="ld-ai-toggle"
          >
            {showAI ? "▼ AI Turbo Insights" : "▶ AI Turbo Insights"}
          </button>

          {showAI && (
            <div className="ld-ai-inner">
              <p><strong>AI Review:</strong> {aiReview?.summary || "—"}</p>
              <p><strong>Magic Fill:</strong> {aiMagic?.summary || "—"}</p>
              <p><strong>Auto Fill:</strong> {aiAuto?.summary || "—"}</p>

              {aiSuggestions.length > 0 && (
                <div className="ld-suggestions-row">
                  {aiSuggestions.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => applySuggestion(s)}
                      className="ld-suggestion-pill"
                    >
                      + {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

