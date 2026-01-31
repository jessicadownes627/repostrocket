import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import LuxeChipGroup from "../components/LuxeChipGroup";
import LuxeInput from "../components/LuxeInput";
import { useListingStore } from "../store/useListingStore";
import { getPhotoUrl } from "../utils/photoHelpers";
import {
  getConfidenceInsight,
  getConfidenceSuggestions,
} from "../utils/confidenceInsights";
import "../styles/overrides.css";

const CATEGORY_OPTIONS = ["Sports Cards", "Apparel", "Accessories", "Home Goods", "Other"];
const CONDITION_OPTIONS = ["New with tags", "Like new", "Very good", "Good", "Fair"];
const TAG_OPTIONS = ["Neutral", "Modern", "Minimal", "Classic", "Statement"];
const SET_CANDIDATE_MAP = {
  panini: {
    football: ["Donruss", "Score", "Prizm"],
    basketball: ["Prizm", "Donruss"],
  },
  topps: {
    baseball: ["Topps Chrome", "Topps"],
  },
  "upper deck": {
    hockey: ["Upper Deck"],
  },
};

export default function SingleListing() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    listingData: storedListingData,
    analysisInFlight,
    reviewIdentity,
    analysisState,
    requestSportsAnalysis,
    setReviewIdentityField,
  } = useListingStore();
  const analysisComplete = analysisState === "complete" || analysisState === "error";

  const mode = location.state?.mode ?? "casual";
  const listingData = storedListingData || location.state?.listingData || null;
  const batchCardId =
    listingData?.batchCardId || location.state?.batchCardId || "";
  const isSports = mode === "sports";

  /* ---------- shared state ---------- */
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [brand, setBrand] = useState("");
  const [category, setCategory] = useState(isSports ? "Sports Cards" : "");
  const [scanHintIndex, setScanHintIndex] = useState(0);
  const [condition, setCondition] = useState("");
  const [tags, setTags] = useState([]);
  const [activeAssistField, setActiveAssistField] = useState("");
  const [manualSetValue, setManualSetValue] = useState("");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");

  const detectedFrontImage =
    listingData?.editedPhoto ||
    listingData?.frontImage ||
    getPhotoUrl(listingData?.photos?.[0]) ||
    "";
  const detectedBackImage =
    listingData?.backImage ||
    getPhotoUrl(listingData?.secondaryPhotos?.[0]) ||
    "";
  const detectedSlabImage = listingData?.slabImage || "";
  const identityPlayer = reviewIdentity?.player || "";
  const identitySetName = reviewIdentity?.setName || "";
  const identityBrand = reviewIdentity?.brand || "";
  const identityTeam = reviewIdentity?.team || "";
  const identityYear = reviewIdentity?.year || "";
  const identitySport = reviewIdentity?.sport || "";
  const gradeCompany =
    listingData?.gradingCompany ||
    listingData?.cardAttributes?.gradingAuthority ||
    listingData?.cardAttributes?.grading?.authority ||
    "";
  const legacyGradeValue =
    listingData?.gradeValue ||
    listingData?.cardAttributes?.gradeValue ||
    listingData?.cardAttributes?.grading?.value ||
    listingData?.cardAttributes?.grade ||
    "";
  const cardType = reviewIdentity?.cardType || listingData?.cardType || "";
  const isSlabbedMode =
    cardType === "slabbed" ||
    reviewIdentity?.isSlabbed === true ||
    listingData?.isSlabbed === true;
  const isSlabbed = reviewIdentity?.isSlabbed === true || isSlabbedMode;
  const backOcrStatus = reviewIdentity?.backOcrStatus || "";
  const showGraded = isSlabbed || reviewIdentity?.graded === true;
  const playerConfidence = "";
  const yearConfidence = "";
  const brandConfidence = "";
  const setConfidence = "";
  const teamConfidence = "";
  const sportConfidence = "";
  const gradeValue =
    reviewIdentity?.grade && typeof reviewIdentity.grade === "object"
      ? reviewIdentity.grade.value
      : reviewIdentity?.grade || "";
  const gradeScale =
    isSlabbed && reviewIdentity?.grader
      ? reviewIdentity.grader
      : reviewIdentity?.grade && typeof reviewIdentity.grade === "object"
      ? reviewIdentity.grade.scale
      : reviewIdentity?.grader || "";
  const gradeLabel = isSlabbed
    ? gradeValue
      ? [gradeScale, gradeValue].filter(Boolean).join(" ")
      : "Graded"
    : backOcrStatus === "pending"
    ? ""
    : "Raw";
  const graderSource = reviewIdentity?._sources?.grader || "";
  const showGraderChips =
    isSlabbed && (!reviewIdentity?.grader || graderSource === "inferred");
  const showGradeChips =
    isSlabbed && reviewIdentity?.grader && !gradeValue;
  const gradeChipOptions = {
    PSA: ["7", "8", "9", "10"],
    BGS: ["8", "8.5", "9", "9.5", "10"],
    SGC: ["88", "92", "96", "98", "100"],
  };
  const metadataCompleteness = reviewIdentity?.metadataCompleteness;
  const hasBackPhoto =
    Array.isArray(listingData?.secondaryPhotos) &&
    listingData.secondaryPhotos.length > 0;
  const assistSuggestions = (field) => {
    if (!listingData) return [];
    const suggestions = new Set();
    if (field === "player") {
      [
        listingData?.identity?.player,
        listingData?.player,
        listingData?.cardAttributes?.player,
      ].forEach((value) => value && suggestions.add(value));
    }
    if (field === "team") {
      [
        listingData?.identity?.team,
        listingData?.team,
        listingData?.cardAttributes?.team,
      ].forEach((value) => value && suggestions.add(value));
    }
    if (field === "year") {
      [
        listingData?.identity?.year,
        listingData?.year,
        listingData?.cardAttributes?.year,
      ].forEach((value) => value && suggestions.add(String(value)));
    }
    if (field === "setName") {
      [
        listingData?.identity?.setName,
        listingData?.setName,
        listingData?.cardAttributes?.setName,
        listingData?.cardAttributes?.setBrand,
      ].forEach((value) => value && suggestions.add(value));
    }
    return Array.from(suggestions);
  };
  const setCandidates = (() => {
    if (!identityBrand || !identitySport || !identityYear) return [];
    const brandKey = identityBrand.toLowerCase().trim();
    const sportKey = identitySport.toLowerCase().trim();
    const brandSets = SET_CANDIDATE_MAP[brandKey];
    if (!brandSets) return [];
    const candidates = brandSets[sportKey] || [];
    return Array.isArray(candidates) ? candidates : [];
  })();
  const handleAssistPick = (field, value) => {
    setReviewIdentityField(field, value);
    setActiveAssistField("");
  };
  const displayPlayer =
    identityPlayer && identityPlayer !== identitySetName ? identityPlayer : "";
  const frontCorners =
    isSlabbedMode || !Array.isArray(listingData?.frontCorners)
      ? []
      : listingData.frontCorners;
  const backCorners =
    isSlabbedMode || !Array.isArray(listingData?.backCorners)
      ? []
      : listingData.backCorners;
  const cornersReviewed = frontCorners.length > 0 || backCorners.length > 0;
  const hasIdentityData = reviewIdentity !== null;
  const confidenceContext = {
    identity: reviewIdentity || {},
    ocrLines: reviewIdentity?.frontOcrLines || [],
    backOcrLines: reviewIdentity?.backOcrLines || [],
    slabLabelLines: listingData?.cardIntel?.slabLabelLines || [],
    frontCornersCount: frontCorners.length,
    backCornersCount: backCorners.length,
  };

  const renderSuggestionChips = (field) => {
    const suggestions = getConfidenceSuggestions(field, confidenceContext);
    if (!suggestions.length) return null;
    return (
      <div className="flex flex-wrap gap-2 mt-2">
        {suggestions.map((value) => (
          <button
            key={`${field}-${value}`}
            type="button"
            className="px-2.5 py-1 rounded-full border border-white/15 text-[11px] text-white/70 hover:bg-white/10 transition"
            onClick={() =>
              setReviewIdentityField(field, value, {
                force: true,
                source: "manual",
                userVerified: true,
              })
            }
          >
            {value}
          </button>
        ))}
      </div>
    );
  };
  const titleSetName =
    identitySetName && identitySetName !== identityPlayer ? identitySetName : "";
  const displayTitle = identityYear && identityBrand && titleSetName
    ? `${identityYear} ${identityBrand} ${titleSetName} · ${identityPlayer}`
    : identityYear && identityBrand
    ? `${identityYear} ${identityBrand} · ${identityPlayer}`
    : identityPlayer || "";
  const lockedTitle = reviewIdentity?.cardTitle || "";
  const titleValue = lockedTitle || displayTitle;

  useEffect(() => {
    if (isEditingTitle) return;
    setTitleDraft(titleValue);
  }, [titleValue, isEditingTitle]);

  const handleTitleEditStart = () => {
    setTitleDraft(titleValue);
    setIsEditingTitle(true);
  };

  const handleTitleEditCancel = () => {
    setTitleDraft(titleValue);
    setIsEditingTitle(false);
  };

  const handleTitleEditSave = () => {
    const nextTitle = titleDraft.trim();
    if (!nextTitle) {
      setIsEditingTitle(false);
      return;
    }
    setReviewIdentityField("cardTitle", nextTitle, {
      force: true,
      source: "user",
      userVerified: true,
    });
    setReviewIdentityField("titleLocked", true, {
      force: true,
      source: "user",
      userVerified: true,
    });
    setIsEditingTitle(false);
  };

  const renderCornerRows = () => {
    if (isSlabbedMode) return null;
    if (!frontCorners.length && !backCorners.length) return null;
    return (
      <>
        {frontCorners.length > 0 && (
          <div className="mt-6">
            <div className="text-[10px] uppercase tracking-[0.35em] text-white/50 mb-2">
              Front Corners
            </div>
            <div className="grid grid-cols-2 gap-3">
              {frontCorners.slice(0, 4).map((entry, idx) => (
                <div
                  key={`front-corner-${idx}`}
                  className="rounded-xl border border-white/10 bg-black/30 overflow-hidden"
                >
                  {entry?.url && (
                    <img
                      src={entry.url}
                      alt={entry?.label || "Front corner detail"}
                      className="w-full h-24 object-cover"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        {backCorners.length > 0 && (
          <div className="mt-6">
            <div className="text-[10px] uppercase tracking-[0.35em] text-white/50 mb-2">
              Back Corners
            </div>
            <div className="grid grid-cols-2 gap-3">
              {backCorners.slice(0, 4).map((entry, idx) => (
                <div
                  key={`back-corner-${idx}`}
                  className="rounded-xl border border-white/10 bg-black/30 overflow-hidden"
                >
                  {entry?.url && (
                    <img
                      src={entry.url}
                      alt={entry?.label || "Back corner detail"}
                      className="w-full h-24 object-cover"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </>
    );
  };

  const renderCornersReviewed = () => {
    if (isSlabbedMode || !cornersReviewed) return null;
    return (
      <div className="mt-4 text-[11px] uppercase tracking-[0.35em] text-white/50">
        Corners reviewed
      </div>
    );
  };

  /* ---------- hydrate ONCE for sports ---------- */
  useEffect(() => {
    if (!isSports || !listingData) return;

    setTitle(listingData.title ?? "");
    setDescription(listingData.notes ?? listingData.description ?? "");
    setBrand(listingData.brand ?? "");
    setPrice(listingData.price ?? "");
    setCondition(listingData.condition ?? "");
    setCategory("Sports Cards");
  }, [isSports, listingData]);

  useEffect(() => {
    if (!isSports) return;
    if (!analysisInFlight) return;
    const hints = ["Scanning surface…", "Reading print…", "Checking edges…"];
    const timer = setInterval(() => {
      setScanHintIndex((prev) => (prev + 1) % hints.length);
    }, 1800);
    return () => clearInterval(timer);
  }, [isSports, analysisInFlight]);

  /* =========================================================
     =============== SPORTS REVIEW LAYOUT =====================
     ========================================================= */
  if (isSports) {
    const showScanOverlay = !hasIdentityData && analysisInFlight;
    return (
      <div className="app-wrapper px-6 py-10 max-w-2xl mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="text-left text-sm uppercase tracking-[0.2em] mb-2 opacity-70"
        >
          ← Back
        </button>
        {batchCardId && (
          <button
            onClick={() => navigate(`/batch-card-prep?cardId=${batchCardId}`)}
            className="text-left text-[11px] uppercase tracking-[0.25em] mb-6 text-white/50 hover:text-white/80 transition"
          >
            ← Back to Batch
          </button>
        )}

        <h1 className="sparkly-header header-glitter text-center text-3xl mb-3">
          Single Listing
        </h1>
        <div className="magic-cta-bar mb-4" />
        <div className="text-center text-[11px] uppercase tracking-[0.35em] text-white/50 mb-8">
          Step 3 — Review Details
        </div>

        <div className="lux-card mb-10">
          <div className="grid grid-cols-1 sm:grid-cols-[160px,1fr] gap-6 items-start">
            <div>
              <div className="scan-frame relative w-full max-w-[160px] mx-auto">
                {detectedFrontImage && (
                  <img
                    src={detectedFrontImage}
                    alt="Front of card"
                    className="w-full h-40 rounded-2xl border border-white/10 object-cover"
                  />
                )}
                <div
                  className="absolute inset-0 rounded-2xl"
                  style={{
                    background:
                      "linear-gradient(120deg, rgba(255,255,255,0.04), rgba(255,255,255,0))",
                    opacity: showScanOverlay ? 1 : 0,
                    transition: "opacity 600ms ease",
                    pointerEvents: "none",
                  }}
                />
                <div
                  className="scan-line"
                  style={{
                    opacity: showScanOverlay ? 1 : 0,
                    transition: "opacity 600ms ease",
                    animation: showScanOverlay ? undefined : "none",
                  }}
                />
              </div>
              {detectedBackImage && (
                <div className="mt-3 w-full max-w-[160px] mx-auto">
                  <img
                    src={detectedBackImage}
                    alt="Back of card"
                    className="w-full h-40 rounded-2xl border border-white/10 object-cover"
                  />
                </div>
              )}
            </div>
            <div className="space-y-4">
              {renderCornerRows()}
              {!analysisComplete && (
                <div className="text-[10px] uppercase tracking-[0.22em] opacity-40">
                  {["Scanning surface…", "Reading print…", "Checking edges…"][scanHintIndex]}
                </div>
              )}
            </div>
          </div>
        </div>

        {analysisComplete && (
          <>
            {metadataCompleteness === "partial" && (
              <div className="lux-card mb-6">
                <div className="text-sm text-white/70">Card profile in progress</div>
              </div>
            )}
            <div
              className="lux-card mb-10"
              style={{
                opacity: analysisComplete ? 1 : 0,
                transition: "opacity 500ms ease",
              }}
            >
              {titleValue && (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-xs uppercase tracking-[0.35em] opacity-60">
                      Card Title
                    </div>
                    {!isEditingTitle && (
                      <button
                        type="button"
                        className="text-[10px] uppercase tracking-[0.3em] text-white/70 border border-white/20 rounded-full px-3 py-1 hover:border-white/50 hover:text-white transition"
                        onClick={handleTitleEditStart}
                      >
                        Edit title
                      </button>
                    )}
                  </div>
                  {isEditingTitle ? (
                    <div className="mb-6">
                      <input
                        type="text"
                        value={titleDraft}
                        onChange={(event) => setTitleDraft(event.target.value)}
                        className="w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-white text-base"
                      />
                      <div className="mt-3 flex gap-3">
                        <button
                          type="button"
                          className="px-4 py-2 rounded-full border border-white/20 text-[11px] uppercase tracking-[0.25em] text-white/70 hover:border-white/50 transition"
                          onClick={handleTitleEditSave}
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          className="px-4 py-2 rounded-full border border-white/10 text-[11px] uppercase tracking-[0.25em] text-white/40 hover:text-white/70 transition"
                          onClick={handleTitleEditCancel}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-2xl text-white mb-6">{titleValue}</div>
                  )}
                </>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="text-xs uppercase tracking-[0.3em] opacity-60">
                    Player
                  </div>
                  <div className="text-lg mt-1 text-white">
                    {displayPlayer || (
                      <div className="flex flex-wrap items-center gap-2">
                        {analysisComplete ? (
                          <span className="text-sm text-white/70 flex items-center gap-2">
                            Unknown player
                            <span className="px-2 py-0.5 rounded-full border border-white/10 text-[10px] uppercase tracking-[0.2em] text-white/40">
                              Reviewed
                            </span>
                          </span>
                        ) : (
                          <span className="text-sm text-white/35">
                            Detecting player<span className="lux-ellipsis" />
                          </span>
                        )}
                        <button
                          type="button"
                          className="inline-flex items-center px-2.5 py-1 rounded-full border border-white/15 text-[11px] uppercase tracking-[0.22em] text-white/70 hover:bg-white/10 transition"
                          onClick={() =>
                            setActiveAssistField((prev) =>
                              prev === "player" ? "" : "player"
                            )
                          }
                        >
                          Add
                        </button>
                      </div>
                    )}
                    {!displayPlayer && analysisComplete && (
                      (() => {
                        const hint = getConfidenceInsight("player", confidenceContext);
                        return hint ? (
                          <div className="text-xs text-white/45 mt-2">
                            Partial insight: {hint}
                          </div>
                        ) : null;
                      })()
                    )}
                    {!displayPlayer && analysisComplete &&
                      renderSuggestionChips("player")}
                    {displayPlayer && (
                      <button
                        type="button"
                        className="ml-2 inline-flex items-center px-2.5 py-1 rounded-full border border-white/15 text-[11px] uppercase tracking-[0.22em] text-white/60 hover:bg-white/10 transition"
                        onClick={() => {
                          const value = window.prompt("Player name", displayPlayer);
                          if (value) {
                            setReviewIdentityField("player", value.trim(), {
                              force: true,
                              source: "manual",
                              userVerified: true,
                            });
                          }
                        }}
                      >
                        Edit
                      </button>
                    )}
                  </div>
                  {activeAssistField === "player" && !displayPlayer && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {assistSuggestions("player").map((option) => (
                        <button
                          key={option}
                          type="button"
                          className="px-2.5 py-1 rounded-full border border-white/15 text-[11px] text-white/70 hover:bg-white/10 transition"
                          onClick={() => handleAssistPick("player", option)}
                        >
                          {option}
                        </button>
                      ))}
                      <button
                        type="button"
                        className="px-2.5 py-1 rounded-full border border-white/15 text-[11px] text-white/60 hover:bg-white/10 transition"
                        onClick={() => {
                          const value = window.prompt("Player name");
                          if (value) handleAssistPick("player", value.trim());
                        }}
                      >
                        Enter manually
                      </button>
                    </div>
                  )}
                </div>
                <div>
                  <div className="text-xs uppercase tracking-[0.3em] opacity-60">
                    Year
                  </div>
                  <div className="text-lg mt-1 text-white/85">
                    {identityYear ? (
                      <span className="inline-flex items-center gap-2">
                        <span>{identityYear}</span>
                        <button
                          type="button"
                          className="inline-flex items-center px-2.5 py-1 rounded-full border border-white/15 text-[11px] uppercase tracking-[0.22em] text-white/60 hover:bg-white/10 transition"
                          onClick={() => {
                            const value = window.prompt("Year", identityYear);
                            if (value) {
                              setReviewIdentityField("year", value.trim(), {
                                force: true,
                                source: "manual",
                                userVerified: true,
                              });
                            }
                          }}
                        >
                          Edit
                        </button>
                      </span>
                    ) : (
                      <div className="flex flex-wrap items-center gap-2">
                        {analysisComplete ? (
                          <span className="text-sm text-white/70 flex items-center gap-2">
                            Unknown year
                            <span className="px-2 py-0.5 rounded-full border border-white/10 text-[10px] uppercase tracking-[0.2em] text-white/40">
                              Reviewed
                            </span>
                          </span>
                        ) : (
                          <span className="text-sm text-white/35">
                            Detecting year<span className="lux-ellipsis" />
                          </span>
                        )}
                        <button
                          type="button"
                          className="inline-flex items-center px-2.5 py-1 rounded-full border border-white/15 text-[11px] uppercase tracking-[0.22em] text-white/70 hover:bg-white/10 transition"
                          onClick={() =>
                            setActiveAssistField((prev) =>
                              prev === "year" ? "" : "year"
                            )
                          }
                        >
                          Add
                        </button>
                      </div>
                    )}
                    {!identityYear && analysisComplete && (
                      (() => {
                        const hint = getConfidenceInsight("year", confidenceContext);
                        return hint ? (
                          <div className="text-xs text-white/45 mt-2">
                            Partial insight: {hint}
                          </div>
                        ) : null;
                      })()
                    )}
                    {!identityYear && analysisComplete &&
                      renderSuggestionChips("year")}
                  </div>
                  {activeAssistField === "year" && !identityYear && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {assistSuggestions("year").map((option) => (
                        <button
                          key={option}
                          type="button"
                          className="px-2.5 py-1 rounded-full border border-white/15 text-[11px] text-white/70 hover:bg-white/10 transition"
                          onClick={() => handleAssistPick("year", option)}
                        >
                          {option}
                        </button>
                      ))}
                      <button
                        type="button"
                        className="px-2.5 py-1 rounded-full border border-white/15 text-[11px] text-white/60 hover:bg-white/10 transition"
                        onClick={() => {
                          const value = window.prompt("Year");
                          if (value) handleAssistPick("year", value.trim());
                        }}
                      >
                        Enter manually
                      </button>
                    </div>
                  )}
                </div>
                <div>
                  <div className="text-xs uppercase tracking-[0.3em] opacity-60">
                    Set
                  </div>
                  <div className="text-lg mt-1 text-white/85">
                    {identitySetName ? (
                      <span className="inline-flex items-center gap-2">
                        <span>{identitySetName}</span>
                        <button
                          type="button"
                          className="inline-flex items-center px-2.5 py-1 rounded-full border border-white/15 text-[11px] uppercase tracking-[0.22em] text-white/60 hover:bg-white/10 transition"
                          onClick={() => {
                            const value = window.prompt("Set", identitySetName);
                            if (value) {
                              setReviewIdentityField("setName", value.trim(), {
                                force: true,
                                source: "manual",
                                userVerified: true,
                              });
                            }
                          }}
                        >
                          Edit
                        </button>
                      </span>
                    ) : (
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm text-white/35">
                          Checking card back…
                        </span>
                        <button
                          type="button"
                          className="inline-flex items-center px-2.5 py-1 rounded-full border border-white/15 text-[11px] uppercase tracking-[0.22em] text-white/70 hover:bg-white/10 transition"
                          onClick={() =>
                            setActiveAssistField((prev) =>
                              prev === "setName" ? "" : "setName"
                            )
                          }
                        >
                          Select Set
                        </button>
                      </div>
                    )}
                  </div>
                  {activeAssistField === "setName" && !identitySetName && (
                    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-4">
                      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#121212] p-4 shadow-[0_18px_40px_rgba(0,0,0,0.55)]">
                        <div className="flex items-center justify-between mb-3">
                          <div className="text-xs uppercase tracking-[0.25em] text-white/60">
                            Select Set
                          </div>
                          <button
                            type="button"
                            className="text-xs uppercase tracking-[0.25em] text-white/50 hover:text-white/80"
                            onClick={() => setActiveAssistField("")}
                          >
                            Close
                          </button>
                        </div>
                        {setCandidates.length ? (
                          <div className="flex flex-wrap gap-2">
                            {setCandidates.map((option) => (
                              <button
                                key={option}
                                type="button"
                                className="px-2.5 py-1 rounded-full border border-white/15 text-[11px] text-white/70 hover:bg-white/10 transition"
                                onClick={() =>
                                  setReviewIdentityField("setName", option, {
                                    force: true,
                                    source: "manual",
                                    userVerified: true,
                                  })
                                }
                              >
                                {option}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="text-[11px] text-white/60">
                            Multiple sets exist for this year. Select the correct set.
                          </div>
                        )}
                        <div className="mt-3">
                          <div className="text-[11px] uppercase tracking-[0.2em] text-white/50 mb-2">
                            Manual Set
                          </div>
                          <input
                            type="text"
                            value={manualSetValue}
                            onChange={(event) => setManualSetValue(event.target.value)}
                            className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-white/30"
                            placeholder="Enter set name"
                          />
                          <button
                            type="button"
                            className="mt-2 w-full rounded-xl border border-white/20 py-2 text-[11px] uppercase tracking-[0.25em] text-white/70 hover:bg-white/10 transition"
                            onClick={() => {
                              const value = manualSetValue.trim();
                              if (!value) return;
                              setReviewIdentityField("setName", value, {
                                force: true,
                                source: "manual",
                                userVerified: true,
                              });
                              setManualSetValue("");
                              setActiveAssistField("");
                            }}
                          >
                            Save Set
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <div>
                  <div className="text-xs uppercase tracking-[0.3em] opacity-60">
                    Brand
                  </div>
                  <div className="text-lg mt-1 text-white/85">
                    {identityBrand ? (
                      <span className="inline-flex items-center gap-2">
                        <span>{identityBrand}</span>
                        <button
                          type="button"
                          className="inline-flex items-center px-2.5 py-1 rounded-full border border-white/15 text-[11px] uppercase tracking-[0.22em] text-white/60 hover:bg-white/10 transition"
                          onClick={() => {
                            const value = window.prompt("Brand", identityBrand);
                            if (value) {
                              setReviewIdentityField("brand", value.trim(), {
                                force: true,
                                source: "manual",
                                userVerified: true,
                              });
                            }
                          }}
                        >
                          Edit
                        </button>
                      </span>
                    ) : (
                      analysisComplete ? (
                        <span className="text-sm text-white/70 flex items-center gap-2">
                          Unknown brand
                          <span className="px-2 py-0.5 rounded-full border border-white/10 text-[10px] uppercase tracking-[0.2em] text-white/40">
                            Reviewed
                          </span>
                        </span>
                      ) : (
                        <span className="text-sm text-white/35">
                          Identifying brand<span className="lux-ellipsis" />
                        </span>
                      )
                    )}
                    {!identityBrand && analysisComplete && (
                      (() => {
                        const hint = getConfidenceInsight("brand", confidenceContext);
                        return hint ? (
                          <div className="text-xs text-white/45 mt-2">
                            Partial insight: {hint}
                          </div>
                        ) : null;
                      })()
                    )}
                    {!identityBrand && analysisComplete &&
                      renderSuggestionChips("brand")}
                  </div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-[0.3em] opacity-60">
                    Team
                  </div>
                  <div className="text-lg mt-1 text-white/85">
                    {identityTeam ? (
                      <span className="inline-flex items-center gap-2">
                        <span>{identityTeam}</span>
                        <button
                          type="button"
                          className="inline-flex items-center px-2.5 py-1 rounded-full border border-white/15 text-[11px] uppercase tracking-[0.22em] text-white/60 hover:bg-white/10 transition"
                          onClick={() => {
                            const value = window.prompt("Team", identityTeam);
                            if (value) {
                              setReviewIdentityField("team", value.trim(), {
                                force: true,
                                source: "manual",
                                userVerified: true,
                              });
                            }
                          }}
                        >
                          Edit
                        </button>
                      </span>
                    ) : (
                      <div className="flex flex-wrap items-center gap-2">
                        {analysisComplete ? (
                          <span className="text-sm text-white/70 flex items-center gap-2">
                            Unknown team
                            <span className="px-2 py-0.5 rounded-full border border-white/10 text-[10px] uppercase tracking-[0.2em] text-white/40">
                              Reviewed
                            </span>
                          </span>
                        ) : (
                          <span className="text-sm text-white/35">
                            Detecting team<span className="lux-ellipsis" />
                          </span>
                        )}
                        <button
                          type="button"
                          className="inline-flex items-center px-2.5 py-1 rounded-full border border-white/15 text-[11px] uppercase tracking-[0.22em] text-white/70 hover:bg-white/10 transition"
                          onClick={() =>
                            setActiveAssistField((prev) =>
                              prev === "team" ? "" : "team"
                            )
                          }
                        >
                          Add
                        </button>
                      </div>
                    )}
                    {!identityTeam && analysisComplete && (
                      (() => {
                        const hint = getConfidenceInsight("team", confidenceContext);
                        return hint ? (
                          <div className="text-xs text-white/45 mt-2">
                            Partial insight: {hint}
                          </div>
                        ) : null;
                      })()
                    )}
                    {!identityTeam && analysisComplete &&
                      renderSuggestionChips("team")}
                  </div>
                  {activeAssistField === "team" && !identityTeam && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {assistSuggestions("team").map((option) => (
                        <button
                          key={option}
                          type="button"
                          className="px-2.5 py-1 rounded-full border border-white/15 text-[11px] text-white/70 hover:bg-white/10 transition"
                          onClick={() => handleAssistPick("team", option)}
                        >
                          {option}
                        </button>
                      ))}
                      <button
                        type="button"
                        className="px-2.5 py-1 rounded-full border border-white/15 text-[11px] text-white/60 hover:bg-white/10 transition"
                        onClick={() => {
                          const value = window.prompt("Team");
                          if (value) handleAssistPick("team", value.trim());
                        }}
                      >
                        Enter manually
                      </button>
                    </div>
                  )}
                </div>
                <div>
                  <div className="text-xs uppercase tracking-[0.3em] opacity-60">
                    Sport
                  </div>
                  <div className="text-lg mt-1 text-white/85">
                    {identitySport ? (
                      <span className="inline-flex items-center gap-2">
                        <span>{identitySport}</span>
                        <button
                          type="button"
                          className="inline-flex items-center px-2.5 py-1 rounded-full border border-white/15 text-[11px] uppercase tracking-[0.22em] text-white/60 hover:bg-white/10 transition"
                          onClick={() => {
                            const value = window.prompt("Sport", identitySport);
                            if (value) {
                              setReviewIdentityField("sport", value.trim(), {
                                force: true,
                                source: "manual",
                                userVerified: true,
                              });
                            }
                          }}
                        >
                          Edit
                        </button>
                      </span>
                    ) : (
                      analysisComplete ? (
                        <span className="text-sm text-white/70 flex items-center gap-2">
                          Unknown sport
                          <span className="px-2 py-0.5 rounded-full border border-white/10 text-[10px] uppercase tracking-[0.2em] text-white/40">
                            Reviewed
                          </span>
                        </span>
                      ) : (
                        <span className="text-sm text-white/35">
                          Identifying sport<span className="lux-ellipsis" />
                        </span>
                      )
                    )}
                    {!identitySport && analysisComplete && (
                      (() => {
                        const hint = getConfidenceInsight("sport", confidenceContext);
                        return hint ? (
                          <div className="text-xs text-white/45 mt-2">
                            Partial insight: {hint}
                          </div>
                        ) : null;
                      })()
                    )}
                    {!identitySport && analysisComplete &&
                      renderSuggestionChips("sport")}
                  </div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-[0.3em] opacity-60">
                    {isSlabbed ? "Grade" : "Grade"}
                  </div>
                  <div className="text-lg mt-1 text-white/85">
                    {gradeLabel || ""}
                  </div>
                  {showGraderChips && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {["PSA", "BGS", "SGC", "Other"].map((option) => (
                        <button
                          key={option}
                          type="button"
                          className="px-2.5 py-1 rounded-full border border-white/15 text-[11px] text-white/70 hover:bg-white/10 transition"
                          onClick={() => {
                            if (option === "Other") {
                              const value = window.prompt("Grader");
                              if (!value) return;
                              setReviewIdentityField("grader", value.trim(), {
                                force: true,
                                source: "user",
                                userVerified: true,
                              });
                              return;
                            }
                            setReviewIdentityField("grader", option, {
                              force: true,
                              source: "user",
                              userVerified: true,
                            });
                          }}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  )}
                  {showGradeChips && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {(gradeChipOptions[reviewIdentity?.grader] || []).map(
                        (option) => (
                          <button
                            key={option}
                            type="button"
                            className="px-2.5 py-1 rounded-full border border-white/15 text-[11px] text-white/70 hover:bg-white/10 transition"
                            onClick={() =>
                              setReviewIdentityField(
                                "grade",
                                { value: option, scale: "10" },
                                {
                                  force: true,
                                  source: "user",
                                  userVerified: true,
                                }
                              )
                            }
                          >
                            {option}
                          </button>
                        )
                      )}
                      <button
                        type="button"
                        className="px-2.5 py-1 rounded-full border border-white/15 text-[11px] text-white/60 hover:bg-white/10 transition"
                        onClick={() => {
                          const value = window.prompt("Grade");
                          if (!value) return;
                          setReviewIdentityField(
                            "grade",
                            { value: value.trim(), scale: "10" },
                            { force: true, source: "user", userVerified: true }
                          );
                        }}
                      >
                        Enter manually
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <button
              className="lux-continue-btn w-full py-5 tracking-[0.28em]"
              onClick={() => navigate("/launch")}
            >
              Verify & Lock Listing →
            </button>
          </>
        )}
      </div>
    );
  }

  /* =========================================================
     =============== CASUAL LISTING LAYOUT =====================
     ========================================================= */
  return (
    <div className="app-wrapper px-6 py-10 max-w-2xl mx-auto">
      <button
        onClick={() => navigate(-1)}
        className="text-left text-sm uppercase tracking-[0.2em] mb-6 opacity-70"
      >
        ← Back
      </button>

      <h1 className="text-center text-3xl mb-10">Single Listing</h1>

      {/* MAGIC FILL — CASUAL ONLY */}
      <div className="mb-10">
        <button className="w-full py-4 rounded-[28px] bg-[#F4E9D5] text-black tracking-[0.2em]">
          Run Magic Fill
        </button>
        <div className="text-center text-xs opacity-60 mt-2">
          1 free Magic Fill per day · Upgrade for unlimited
        </div>
      </div>

      <LuxeInput label="Title" value={title} onChange={setTitle} />
      <LuxeInput label="Description" value={description} onChange={setDescription} />
      <LuxeInput label="Price" value={price} onChange={setPrice} />

      <div className="mb-6">
        <div className="text-sm uppercase opacity-70 mb-2">Category</div>
        <LuxeChipGroup
          options={CATEGORY_OPTIONS}
          value={category}
          onChange={setCategory}
        />
      </div>

      <LuxeInput label="Brand" value={brand} onChange={setBrand} />

      <div className="mb-6">
        <div className="text-sm uppercase opacity-70 mb-2">Condition</div>
        <LuxeChipGroup
          options={CONDITION_OPTIONS}
          value={condition}
          onChange={setCondition}
        />
      </div>

      <div className="mb-10">
        <div className="text-sm uppercase opacity-70 mb-2">Tags</div>
        <LuxeChipGroup
          options={TAG_OPTIONS}
          value={tags}
          multiple
          onChange={setTags}
        />
      </div>

      <button
        className="lux-continue-btn w-full py-5 tracking-[0.28em]"
        onClick={() => navigate("/launch")}
      >
        Verify & Lock Listing →
      </button>
    </div>
  );
}
