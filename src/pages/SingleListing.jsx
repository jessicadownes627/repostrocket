import { useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import "../styles/singleListing.css";
import "../styles/trendSense.css";
import { saveListingToLibrary } from "../utils/savedListings";
import { runTrendSensePro } from "../engines/trendSensePro";
import { runTrendSenseUltra } from "../utils/trendSenseUltra";

export default function SingleListing() {
  const location = useLocation();
  const navigate = useNavigate();

  const initialListings = location.state?.listings || [];

  const [currentIndex, setCurrentIndex] = useState(0);
  const [items, setItems] = useState(initialListings);
  const [trendSense, setTrendSense] = useState(null);

  useEffect(() => {
    if (!initialListings.length) {
      navigate("/");
    }
  }, []);

  const current = items[currentIndex];
  if (!current) return null;

  useEffect(() => {
    async function loadTS() {
      const ts = await runTrendSenseUltra(current);
      setTrendSense(ts);
    }
    loadTS();
  }, [current]);

  /** -----------------------------
   * Unified Item Update Function
   * ----------------------------- */
  function updateItem(fields) {
    setItems((prev) => {
      const copy = [...prev];
      copy[currentIndex] = { ...copy[currentIndex], ...fields };
      return copy;
    });
  }

  /** -----------------------------
   * Category + Condition options
   * ----------------------------- */
  const CATEGORY_OPTIONS = [
    "Tops",
    "Bottoms",
    "Dresses",
    "Outerwear",
    "Activewear",
    "Shoes",
    "Accessories",
    "Bags",
    "Home Goods",
    "Beauty & Grooming",
    "Kids & Baby",
    "Toys & Games",
    "Electronics",
    "Media",
    "Sports Cards",
    "Collectibles",
    "Other",
  ];

  const CONDITION_OPTIONS = ["New", "Like New", "Good", "Fair"];

  /** -----------------------------
   * Smart Tag presets
   * ----------------------------- */
  const SMART_TAGS = [
    // Fashion / lifestyle
    "Minimalist",
    "Cozy",
    "Classic",
    "Y2K",
    "Streetwear",
    "Vintage",
    "Oversized",
    "Petite",
    "Neutral",
    "Modern",
    "Boho",
    "Athleisure",
    "Layering",
    "Statement",
    "Designer",
    "Workwear",
    "Casual",
    "Lounge",
    "Bold",
    "Sporty",

    // NEW — Sports cards
    "Baseball",
    "Basketball",
    "Football",
    "Hockey",
    "Rookie Card",
    "Signed",
    "Memorabilia",
    "PSA",
    "Graded",
    "Vintage Card",

    // NEW — Collectibles
    "Collectible",
    "Funko Pop",
    "Trading Card Game",
    "TCG",
    "Pokemon",
    "Yu-Gi-Oh",
    "Magic: The Gathering",
    "Retro",
    "Limited Edition",
  ];

  /** -----------------------------
   * Tag toggle handler
   * ----------------------------- */
  function toggleTag(tag) {
    const hasTag = current.tags?.includes(tag);
    if (hasTag) {
      updateItem({ tags: current.tags.filter((t) => t !== tag) });
    } else {
      updateItem({ tags: [...(current.tags || []), tag] });
    }
  }

  /** -----------------------------
   * NEXT / PREV Navigation
   * ----------------------------- */
  function goNext() {
    if (currentIndex < items.length - 1) {
      setCurrentIndex((i) => i + 1);
    }
  }

  function goPrev() {
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1);
    }
  }

  /** -----------------------------
   * CONTINUE → Launch Deck
   * ----------------------------- */
  function handleContinue() {
    items.forEach((itm) => {
      const withTrend = {
        ...itm,
        ...runTrendSensePro(itm),
      };
      saveListingToLibrary(withTrend);
    });

    navigate("/launch", {
      state: { items },
    });
  }

  return (
    <div className="listing-editor-container fade-in">

      {/* HEADER BAR */}
      <div className="editor-header">
        <button className="back-btn" onClick={() => navigate(-1)}>
          ← Back
        </button>

        {items.length > 1 && (
          <div className="batch-nav">
            <button onClick={goPrev} disabled={currentIndex === 0}>
              ◀
            </button>
            <span className="batch-counter">
              {currentIndex + 1} / {items.length}
            </span>
            <button
              onClick={goNext}
              disabled={currentIndex === items.length - 1}
            >
              ▶
            </button>
          </div>
        )}

        <button className="launch-btn" onClick={handleContinue}>
          Continue →
        </button>
      </div>

      {/* PHOTO STRIP */}
      <div className="photo-strip">
        {current.photos?.map((p, i) => (
          <img key={i} src={p} className="item-photo" />
        ))}
      </div>

      {/* TITLE */}
      <div className="field-block">
        <label>Title</label>
        <input
          value={current.title || ""}
          onChange={(e) => updateItem({ title: e.target.value })}
          placeholder="Your title"
        />
      </div>

      {/* DESCRIPTION */}
      {/* TrendSense ULTRA insight */}
      {trendSense && (
        <div className="trendSense-card">
          <div className="trendSense-header">TrendSense Insight</div>

          <div className="trendSense-line">
            <strong>📈 Trend:</strong>{" "}
            {trendSense.trendScore > 0
              ? `Up ${Math.round(trendSense.trendScore * 100)}%`
              : `Down ${Math.round(Math.abs(trendSense.trendScore) * 100)}%`}
          </div>

          <div className="trendSense-line">
            <strong>🔍 Search:</strong>{" "}
            {Math.round(trendSense.searchBoost * 100)}% interest
          </div>

          <div className="trendSense-line">
            <strong>🕒 Timing:</strong> {trendSense.timingNote}
          </div>

          <div className="trendSense-line">
            <strong>💰 Price Range:</strong> $
            {trendSense.priceFloor}–{trendSense.priceCeiling}
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

      <div className="field-block">
        <label>Description</label>
        <textarea
          value={current.description || ""}
          onChange={(e) => updateItem({ description: e.target.value })}
          placeholder="Describe your item"
          rows={5}
        />
      </div>

      {/* CATEGORY */}
      <div className="field-block">
        <label>Category</label>
        <div className="chip-grid">
          {CATEGORY_OPTIONS.map((cat) => (
            <button
              key={cat}
              className={
                current.category === cat ? "chip chip-active" : "chip"
              }
              onClick={() => updateItem({ category: cat })}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* CONDITION */}
      <div className="field-block">
        <label>Condition</label>

        {/* Clothing conditions */}
        {!["Sports Cards", "Collectibles"].includes(current.category) && (
          <div className="chip-grid">
            {["New", "Like New", "Good", "Fair"].map((cond) => (
              <button
                key={cond}
                className={
                  current.condition === cond ? "chip chip-active" : "chip"
                }
                onClick={() => updateItem({ condition: cond })}
              >
                {cond}
              </button>
            ))}
          </div>
        )}

        {/* Collectibles / card conditions */}
        {["Sports Cards", "Collectibles"].includes(current.category) && (
          <div className="chip-grid">
            {[
              "Sealed",
              "Mint",
              "Near Mint",
              "Excellent",
              "Very Good",
              "Good",
              "Played",
              "Damaged",
            ].map((cond) => (
              <button
                key={cond}
                className={
                  current.condition === cond ? "chip chip-active" : "chip"
                }
                onClick={() => updateItem({ condition: cond })}
              >
                {cond}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* SMART TAGS */}
      <div className="field-block">
        <label>Smart Tags</label>
        <div className="chip-grid">
          {SMART_TAGS.map((tag) => (
            <button
              key={tag}
              className={
                current.tags?.includes(tag)
                  ? "chip chip-active"
                  : "chip"
              }
              onClick={() => toggleTag(tag)}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* COLLECTIBLES — EXTRA FIELDS */}
      {["Sports Cards", "Collectibles"].includes(current.category) && (
        <>
          <div className="field-block">
            <label>Grading Company</label>
            <div className="chip-grid">
              {["PSA", "BGS", "SGC", "CGC", "None"].map((g) => (
                <button
                  key={g}
                  className={
                    current.gradingCompany === g ? "chip chip-active" : "chip"
                  }
                  onClick={() =>
                    updateItem({
                      gradingCompany: g === "None" ? null : g,
                    })
                  }
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          <div className="field-block">
            <label>Grade Number (1–10)</label>
            <input
              type="text"
              value={current.gradeNumber || ""}
              onChange={(e) => updateItem({ gradeNumber: e.target.value })}
              placeholder="e.g., 10, 9, 8.5"
            />
          </div>

          <div className="field-block">
            <label>Certification / Serial Number</label>
            <input
              type="text"
              value={current.serialNumber || ""}
              onChange={(e) => updateItem({ serialNumber: e.target.value })}
              placeholder="Optional"
            />
          </div>

          <div className="field-block">
            <label>Card Player / Character</label>
            <input
              type="text"
              value={current.cardPlayer || ""}
              onChange={(e) => updateItem({ cardPlayer: e.target.value })}
              placeholder="e.g., Luka Doncic, Charizard"
            />
          </div>

          <div className="field-block">
            <label>Team (optional)</label>
            <input
              type="text"
              value={current.cardTeam || ""}
              onChange={(e) => updateItem({ cardTeam: e.target.value })}
              placeholder="Team name if sports"
            />
          </div>

          <div className="field-block">
            <label>Card Set</label>
            <input
              type="text"
              value={current.cardSet || ""}
              onChange={(e) => updateItem({ cardSet: e.target.value })}
              placeholder="e.g., 2020 Prizm, 1999 Base Set"
            />
          </div>

          <div className="field-block">
            <label>Card Number</label>
            <input
              type="text"
              value={current.cardNumber || ""}
              onChange={(e) => updateItem({ cardNumber: e.target.value })}
              placeholder="#145, RC, 1/99, etc."
            />
          </div>

          <div className="field-block">
            <label>Variant / Parallel</label>
            <input
              type="text"
              value={current.variant || ""}
              onChange={(e) => updateItem({ variant: e.target.value })}
              placeholder="e.g., Silver, Holo, Red Ice"
            />
          </div>
        </>
      )}

      {/* PRICE */}
      <div className="field-block">
        <label>
          Price{" "}
          {current.priceRecommendation && (
            <span style={{ opacity: 0.7 }}>
              (Suggested: ${current.priceRecommendation})
            </span>
          )}
        </label>
        <input
          type="number"
          value={current.price || ""}
          onChange={(e) =>
            updateItem({ price: Number(e.target.value) || "" })
          }
          placeholder="Enter price"
        />
      </div>

      {/* SHIPPING TIP */}
      {current.shippingRecommendation && (
        <div className="field-block">
          <label>Shipping Tip</label>
          <div className="hint-box">{current.shippingRecommendation}</div>
        </div>
      )}
    </div>
  );
}
