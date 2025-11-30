import React, { useState, useRef } from "react";
import { useListingStore } from "../store/useListingStore";

import { runAIReview } from "../utils/safeAI/runAIReview";
import { runMagicFill } from "../utils/safeAI/runMagicFill";
import { runAutoFill } from "../utils/safeAI/runAutoFill";
import { mergeAITurboSignals } from "../utils/aiTurboMerge";

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

const MAX_SUGGESTIONS = 6;

export default function LaunchDeck() {
  const { listingData: listing } = useListingStore();
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

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(""), 1400);
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
  return [...new Set(pool.map(normalizeTip))].slice(0, MAX_SUGGESTIONS);
}

function applySuggestionToOutput(suggestion) {
  const base = enhancedOutput || formattedOutput;
  const newText = `${base}\n\n${suggestion}`;
  setEnhancedOutput(newText);
  showToast("Suggestion added");
}

function autoPickTopSuggestions(merged) {
  if (!merged) return [];

  const pool = [];

  if (merged.review?.suggestions) pool.push(...merged.review.suggestions);
  if (merged.magic?.suggestions) pool.push(...merged.magic.suggestions);
  if (merged.auto?.suggestions) pool.push(...merged.auto.suggestions);

  return [...new Set(pool)].slice(0, 3);
}

  function copyText(text) {
    navigator.clipboard.writeText(text);
    showToast("Copied!");
  }

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

  async function handlePlatformClick(key) {
    if (!listing) return;

    setActivePlatform(key);
    setShowAI(false);
    setEnhancedOutput("");

    const formatter = platformFormatters[key];
    const text = formatter ? formatter(listing) : "No formatter found.";

    setFormattedOutput(text);
    copyText(text);

    setTimeout(() => {
      if (outputRef.current) {
        outputRef.current.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }
    }, 160);

    let reviewTips = null;
    try {
      reviewTips = await runAIReview(listing);
      setAiReview(reviewTips);
    } catch {
      setAiReview({ summary: "AI Review unavailable." });
    }

    let magic = null;
    try {
      magic = await runMagicFill(listing);
      setAiMagic(magic);
    } catch {
      setAiMagic({ summary: "Magic Fill unavailable." });
    }

    let auto = null;
    try {
      auto = await runAutoFill(listing);
      setAiAuto(auto);
    } catch {
      setAiAuto({ summary: "Auto Fill unavailable." });
    }

    const merged = mergeAITurboSignals({
      review: reviewTips,
      magic,
      auto,
    });

    setAiMerged(merged);
    setAiSuggestions(extractSuggestions(merged));

    const autoPicks = autoPickTopSuggestions(merged);
    if (autoPicks.length > 0) {
      const base = enhancedOutput || text;
      const improved = `${base}\n\n${autoPicks.join("\n\n")}`;
      setEnhancedOutput(improved);
      showToast("Listing Optimized ✨");
    }

    setShowAI(true);
  }

  if (!listing) {
    return (
      <div style={{ padding: "1rem", color: "white" }}>
        No listing found.
      </div>
    );
  }

  return (
    <div style={{ padding: "1rem", color: "white", maxWidth: "900px", margin: "0 auto" }}>
      <h1 style={{ marginBottom: "1rem", fontSize: "1.6rem" }}>
        Launch Deck — {listing.title}
      </h1>

      {listing.photos?.[0] && (
        <img
          src={listing.photos[0]}
          alt="main"
          style={{
            width: "100%",
            maxWidth: "420px",
            borderRadius: "16px",
            marginBottom: "1.5rem",
          }}
        />
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {Object.keys(platformFormatters).map((key) => (
          <button
            key={key}
            onClick={() => handlePlatformClick(key)}
            style={{
              background: activePlatform === key ? "#181818" : "#111",
              border: "1px solid #333",
              padding: "14px 18px",
              borderRadius: "12px",
              textAlign: "left",
              fontSize: "1rem",
              color: "white",
            }}
          >
            {key.toUpperCase()}
          </button>
        ))}
      </div>

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

      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: "2.2rem",
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(30, 30, 30, 0.95)",
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
