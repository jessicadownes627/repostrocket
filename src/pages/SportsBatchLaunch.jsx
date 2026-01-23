import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSportsBatchStore } from "../store/useSportsBatchStore";
import { composeCardTitle } from "../utils/composeCardTitle";
import { buildListingExportLinks } from "../utils/exportListing";
import { resolveCardFacts as cardFactsResolver } from "../utils/cardFactsResolver";

const PLATFORM_OPTIONS = [
  { id: "ebay", label: "eBay" },
  { id: "mercari", label: "Mercari" },
  { id: "poshmark", label: "Poshmark" },
  { id: "whatnot", label: "Whatnot" },
];

const identitySummary = (identity = {}) => {
  const parts = [];
  if (identity.year) parts.push(identity.year);
  if (identity.brand) parts.push(identity.brand);
  if (identity.setName) parts.push(identity.setName);
  if (identity.player) parts.push(identity.player);
  return parts.filter(Boolean).join(" · ");
};

const composeSportsDescription = (identity = {}) => {
  const parts = [];
  const year = identity.year ? String(identity.year).trim() : "";
  const brand = identity.brand ? String(identity.brand).trim() : "";
  const setName = identity.setName ? String(identity.setName).trim() : "";
  const player = identity.player ? String(identity.player).trim() : "";
  const sport = identity.sport ? String(identity.sport).trim() : "";
  const team = identity.team ? String(identity.team).trim() : "";

  const leadParts = [year, brand, setName, player].filter(Boolean);
  if (leadParts.length) {
    parts.push(`${leadParts.join(" ")} card.`);
  }
  const teamLine = [sport, team].filter(Boolean).join(" - ");
  if (teamLine) {
    parts.push(teamLine + ".");
  }
  parts.push("Condition as shown.");
  parts.push("Ships securely.");
  return parts.join(" ");
};

export default function SportsBatchLaunch() {
  const navigate = useNavigate();
  const { batchItems, preparedPlatforms, setPreparedPlatforms, updateBatchItem } =
    useSportsBatchStore();
  const [activeFilter, setActiveFilter] = useState("all");
  const [includeCorners, setIncludeCorners] = useState(true);
  const [saveCorners, setSaveCorners] = useState(false);
  const [analysisCount, setAnalysisCount] = useState(0);
  const [analysisInFlight, setAnalysisInFlight] = useState(false);

  const items = useMemo(() => batchItems || [], [batchItems]);
  const activePlatforms = useMemo(
    () => (preparedPlatforms?.length ? preparedPlatforms : ["ebay"]),
    [preparedPlatforms]
  );
  const totalCards = items.length;
  const progressFraction =
    totalCards > 0 ? Math.min(analysisCount / totalCards, 1) : 0;

  useEffect(() => {
    if (!preparedPlatforms?.length) {
      setPreparedPlatforms(["ebay"]);
    }
  }, [preparedPlatforms?.length, setPreparedPlatforms]);

  const togglePlatform = (id) => {
    setPreparedPlatforms((prev) => {
      const existing = prev || [];
      if (existing.includes(id)) {
        return existing.filter((entry) => entry !== id);
      }
      return [...existing, id];
    });
  };

  const visiblePlatforms =
    activeFilter === "all"
      ? activePlatforms
      : activePlatforms.filter((id) => id === activeFilter);

  const renderThumbnail = (src, alt) => {
    if (!src) {
      return (
        <div className="h-14 w-14 rounded-lg border border-dashed border-white/15" />
      );
    }
    return (
      <img
        src={src}
        alt={alt}
        className="h-14 w-14 rounded-lg border border-white/10 object-cover"
      />
    );
  };

  const handleCopy = async (value) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
    } catch (err) {
      console.error("Copy failed", err);
    }
  };

  const mergeIdentity = (base, incoming) => {
    const next = { ...(base || {}) };
    Object.entries(incoming || {}).forEach(([key, value]) => {
      if (key === "_sources") return;
      if (value === "" || value === null || value === undefined) return;
      if (next[key] !== undefined && next[key] !== null && next[key] !== "") return;
      next[key] = value;
    });
    next._sources = { ...(next._sources || {}), ...(incoming?._sources || {}) };
    return next;
  };

  const handleGenerateListings = async () => {
    if (analysisInFlight || !items.length) return;
    setAnalysisInFlight(true);
    setAnalysisCount(0);
    for (const item of items) {
      if (!item?.id) {
        setAnalysisCount((prev) => prev + 1);
        continue;
      }
      if (item.cardIntelResolved) {
        setAnalysisCount((prev) => prev + 1);
        continue;
      }
      const frontImageUrl = item.analysisImages?.frontUrl || "";
      const backImageUrl = item.analysisImages?.backUrl || null;
      console.log("Batch payload", { frontImageUrl, backImageUrl });
      if (!frontImageUrl) {
        updateBatchItem(item.id, { analysisStatus: "error", cardIntelResolved: true });
        setAnalysisCount((prev) => prev + 1);
        continue;
      }
      try {
        const response = await fetch("/.netlify/functions/cardIntel_v2", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            frontImageUrl,
            backImageUrl,
            requestId: `analysis-${Date.now()}-${item.id}`,
          }),
        });
        if (!response.ok) {
          updateBatchItem(item.id, {
            analysisStatus: "error",
            cardIntelResolved: true,
          });
          setAnalysisCount((prev) => prev + 1);
          continue;
        }
        const data = await response.json();
        if (!data || data.error) {
          updateBatchItem(item.id, {
            analysisStatus: "error",
            cardIntelResolved: true,
          });
          setAnalysisCount((prev) => prev + 1);
          continue;
        }
        const resolved = cardFactsResolver({
          ocrLines: data.ocrLines || [],
          backOcrLines: data.backOcrLines || [],
          slabLabelLines: data.slabLabelLines || [],
        });
        const mergedIdentity = mergeIdentity(item.reviewIdentity, resolved);
        const gradeValue =
          mergedIdentity?.grade && typeof mergedIdentity.grade === "object"
            ? mergedIdentity.grade.value
            : mergedIdentity?.grade;
        mergedIdentity.isSlabbed = Boolean(mergedIdentity?.grader && gradeValue);
        const composedTitle = composeCardTitle(mergedIdentity);
        const composedDescription = composeSportsDescription(mergedIdentity);
        updateBatchItem(item.id, {
          reviewIdentity: mergedIdentity,
          analysisStatus: "complete",
          cardIntelResolved: true,
          title: composedTitle || item.title || "",
          description: composedDescription || item.description || "",
        });
      } catch (err) {
        console.error("Sports batch analysis failed:", err);
        updateBatchItem(item.id, { analysisStatus: "error", cardIntelResolved: true });
      }
      setAnalysisCount((prev) => prev + 1);
    }
    setAnalysisInFlight(false);
    const anchor = document.getElementById("sports-batch-listings");
    if (anchor) anchor.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="min-h-screen bg-black text-white px-6 py-10">
      <div className="max-w-6xl mx-auto">
        <button
          type="button"
          onClick={() => navigate("/sports-batch-review")}
          className="text-left text-xs uppercase tracking-[0.3em] text-[#E8DCC0] mb-4 hover:text-white transition"
        >
          ← Back
        </button>
        <h1 className="sparkly-header text-3xl mb-2 text-center">
          Launch — Sports Cards
        </h1>
        <p className="text-center text-white/70 text-sm">
          Preparing listings… This usually takes about 20 seconds.
        </p>
        <div className="max-w-md mx-auto mt-4 mb-6">
          <div className="h-1 w-full rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full bg-[#E8DCC0]/70 transition-all duration-500"
              style={{ width: `${Math.max(progressFraction * 100, 6)}%` }}
            />
          </div>
        </div>
        <div className="text-center text-white/60 text-sm mb-8">
          {items.length} cards · Platforms: {activePlatforms.join(", ") || "eBay"}
          {includeCorners ? " · Corners included" : " · Corners off"}
        </div>

        <div className="flex justify-center mb-8">
          <button
            type="button"
            onClick={handleGenerateListings}
            className="px-6 py-3 rounded-full border border-[#E8DCC0] text-[#E8DCC0] text-xs uppercase tracking-[0.25em]"
          >
            Create listings
          </button>
        </div>

        {items.length === 0 ? (
          <div className="min-h-[50vh] flex items-center justify-center text-white/70 text-center">
            No sports batch items found. Start from Sports Card Suite → Batch.
          </div>
        ) : (
          <>
            <div className="lux-card border border-white/10 p-5 mb-6">
              <div className="text-xs uppercase tracking-[0.3em] text-white/50 mb-3">
                Prepare platforms
              </div>
              <div className="flex flex-wrap gap-3">
                {PLATFORM_OPTIONS.map((platform) => {
                  const active = activePlatforms.includes(platform.id);
                  return (
                    <button
                      key={platform.id}
                      type="button"
                      className={`px-4 py-2 rounded-full text-xs uppercase tracking-[0.2em] border ${
                        active
                          ? "border-[#E8DCC0] text-[#E8DCC0]"
                          : "border-white/20 text-white/60"
                      }`}
                      onClick={() => togglePlatform(platform.id)}
                    >
                      {platform.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="lux-card border border-white/10 p-5 mb-6">
              <div className="text-xs uppercase tracking-[0.3em] text-white/50 mb-3">
                Listing images
              </div>
              <div className="flex flex-col gap-4 text-sm text-white/70">
                <label className="flex items-center justify-between gap-4">
                  <span>Use cropped corners in listings?</span>
                  <input
                    type="checkbox"
                    checked={includeCorners}
                    onChange={() => setIncludeCorners((prev) => !prev)}
                    className="h-5 w-5 accent-[#E8DCC0]"
                  />
                </label>
                <label className="flex items-center justify-between gap-4">
                  <span>Save corner images?</span>
                  <input
                    type="checkbox"
                    checked={saveCorners}
                    onChange={() => setSaveCorners((prev) => !prev)}
                    className="h-5 w-5 accent-[#E8DCC0]"
                  />
                </label>
                <div className="text-xs text-white/50">
                  You can download them later if needed.
                </div>
              </div>
            </div>

            <div className="lux-card border border-white/10 p-5 mb-8">
              <div className="text-xs uppercase tracking-[0.3em] text-white/50 mb-3">
                Show
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  className={`px-4 py-2 rounded-full text-xs uppercase tracking-[0.2em] border ${
                    activeFilter === "all"
                      ? "border-[#E8DCC0] text-[#E8DCC0]"
                      : "border-white/20 text-white/60"
                  }`}
                  onClick={() => setActiveFilter("all")}
                >
                  All
                </button>
                {activePlatforms.map((platformId) => {
                  const label =
                    PLATFORM_OPTIONS.find((option) => option.id === platformId)
                      ?.label || platformId;
                  return (
                    <button
                      key={platformId}
                      type="button"
                      className={`px-4 py-2 rounded-full text-xs uppercase tracking-[0.2em] border ${
                        activeFilter === platformId
                          ? "border-[#E8DCC0] text-[#E8DCC0]"
                          : "border-white/20 text-white/60"
                      }`}
                      onClick={() => setActiveFilter(platformId)}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div id="sports-batch-listings" className="grid gap-6">
              {items.map((item) => {
                const identity = item.reviewIdentity || {};
                const title = composeCardTitle(identity);
                const description = composeSportsDescription(identity);
                const summary = identitySummary(identity);
                const frontSrc =
                  item.frontImage?.url || item.photos?.[0]?.url || "";
                const backSrc =
                  item.backImage?.url || item.secondaryPhotos?.[0]?.url || "";
                const isSlabbed =
                  identity.isSlabbed === true || item.cardType === "slabbed";
                const frontCorners = !isSlabbed ? item.frontCorners || [] : [];
                const backCorners = !isSlabbed ? item.backCorners || [] : [];
                const showCorners = includeCorners && !isSlabbed;

                const exportLinks = buildListingExportLinks({
                  title,
                  description,
                  price: item.price ? Number(item.price) : undefined,
                });

                return (
                  <div key={item.id} className="lux-card border border-white/10 p-5">
                    <div className="flex flex-col gap-2 mb-4">
                      <div className="text-sm uppercase tracking-[0.25em] text-white/50">
                        Card
                      </div>
                      <div className="text-lg text-white">
                        {summary || title || identity.player || "Untitled card"}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3 mb-5">
                      {renderThumbnail(frontSrc, "Front")}
                      {renderThumbnail(backSrc, "Back")}
                    </div>
                    {showCorners && (frontCorners.length || backCorners.length) ? (
                      <div className="grid gap-3 mb-5">
                        <div className="grid grid-cols-4 gap-3">
                          {frontCorners.slice(0, 4).map((corner, idx) => (
                            <img
                              key={`front-${item.id}-${idx}`}
                              src={corner.url || corner}
                              alt={`Front corner ${idx + 1}`}
                              className="h-16 w-16 rounded-lg border border-white/10 object-cover"
                            />
                          ))}
                          {backCorners.slice(0, 4).map((corner, idx) => (
                            <img
                              key={`back-${item.id}-${idx}`}
                              src={corner.url || corner}
                              alt={`Back corner ${idx + 1}`}
                              className="h-16 w-16 rounded-lg border border-white/10 object-cover"
                            />
                          ))}
                        </div>
                      </div>
                    ) : null}

                    <div className="grid gap-4">
                      {visiblePlatforms.map((platformId) => {
                        const label =
                          PLATFORM_OPTIONS.find((option) => option.id === platformId)
                            ?.label || platformId;
                        const launchUrl = exportLinks?.[platformId] || "";
                        return (
                          <div
                            key={platformId}
                            className="border border-white/10 rounded-xl p-4"
                          >
                            <div className="text-xs uppercase tracking-[0.3em] text-white/50 mb-3">
                              {label}
                            </div>
                            <div className="flex flex-wrap gap-3">
                              <button
                                type="button"
                                className="px-4 py-2 rounded-full text-xs uppercase tracking-[0.2em] border border-white/20 text-white/70 hover:text-white"
                                onClick={() => handleCopy(title)}
                              >
                                Copy title
                              </button>
                              <button
                                type="button"
                                className="px-4 py-2 rounded-full text-xs uppercase tracking-[0.2em] border border-white/20 text-white/70 hover:text-white"
                                onClick={() => handleCopy(description)}
                              >
                                Copy description
                              </button>
                              {launchUrl && (
                                <button
                                  type="button"
                                  className="px-4 py-2 rounded-full text-xs uppercase tracking-[0.2em] border border-[#E8DCC0] text-[#E8DCC0]"
                                  onClick={() => window.open(launchUrl, "_blank", "noopener")}
                                >
                                  Open {label}
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
