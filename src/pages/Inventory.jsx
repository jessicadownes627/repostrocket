import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  loadListingLibrary,
  deleteListingFromLibrary,
  saveListingToLibrary,
  sortLibrary,
} from "../utils/savedListings";
import { runTrendSenseUltra } from "../utils/trendSenseUltra";
import { runTrendSenseInfinity } from "../utils/trendSenseInfinity";

import "../styles/inventory.css";

export default function Inventory() {
  const [library, setLibrary] = useState([]);
  const [sortBy, setSortBy] = useState("newest");
  const [filterCat, setFilterCat] = useState("all");
  const [filterCond, setFilterCond] = useState("all");
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [trendMap, setTrendMap] = useState({});
  const [infinity, setInfinity] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    refreshLibrary();
  }, []);

  useEffect(() => {
    async function loadAllTrends() {
      if (!library || library.length === 0) return;

      const result = {};
      for (const itm of library) {
        try {
          const ts = await runTrendSenseUltra(itm);
          result[itm.id] = ts;
        } catch (err) {
          console.error("TrendSense error for item", itm.id, err);
        }
      }

      setTrendMap(result);
    }

    loadAllTrends();
  }, [library]);

  useEffect(() => {
    async function loadInfinity() {
      if (!library || library.length === 0) return;

      const inf = await runTrendSenseInfinity(library);
      setInfinity(inf);
    }
    loadInfinity();
  }, [library]);

  function refreshLibrary() {
    const data = loadListingLibrary();
    const sorted = sortLibrary(data, sortBy);
    setLibrary(sorted);
  }

  function toggleSelect(id) {
    if (!selectMode) return;

    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((x) => x !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  }

  function applyFilters(items) {
    return items.filter((item) => {
      const catOk = filterCat === "all" || item.category === filterCat;
      const condOk = filterCond === "all" || item.condition === filterCond;
      return catOk && condOk;
    });
  }

  function handleLaunchBatch() {
    const batch = library.filter((x) => selectedIds.includes(x.id));
    navigate("/launch", { state: { items: batch } });
  }

  function handleDeleteBatch() {
    selectedIds.forEach((id) => deleteListingFromLibrary(id));
    setSelectedIds([]);
    refreshLibrary();
  }

  function handleDuplicateBatch() {
    selectedIds.forEach((id) => {
      const item = library.find((x) => x.id === id);
      if (!item) return;

      const copy = {
        ...item,
        id: crypto.randomUUID(),
        title: item.title + " (Copy)",
        savedAt: Date.now(),
      };

      saveListingToLibrary(copy);
    });

    setSelectedIds([]);
    refreshLibrary();
  }

  return (
    <div className="inventory-container">

      {/* TOP STATS */}
      <div className="inventory-stats">
        <div>{library.length} listings saved</div>
        <div>{library.filter((l) => l.title).length} ready</div>
        <div>{library.filter((l) => l.trendScore >= 80).length} trending</div>
      </div>

      {/* SORT + FILTER BAR */}
      <div className="inventory-controls">
        <select
          value={sortBy}
          onChange={(e) => {
            setSortBy(e.target.value);
            refreshLibrary();
          }}
        >
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="high">Price High → Low</option>
          <option value="low">Price Low → High</option>
          <option value="az">A → Z</option>
        </select>

        <select
          value={filterCat}
          onChange={(e) => setFilterCat(e.target.value)}
        >
          <option value="all">All Categories</option>
          <option value="Tops">Tops</option>
          <option value="Shoes">Shoes</option>
          <option value="Beauty">Beauty</option>
          <option value="Collectibles">Collectibles</option>
          <option value="Sports Cards">Sports Cards</option>
        </select>

        <select
          value={filterCond}
          onChange={(e) => setFilterCond(e.target.value)}
        >
          <option value="all">Any Condition</option>
          <option value="New">New</option>
          <option value="Like New">Like New</option>
          <option value="Good">Good</option>
          <option value="Fair">Fair</option>
        </select>

        <button
          className="select-mode-btn"
          onClick={() => {
            setSelectMode(!selectMode);
            setSelectedIds([]);
          }}
        >
          {selectMode ? "Cancel Select" : "Select Mode"}
        </button>
      </div>

      {/* BATCH ACTIONS */}
      {selectMode && selectedIds.length > 0 && (
        <div className="batch-actions">
          <button onClick={handleLaunchBatch}>Launch Batch →</button>
          <button onClick={handleDuplicateBatch}>Duplicate</button>
          <button onClick={handleDeleteBatch}>Delete</button>
        </div>
      )}

      {infinity && (
        <div className="inv-infinity-card">
          <div className="inv-infinity-header">TrendSense INFINITY</div>

          {/* List Next */}
          <div className="inv-infinity-section">
            <strong>🕒 List Next:</strong>
            {infinity.listNext.map((entry) => (
              <div key={entry.id} className="inv-infinity-line">
                • {entry.item.title}
              </div>
            ))}
          </div>

          {/* Flip Potential */}
          <div className="inv-infinity-section">
            <strong>💰 Highest Flip Potential:</strong>
            {infinity.flipPotential.map((entry) => (
              <div key={entry.id} className="inv-infinity-line">
                • {entry.item.title}
              </div>
            ))}
          </div>

          {/* Hot Tags */}
          <div className="inv-infinity-section">
            <strong>🔥 Hot Tags This Week:</strong>
            <div className="inv-infinity-tags">
              {infinity.hotTags.map((t, i) => (
                <span key={i} className="inv-infinity-tag">
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* LISTINGS */}
      <div className="inventory-grid">
        {applyFilters(library).map((item) => (
          <div
            key={item.id}
            className={`inventory-card ${
              selectedIds.includes(item.id) ? "selected" : ""
            }`}
            onClick={() => toggleSelect(item.id)}
          >
            {item.photos?.[0] && (
              <img src={item.photos[0]} className="inventory-photo" />
            )}

            <div className="inventory-info">
              <h2 className="inventory-item-title">
                {item.title || "Untitled Listing"}
              </h2>

              {/* TrendSense LUXE badges under title */}
              {trendMap[item.id]?.luxeBadges?.length > 0 && (
                <div className="inv-badges">
                  {trendMap[item.id].luxeBadges.map((b, i) => (
                    <span key={i} className="inv-badge">
                      {b}
                    </span>
                  ))}
                </div>
              )}

              <div className="inventory-tags">
                {item.category && (
                  <span className="pill">{item.category}</span>
                )}
                {item.condition && (
                  <span className="pill pill-cond">{item.condition}</span>
                )}
                {item.trendScore && (
                  <span className="pill pill-trend">
                    🔥 {item.trendScore}%
                  </span>
                )}
              </div>

              <div className="inventory-sub">
                {item.price ? `$${item.price}` : "No price"}
              </div>

              <button
                className="inventory-open"
                onClick={() =>
                  navigate("/launch", { state: { items: [item] } })
                }
              >
                Open in Launch Deck →
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
