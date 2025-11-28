import { useEffect, useRef, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/createListing.css";
import { useListingStore } from "../store/useListingStore";
import { generateResizedVariants, resizeImage } from "../utils/imageTools";
import { mockAnalyzePhotos } from "../utils/aiSmartFill";
import { convertHeicToJpeg } from "../utils/heicConverter";
import { useTitleParser } from "../hooks/useTitleParser";
import { runMagicFill } from "../engines/MagicFillEngine";
import AIDiffPanel from "../components/AIDiffPanel";
import AIReviewPanel from "../components/AIReviewPanel";
import { aiReviewEngine } from "../engines/aiReviewEngine";
import { generateAIDiffReport } from "../engines/aiDiffEngine";
import { scorePhotoQuality } from "../engines/photoQualityEngine";
import { predictFit } from "../engines/fitPredictorEngine";
import { detectListingRisks } from "../engines/riskEngine";
import AIPremiumReviewPanel from "../components/AIPremiumReviewPanel";
import PreflightModal from "../components/PreflightModal";
import { runPreflightChecks } from "../utils/preflightChecks";

// --- Dynamic Shipping Tips ---
function getShippingHints(category, shippingChoice) {
  const baseTips = [
    "Compare costs between USPS First Class and marketplace prepaid labels.",
    "Always confirm postage at your local post office.",
  ];

  if (shippingChoice === "buyer pays") {
    return [
      "Offering Buyer Pays keeps your price competitive.",
      "Great for lightweight items under 1 lb.",
      ...baseTips,
    ];
  }

  if (shippingChoice === "seller pays") {
    return [
      "Seller Pays can increase buyer interest.",
      "Ideal for higher-priced or fast-moving items.",
      ...baseTips,
    ];
  }

  return baseTips;
}
const shippingOptions = ["buyer pays", "seller pays", "skip"];
const CATEGORY_OPTIONS = [
  // Apparel
  "Tops",
  "Bottoms",
  "Dresses",
  "Outerwear",
  "Activewear",

  // Fashion Extras
  "Shoes",
  "Accessories",
  "Bags",

  // Lifestyle / Home
  "Home Goods",
  "Beauty & Grooming",
  "Kids & Baby",
  "Toys & Games",

  // Electronics / Media
  "Electronics",
  "Media",
  "Other",
];
const tapConditions = ["New", "Like New", "Good", "Fair"];
// --- UNIVERSAL PREMIUM TAGS ---
const TAG_OPTIONS = [
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
];

// --- UNIVERSAL SIZE OPTIONS ---
const UNIVERSAL_SIZE_OPTIONS = [
  "XXS",
  "XS",
  "S",
  "M",
  "L",
  "XL",
  "XXL",
  "0",
  "2",
  "4",
  "6",
  "8",
  "10",
  "12",
  "14",
  "16",
  "Plus 1X",
  "Plus 2X",
  "Plus 3X",
];

// Shoes
const SHOE_SIZES = ["5", "5.5", "6", "6.5", "7", "7.5", "8", "8.5", "9", "9.5", "10", "11"];

// Kids sizes
const KIDS_SIZES = [
  "0–3m",
  "3–6m",
  "6–9m",
  "9–12m",
  "12–18m",
  "18–24m",
  "2T",
  "3T",
  "4T",
  "5",
  "6",
  "7",
  "8",
  "10",
  "12",
  "14",
];

// Bag types
const BAG_TYPES = [
  "Clutch",
  "Shoulder Bag",
  "Crossbody",
  "Tote",
  "Diaper Bag",
  "Backpack",
  "Satchel",
  "Hobo Bag",
  "Mini Bag",
];

// --- SMART PRICE SUGGESTION LOGIC ---
const getPriceSuggestions = (listing) => {
  const base = Number(listing.price) || 0;
  const condition = (listing.condition || "").toLowerCase();

  // fallback baseline if user hasn't typed anything
  let baseline = 22;

  if (base > 0) {
    baseline = base;
  } else {
    // If no price typed, estimate starter
    if (condition.includes("new")) baseline = 32;
    if (condition.includes("like")) baseline = 28;
    if (condition.includes("good")) baseline = 20;
    if (condition.includes("fair")) baseline = 15;
  }

  const low = Math.max(5, Math.round(baseline * 0.75));
  const recommended = Math.round(baseline);
  const ambitious = Math.round(baseline * 1.25);

  return { low, recommended, ambitious };
};

function CreateListing() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const {
    listingData,
    setListingField,
    addPhotos,
    removePhoto,
    selectedPlatforms,
    resetListing,
    addDraft,
    setSelectedPlatforms,
  } = useListingStore();

  const photos = listingData.photos || [];
  const [isDragging, setIsDragging] = useState(false);
  const [autoFillLoading, setAutoFillLoading] = useState(false);
  const [photoPreviews, setPhotoPreviews] = useState([]);
  const parsed = useTitleParser(listingData.title);
  const [magicLoading, setMagicLoading] = useState(false);
  const [showDiffPanel, setShowDiffPanel] = useState(false);
  const [diffReport, setDiffReport] = useState([]);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewResults, setReviewResults] = useState(null);
  const [showReviewPill, setShowReviewPill] = useState(false);
  const [review, setReview] = useState(null);
  const [showReviewPanel, setShowReviewPanel] = useState(false);
  const [showPreflight, setShowPreflight] = useState(false);
  const [preflightResults, setPreflightResults] = useState([]);

  const triggerUpload = () => fileInputRef.current?.click();

  const isSizeRelevant = (cat = "") => {
    cat = cat.toLowerCase();
    return (
      cat.includes("tops") ||
      cat.includes("bottoms") ||
      cat.includes("dresses") ||
      cat.includes("outerwear") ||
      cat.includes("activewear") ||
      cat.includes("accessories") ||
      cat.includes("kids") ||
      cat.includes("shoes")
    );
  };

  const runReview = (overrides = {}) => {
    const merged = { ...listingData, ...overrides };
    const platforms = (selectedPlatforms || []).map((p) => p.toLowerCase());
    const result = aiReviewEngine(merged, parsed, platforms);
    setReviewResults(result);
    setReviewOpen(true);
  };

  // Auto-apply AI parsed size/bag type when relevant
  useEffect(() => {
    if (!parsed) return;

    if (parsed.size && !listingData.size && isSizeRelevant(listingData.category)) {
      setListingField("size", parsed.size.toUpperCase());
    }

    if (parsed.bagType && listingData.category === "Bags" && !listingData.bagType) {
      const cap = parsed.bagType.charAt(0).toUpperCase() + parsed.bagType.slice(1);
      setListingField("bagType", cap);
    }
  }, [parsed, listingData.category, listingData.size, listingData.bagType, setListingField]);

  const parsedTags = useMemo(() => {
    if (Array.isArray(listingData.tags)) {
      return listingData.tags;
    }
    if (typeof listingData.tags === "string") {
      return listingData.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
    }
    return [];
  }, [listingData.tags]);

  const toggleTag = (tag) => {
    const currentTags = parsedTags;

    const exists = currentTags.includes(tag);

    const next = exists ? currentTags.filter((t) => t !== tag) : [...currentTags, tag];

    setListingField("tags", next.join(", "));
  };

  /** UNIVERSAL PREVIEW (1 grid for all platforms) */
  const displayPhotos = useMemo(() => {
    if (photoPreviews.length) return photoPreviews;
    return photos;
  }, [photoPreviews, photos]);

  /** Load saved platform choice */
  useEffect(() => {
    if (!selectedPlatforms.length) {
      const stored = localStorage.getItem("rr_selectedPlatforms");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            setSelectedPlatforms(parsed);
          }
        } catch {}
      }
    }
  }, [selectedPlatforms.length, setSelectedPlatforms]);

  useEffect(() => {
    const fixIOSInput = (e) => {
      const el = e.target;
      setTimeout(() => {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 300);
    };

    const inputs = document.querySelectorAll("input, textarea");
    inputs.forEach((i) => i.addEventListener("focus", fixIOSInput));

    return () => inputs.forEach((i) => i.removeEventListener("focus", fixIOSInput));
  }, []);

  /** Convert selected images to DataURLs */
  const readFilesAsDataUrls = async (files) => {
    const arr = Array.from(files || []);
    const tasks = arr.map(
      (file) =>
        new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        })
    );
    return Promise.all(tasks);
  };

  /** Add photos + generate resized versions */
  const addPhotosWithVariants = async (dataUrls, previews) => {
    const max = Math.max(0, 4 - photos.length);
    const limitedPreviews = (previews || []).slice(0, max);
    if (limitedPreviews.length) {
      setPhotoPreviews((prev) => [...prev, ...limitedPreviews].slice(0, 4));
    }

    const limited = (dataUrls || []).slice(0, max);
    if (!limited.length) return;

    const buckets = {
      mercari: [],
      poshmark: [],
      depop: [],
      ebay: [],
      facebook: [],
      etsy: [],
    };

    const platformSetting = {
      mercari: { mode: "cover", width: 1080, height: 1080 },
      poshmark: { mode: "cover", width: 1200, height: 1600 },
      depop: { mode: "cover", width: 1080, height: 1350 },
      ebay: { mode: "longest", longest: 1600 },
      facebook: { mode: "cover", width: 1200, height: 900 },
      etsy: { mode: "cover", width: 1200, height: 900 },
    };

    try {
      for (const url of limited) {
        const resized = await generateResizedVariants(url);
        Object.entries(resized).forEach(([key, val]) => {
          if (buckets[key]) buckets[key].push(val);
        });

        for (const key in platformSetting) {
          const setting = platformSetting[key];
          const variant = await resizeImage(url, setting);
          buckets[key].push(variant);
        }
      }

      addPhotos(limited, buckets);
    } catch (err) {
      console.warn("Image resize failed; using previews only", err);
    }
  };

  /** Handle manual upload */
  const handleFileChange = async (event) => {
    const rawFiles = Array.from(event.target.files || []);

    // Convert HEIC → JPEG silently
    const processedFiles = await Promise.all(
      rawFiles.map(async (file) => await convertHeicToJpeg(file))
    );

    // Create previews (safe because now they're JPEG/PNG)
    const previews = processedFiles.map((file) => URL.createObjectURL(file));

    // Convert to dataURLs for your existing resize logic
    const dataUrls = await readFilesAsDataUrls(processedFiles);

    await addPhotosWithVariants(dataUrls, previews);
    event.target.value = "";
  };

  /** Drag-drop */
  const handleDrop = async (event) => {
    event.preventDefault();
    setIsDragging(false);

    const rawFiles = Array.from(event.dataTransfer.files || []);

    const processedFiles = await Promise.all(
      rawFiles.map(async (file) => await convertHeicToJpeg(file))
    );

    const previews = processedFiles.map((file) => URL.createObjectURL(file));
    const dataUrls = await readFilesAsDataUrls(processedFiles);

    await addPhotosWithVariants(dataUrls, previews);
  };

  const handleAutoFill = async () => {
    if (!displayPhotos.length) {
      alert("Please upload at least one photo to run Auto-Fill.");
      return;
    }
    setAutoFillLoading(true);

    const sourcePhotos = displayPhotos;
    const originalSnapshot = {
      title: listingData.title,
      description: listingData.description,
      category: listingData.category,
      condition: listingData.condition,
      color: parsed?.color,
      size: listingData.size || parsed?.size,
      tags: Array.isArray(listingData.tags) ? listingData.tags.join(", ") : listingData.tags || "",
    };
    const suggestions = await mockAnalyzePhotos(sourcePhotos);
    if (suggestions) {
      const { category, condition, description, title, tags } = suggestions;
      const deriveTitle = () => {
        if (title) return title;
        if (listingData.title) return listingData.title;
        const firstWords = (description || "").split(/\s+/).slice(0, 6).join(" ");
        return firstWords || "Auto-filled Listing";
      };
      const deriveTags = () => {
        if (tags && Array.isArray(tags)) return tags.join(", ");
        if (typeof listingData.tags === "string") return listingData.tags;
        const words = (description || listingData.description || "")
          .toLowerCase()
          .split(/[^a-z0-9]+/i)
          .filter((w) => w.length > 3);
        return words.slice(0, 8).join(", ");
      };
      const proposed = {
        title: deriveTitle(),
        description: description || listingData.description,
        category: category || listingData.category,
        condition: condition || listingData.condition,
        color: parsed?.color,
        size: parsed?.size,
        tags: Array.isArray(tags) ? tags.join(", ") : deriveTags(),
      };
      const diff = generateAIDiffReport(originalSnapshot, proposed);
      setDiffReport(diff);
      if (diff.length) setShowDiffPanel(true);
      if (category) setListingField("category", category);
      if (condition) setListingField("condition", condition);
      if (description) setListingField("description", description);
      setListingField("title", deriveTitle());
      setListingField("tags", deriveTags());
      if (tags && Array.isArray(tags)) {
        setListingField("tags", tags.join(", "));
      }
      setShowReviewPill(true);
      runReview(proposed);
    }

    setAutoFillLoading(false);
  };

  const handleMagicFill = async () => {
    setMagicLoading(true);
    try {
      const updated = await runMagicFill(listingData);
      Object.entries(updated).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== "") {
          setListingField(key, val);
        }
      });
      setShowReviewPill(true);
      runReview(updated);
    } catch (err) {
      console.warn("Magic Fill failed:", err);
      alert("Magic Fill couldn't complete — using your existing details.");
    }
    setMagicLoading(false);
  };

  const handleAIReview = () => {
    const photo = scorePhotoQuality(displayPhotos);
    const fit = predictFit(listingData);
    const risks = detectListingRisks(listingData);
    const overallScore = Math.round((photo.score + 80 - risks.length * 5) / 2);
    setReview({
      photo,
      fit,
      risks,
      overallScore,
      overallNote:
        overallScore > 85
          ? "Excellent — this listing is ready to shine."
          : overallScore > 60
          ? "Looking strong — just a few tweaks to maximize buyer confidence."
          : "Let’s boost this listing for better visibility.",
    });
    setShowReviewPanel(true);
  };

  const handleClearListing = () => {
    resetListing();
    setPhotoPreviews([]);
    setShowReviewPill(false);
    setReview(null);
    setReviewResults(null);
    setDiffReport([]);
    setShowDiffPanel(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!listingData.title?.trim())
      return alert("Please enter a title before continuing.");

    if (!listingData.description?.trim())
      return alert("Please enter a description.");

    if (!listingData.price) return alert("Please enter a price.");

    if (!photos.length) return alert("Please upload at least one photo.");

    if (!listingData.category)
      return alert("Please choose a category.");

    if (isSizeRelevant(listingData.category) && !listingData.size)
      return alert("Please choose a size.");

    const draft = {
      ...listingData,
      selectedPlatforms,
      id: crypto.randomUUID(),
      lastEdited: Date.now(),
    };

    addDraft(draft);
    navigate("/preflight");
  };

  const triggerPreflight = () => {
    const results = runPreflightChecks(listingData);
    setPreflightResults(results);
    setShowPreflight(true);
  };

  const saveDraftOnly = () => {
    const draft = {
      ...listingData,
      selectedPlatforms,
      id: crypto.randomUUID(),
      lastEdited: Date.now(),
    };
    addDraft(draft);
  };

  const discardDraft = () => {
    resetListing();
    setPhotoPreviews([]);
  };

  return (
    <>
      <div className="create-page">
        <div className="create-shell">
          <div className="create-card">

          {/* HEADER */}
          <div className="create-header">
            <div className="create-header-card">
              <p className="create-eyebrow">Step 2</p>
              <h2 className="step-title glitter-text">Create Your Listing</h2>
              <p className="step-subtitle">
                Repost Rocket builds the description, tags, and title for every platform you selected.
              </p>
            </div>
            <span className="create-pill">Step 2</span>
          </div>

          <form className="create-form" onSubmit={handleSubmit}>
            {/* PHOTOS */}
            <section className="section-wrapper">
              <div className="section-head">
                <h2 className="section-title">Listing Photos</h2>
                <p className="section-subtitle">Add up to 4 photos. We'll format them perfectly for every platform.</p>
              </div>
              <hr className="section-divider" />

              <div className="photo-area-wrapper">
                <div
                  className={`photo-area ${isDragging ? "dragging" : ""}`}
                  onDrop={handleDrop}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                >
                  <div className="universal-photo-grid">
                    {displayPhotos.map((url, i) => (
                      <div key={i} className="photo-slot filled">
                        <div className="photo-preview-wrapper">
                          <img src={url} alt="preview" className="photo-preview" />
                        </div>
                        <button
                          type="button"
                          className="remove-photo"
                          onClick={() => {
                            removePhoto(i);
                            setPhotoPreviews((prev) => prev.filter((_, idx) => idx !== i));
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    ))}

                    {Array.from({ length: Math.max(0, 4 - displayPhotos.length) }).map((_, i) => (
                      <div key={`ghost-${i}`} className="photo-slot ghost" onClick={triggerUpload}>
                        <span className="ghost-plus">+</span>
                        <small className="ghost-text">Add photo</small>
                      </div>
                    ))}
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleFileChange}
                    className="uploader-input"
                    style={{ display: "none" }}
                  />
                </div>

                <div className="upload-actions">
                  <button
                    type="button"
                    className="upload-btn neon"
                    onClick={triggerUpload}
                  >
                    Upload Photos (max 4)
                  </button>
                  <p className="upload-hint">
                    Drag & drop or tap to upload. Images auto-format per platform.
                  </p>
                </div>
              </div>
            </section>

            {/* SMART FILL */}
            <section className="section-wrapper spaced-section">
              <h2 className="section-title">Smart Fill (Optional)</h2>
              <div className="smartfill-stack">
                <button
                  type="button"
                  className="smartfill-btn gold-fill-btn"
                  onClick={handleMagicFill}
                  disabled={magicLoading}
                >
                  ✨ Magic Fill My Listing
                  <span className="smartfill-sub">
                    Uses your photos + basics to fill category, size, color, and tags.
                  </span>
                </button>

                <button
                  type="button"
                  className="smartfill-btn emerald-fill-btn"
                  onClick={handleAutoFill}
                  disabled={autoFillLoading}
                >
                  ⚡ Full AI Auto-Fill
                  <span className="smartfill-sub">
                    Builds the entire listing automatically — title, description, tags, category, condition.
                  </span>
                </button>

                <button
                  type="button"
                  className="smartfill-btn review-fill-btn"
                  onClick={handleAIReview}
                >
                  🛠 Optimize Listing (AI Review)
                  <span className="smartfill-sub">
                    Improves what you’ve written — clarity, keywords, formatting.
                  </span>
                  <span className="review-powered">Review powered by Repost Rocket AI</span>
                </button>

                <button
                  type="button"
                  className="smartfill-btn clear-fill-btn"
                  onClick={handleClearListing}
                >
                  🧹 Clear Listing Fields
                  <span className="smartfill-sub">
                    Resets everything so you can start fresh.
                  </span>
                </button>
              </div>
              {diffReport.length > 0 && (
                <div className="autofill-row">
                  <button
                    type="button"
                    className="autofill-btn ghost"
                    onClick={() => setShowDiffPanel(true)}
                    style={{ marginTop: "0.75rem" }}
                  >
                    See AI Changes
                  </button>
                </div>
              )}
              {showReviewPill && (
                <div className="ai-review-pill" onClick={() => setReviewOpen(true)}>
                  ✨ Listing enhancements available — tap to view
                </div>
              )}
            </section>

            {/* TITLE */}
            <section className="section-wrapper spaced-section">
              <h2 className="section-title">Listing Details</h2>
              <p className="section-subtitle">Universal details that feed every platform.</p>
              <label className="input-label">Title</label>
              <input
                className="input-neon"
                value={listingData.title || ""}
                onChange={(e) => setListingField("title", e.target.value)}
              />

              {parsed && (
                <div className="ai-parse-preview">
                  <h4 className="ai-parse-title">AI Parsed Details</h4>
                  <div className="ai-parse-grid">
                    <div><strong>Brand:</strong> {parsed.brand || "—"}</div>
                    <div><strong>Model:</strong> {parsed.model || "—"}</div>
                    <div><strong>Color:</strong> {parsed.color || "—"}</div>
                    <div><strong>Size:</strong> {parsed.size || "—"}</div>
                    <div><strong>Condition:</strong> {parsed.condition || "—"}</div>
                    <div><strong>Category:</strong> {parsed.category || "—"}</div>
                  </div>
                </div>
              )}
            </section>

            {/* CATEGORY */}
            <section className="section-wrapper spaced-section">
              <h2 className="section-title">Category</h2>
              <p className="section-subtitle">Tap to choose the best match.</p>
              <div className="category-grid">
                {CATEGORY_OPTIONS.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    className={`category-pill ${listingData.category === cat ? "active" : ""}`}
                    onClick={() => setListingField("category", cat)}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </section>

            {/* CONDITION */}
            <section className="section-wrapper spaced-section">
              <h2 className="section-title">Condition</h2>
              <p className="section-subtitle">Tap to select — we’ll map it per platform.</p>
              <div className="tap-grid">
                {tapConditions.map((cond) => {
                  const active = (listingData.condition || "").toLowerCase() === cond.toLowerCase();
                  return (
                    <button
                      key={cond}
                      type="button"
                      className={`tap-btn ${active ? "active" : ""}`}
                      onClick={() => setListingField("condition", cond)}
                    >
                      {cond}
                    </button>
                  );
                })}
              </div>
            </section>

            {/* SIZE (Dynamic) */}
            {isSizeRelevant(listingData.category) && (
              <section className="section-wrapper spaced-section">
                <h2 className="section-title">Size</h2>
                <p className="section-subtitle">
                  Pick the correct size so buyers don’t ask later.
                </p>

                {listingData.category?.toLowerCase().includes("shoes") && (
                  <div className="size-grid">
                    {SHOE_SIZES.map((sz) => (
                      <button
                        key={sz}
                        type="button"
                        className={`size-pill ${listingData.size === sz ? "active" : ""}`}
                        onClick={() => setListingField("size", sz)}
                      >
                        {sz}
                      </button>
                    ))}
                  </div>
                )}

                {listingData.category?.toLowerCase().includes("kids") && (
                  <div className="size-grid">
                    {KIDS_SIZES.map((sz) => (
                      <button
                        key={sz}
                        type="button"
                        className={`size-pill ${listingData.size === sz ? "active" : ""}`}
                        onClick={() => setListingField("size", sz)}
                      >
                        {sz}
                      </button>
                    ))}
                  </div>
                )}

                {!listingData.category?.toLowerCase().includes("kids") &&
                  !listingData.category?.toLowerCase().includes("shoes") && (
                    <div className="size-grid">
                      {UNIVERSAL_SIZE_OPTIONS.map((sz) => (
                        <button
                          key={sz}
                          type="button"
                          className={`size-pill ${listingData.size === sz ? "active" : ""}`}
                          onClick={() => setListingField("size", sz)}
                        >
                          {sz}
                        </button>
                      ))}
                    </div>
                  )}
              </section>
            )}

            {/* BAG TYPE (Dynamic) */}
            {listingData.category === "Bags" && (
              <section className="section-wrapper spaced-section">
                <h2 className="section-title">Bag Type</h2>
                <p className="section-subtitle">
                  Helps match your item with the right shoppers.
                </p>

                <div className="bagtype-grid">
                  {BAG_TYPES.map((bt) => (
                    <button
                      key={bt}
                      type="button"
                      className={`size-pill ${listingData.bagType === bt ? "active" : ""}`}
                      onClick={() => setListingField("bagType", bt)}
                    >
                      {bt}
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* DESCRIPTION */}
            <section className="section-wrapper spaced-section">
              <h2 className="section-title">Description</h2>
              <p className="section-subtitle">Add fit, flaws, measurements, and helpful buyer info.</p>
              <textarea
                rows={5}
                className="input-neon"
                value={listingData.description || ""}
                onChange={(e) => setListingField("description", e.target.value)}
              />
            </section>

            {/* SMART TAGS */}
            <section className="section-wrapper spaced-section">
              <h2 className="section-title center">Smart Tags</h2>
              <p className="section-subtitle center">Tap all that apply — these help refine your listing everywhere.</p>
              <div className="tag-grid">
                {TAG_OPTIONS.map((tag) => {
                  const active = parsedTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      className={`tag-pill smart-tag ${active ? "active selected" : ""}`}
                      onClick={() => toggleTag(tag)}
                    >
                      {active && <span className="check-icon">✓</span>}
                      <span>{tag}</span>
                    </button>
                  );
                })}
              </div>

              <label className="input-label">Tags</label>
              <input
                className="input-neon"
                value={parsedTags.join(", ")}
                onChange={(e) => setListingField("tags", e.target.value)}
              />
            </section>

            {/* SMART PRICING */}
            <section className="section-wrapper spaced-section">
              <h2 className="section-title">Pricing</h2>
              <p className="section-subtitle">Tap a suggested price or enter your own.</p>
              <div className="price-grid">
                {(() => {
                  const { low, recommended, ambitious } = getPriceSuggestions(listingData);
                  const suggestions = [
                    { label: "Low (fast sale)", value: low, hint: "Faster sale" },
                    { label: "Recommended", value: recommended, hint: "Balanced visibility" },
                    { label: "Ambitious", value: ambitious, hint: "Higher margin" },
                  ];

                  return suggestions.map((s) => (
                    <button
                      key={s.label}
                      type="button"
                      className={`price-pill ${Number(listingData.price) === s.value ? "active" : ""}`}
                      onClick={() => setListingField("price", s.value)}
                    >
                      <span className="pp-amount">${s.value}</span>
                      <span className="pp-label">{s.label}</span>
                      <span className="pp-hint">{s.hint}</span>
                    </button>
                  ));
                })()}
              </div>

              <input
                type="number"
                value={listingData.price || ""}
                onChange={(e) => setListingField("price", e.target.value)}
                className="input-neon"
                placeholder="Enter custom price"
              />

              <p className="price-micro">
                Price impacts visibility and buyer interest.  
                Suggested ranges use your category, condition, and description.
              </p>
            </section>

            {/* SHIPPING */}
            <section className="section-wrapper spaced-section">
              <h2 className="section-title">Shipping</h2>
              <p className="section-subtitle">Choose who pays. Tips update automatically.</p>
              <div className="shipping-pill-row shipping-pill-row-spaced">
                {shippingOptions.map((option) => (
                  <button
                    key={option}
                    type="button"
                    className={`shipping-pill ${listingData.shipping === option ? "active" : ""}`}
                    onClick={() => {
                      setListingField("shipping", option);
                    }}
                  >
                    {option.charAt(0).toUpperCase() + option.slice(1)}
                  </button>
                ))}
              </div>

              {listingData.shipping && listingData.shipping !== "skip" && (
                <div className="shipping-tips-card">
                  <p className="tips-title">✨ Smart Shipping Tips</p>

                <ul className="tips-list">
                  {getShippingHints(listingData.category, listingData.shipping).map((hint, i) => (
                    <li key={i}>{hint}</li>
                  ))}
                </ul>

                <p className="tips-disclaimer">
                  Repost Rocket provides general shipping tips only.  
                  USPS rules and postage vary by item and location — always confirm at your local post office.
                </p>
              </div>
            )}
          </section>

            <section className="section-wrapper spaced-section">
              <h2 className="section-title">Ready to Launch</h2>
              <p className="section-subtitle">Preview your listing and launch to your selected platforms.</p>

              <p className="discard-draft" onClick={discardDraft}>Discard Draft</p>

              <button
                type="button"
                className="cta-btn cta-btn-outline"
                onClick={saveDraftOnly}
              >
                Save Draft
              </button>

              <button
                type="button"
                className="cta-btn cta-btn-primary"
                onClick={triggerPreflight}
              >
                Preview Listing →
              </button>

              <button
                type="button"
                className="cta-btn cta-btn-outline"
                onClick={() => navigate("/launch")}
              >
                Launch to Platforms →
              </button>
            </section>

          </form>
        </div>
      </div>
    </div>
    {reviewOpen && (
      <AIReviewPanel
        open={reviewOpen}
        onClose={() => setReviewOpen(false)}
        results={reviewResults}
        onApply={() => setReviewOpen(false)}
      />
    )}
    {showReviewPanel && (
      <AIPremiumReviewPanel review={review} onClose={() => setShowReviewPanel(false)} />
    )}
    {showDiffPanel && (
      <AIDiffPanel diff={diffReport} onClose={() => setShowDiffPanel(false)} />
    )}
    <PreflightModal
      open={showPreflight}
      results={preflightResults}
      onClose={() => setShowPreflight(false)}
      onFix={(proceed) => {
        setShowPreflight(false);
        if (proceed) navigate("/preflight");
      }}
    />
    </>
  );
}

export default CreateListing;
