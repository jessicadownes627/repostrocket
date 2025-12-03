import { useEffect, useRef, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/createListing.css";
import { useListingStore } from "../store/useListingStore";
import { generateResizedVariants, resizeImage } from "../utils/imageTools";
import { convertHeicToJpeg } from "../utils/heicConverter";
import { useTitleParser } from "../hooks/useTitleParser";
import { toast } from "react-hot-toast";
import AIDiffPanel from "../components/AIDiffPanel";
import AIReviewPanel from "../components/AIReviewPanel";
import { generateAIDiffReport } from "../engines/aiDiffEngine";
import { scorePhotoQuality } from "../engines/photoQualityEngine";
import { predictFit } from "../engines/fitPredictorEngine";
import { detectListingRisks } from "../engines/riskEngine";
import AIPremiumReviewPanel from "../components/AIPremiumReviewPanel";
import PreflightModal from "../components/PreflightModal";
import PremiumModal from "../components/PremiumModal";
import { runPreflightChecks } from "../utils/preflightChecks";
import usePaywallGate from "../hooks/usePaywallGate";
import UpgradeBanner from "../components/UpgradeBanner";
import { getUsage, getLimit, incrementUsage, useUsage } from "../utils/usageTracker";
import UsageMeter from "../components/UsageMeter";
import { useSmartFill } from "../hooks/useSmartFill";
import { mergeAndCleanTags } from "../utils/mergeAndCleanTags";
import { convertSize } from "../utils/convertSize";
import { babySizeGuide } from "../utils/babySizeGuide";

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
    resetListing: resetListingStore,
    addDraft,
    setSelectedPlatforms,
    setListing,
  } = useListingStore();

  const photos = listingData.photos || [];
  const [isDragging, setIsDragging] = useState(false);
  const [autoFillLoading, setAutoFillLoading] = useState(false);
  const [photoPreviews, setPhotoPreviews] = useState([]);
  const [sizeInput, setSizeInput] = useState(listingData.size || "");
  const parsed = useTitleParser(listingData.title);
  const [magicLoading, setMagicLoading] = useState(false);
  const [showDiffPanel, setShowDiffPanel] = useState(false);
  const [diffReport, setDiffReport] = useState([]);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewResults, setReviewResults] = useState(null);
  const [showReviewPill, setShowReviewPill] = useState(false);
  const [review, setReview] = useState(null);
  const [showReviewPanel, setShowReviewPanel] = useState(false);
  const [tempMessage, setTempMessage] = useState("");

  // helper to show paywall message before modal appears
  const showPremiumHint = (msg) => {
    setTempMessage(msg);
    setTimeout(() => setTempMessage(""), 4000);
  };

  const safeParseJSON = async (response) => {
    try {
      return await response.json();
    } catch {
      return {};
    }
  };

  const postToAIFunction = async (fn, body) => {
    const response = await fetch(`/.netlify/functions/${fn}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await safeParseJSON(response);
    if (!response.ok || data?.error) {
      throw new Error(data?.error || `${fn} failed`);
    }
    return data;
  };

  const analyzeListingPhotos = async (photos = []) => {
    if (!Array.isArray(photos) || photos.length === 0) {
      throw new Error("No photos provided for analysis.");
    }
    return postToAIFunction("analyzePhotos", { photos });
  };

  const autoFillWithAI = async (photoResults) => {
    if (!photoResults || typeof photoResults !== "object") {
      throw new Error("No photo analysis available.");
    }
    return postToAIFunction("autoFill", { photoResults });
  };

  const fetchAIReview = async (listing) => {
    return postToAIFunction("aiReview", { listing });
  };

  const HINTS = {
    auto: "⚡ Auto-Fill is a Premium Feature — instantly build titles, descriptions, tags, category, and condition with AI.",
    magic: "✨ Magic Fill is Premium — auto-guess categories, colors, sizes, & smart tags from photos.",
    review: "🛠 AI Review is Premium — enhance clarity, keywords, formatting, and buyer trust.",
  };
  const [showPreflight, setShowPreflight] = useState(false);
  const [preflightResults, setPreflightResults] = useState([]);
  const { gate, paywallState, closePaywall } = usePaywallGate();
  const usage = useUsage?.() || {};
  const magicCount = String(usage.magicFill ?? "0");
  const autoCount = String(usage.autoFill ?? "0");
  const reviewCount = String(usage.aiReview ?? "0");
  const smartUsage = usage.smartFill ?? getUsageCount("smartFill");
  const smartLimit = usage.smartFillLimit || getLimit("smartFill");
  const showSmartBanner =
    smartLimit > 0 && smartUsage / smartLimit >= 0.8 && smartUsage < smartLimit;
  const launchUsage = usage.launches ?? getUsageCount("launches");
  const launchLimit = usage.launchLimit || getLimit("launches");
  const showLaunchBanner =
    launchLimit > 0 && launchUsage / launchLimit >= 0.8 && launchUsage < launchLimit;
  const primaryPlatform = selectedPlatforms[0]?.toLowerCase() || "mercari";
  const {
    tags,
    setTags: setSmartTags,
    handleCategorySelect,
    resetListing: resetSmartFillTags,
    showTags,
    handleRemoveTag,
  } = useSmartFill(listingData, primaryPlatform);

  const triggerUpload = () => fileInputRef.current?.click();
  const convertedSize = useMemo(() => convertSize(sizeInput), [sizeInput]);
  const babyInfo = useMemo(() => {
    if (!sizeInput) return null;
    return babySizeGuide[sizeInput.toLowerCase()] || null;
  }, [sizeInput]);
  const handleSizeSelect = (value) => {
    setListingField("size", value);
    setSizeInput(value);
  };

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

  const createReviewPanelData = (improved = {}) => {
    const titleAudit = improved.betterTitle
      ? [`Title idea: ${improved.betterTitle}`]
      : [];
    const descriptionAudit = improved.betterDescription
      ? [`Description idea: ${improved.betterDescription}`]
      : [];
    const highlights =
      Array.isArray(improved.betterTags) && improved.betterTags.length
        ? [`Tag ideas: ${improved.betterTags.join(", ")}`]
        : [];
    const priceAudit =
      typeof improved.price === "number"
        ? `Suggested price: $${improved.price.toFixed(2)}`
        : "Pricing looks balanced.";

    return {
      confidence: {},
      titleAudit,
      descriptionAudit,
      highlights,
      platformWarnings: {},
      priceAudit,
    };
  };

  const runReview = async (overrides = {}) => {
    const merged = { ...listingData, ...overrides };
    let improvedData = {};
    let reviewError = null;

    try {
      improvedData = await fetchAIReview(merged);
    } catch (err) {
      reviewError = err;
      console.error("AI Review failed:", err);
    } finally {
      setReviewResults(createReviewPanelData(improvedData));
      setReviewOpen(true);
      if (reviewError) {
        throw reviewError;
      }
    }
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

  useEffect(() => {
    setSizeInput(listingData.size || "");
  }, [listingData.size]);

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

  const addCustomTag = (value) => {
    const text = (value || "").trim();
    if (!text) return;
    const nextTags = mergeAndCleanTags({
      curatedTags: tags,
      customTags: [text],
    });
    setSmartTags(nextTags);
    setListingField("tags", nextTags.join(", "));
  };

  const handleRemoveTagChip = (tag) => {
    const nextTags = handleRemoveTag(tag);
    setListingField("tags", nextTags.join(", "));
  };

  const handleCategoryClick = (cat) => {
    const nextTags = handleCategorySelect(cat);
    setListingField("category", cat);
    setListingField("tags", nextTags.join(", "));
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
    if (!displayPhotos.length || !(listingData.photos || []).length) {
      alert("Please upload at least one photo to run Auto-Fill.");
      return;
    }
    setAutoFillLoading(true);

    try {
      const photoPayload = (listingData.photos || []).slice(0, 4);
      const originalSnapshot = {
        title: listingData.title,
        description: listingData.description,
        category: listingData.category,
        condition: listingData.condition,
        color: parsed?.color,
        size: listingData.size || parsed?.size,
        tags: Array.isArray(listingData.tags) ? listingData.tags.join(", ") : listingData.tags || "",
      };
      const photoAnalysis = await analyzeListingPhotos(photoPayload);
      const suggestions = await autoFillWithAI(photoAnalysis);
      if (suggestions) {
        const { category, condition, description, title, tags, price } = suggestions;
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
        const pricing = typeof price === "number" ? Math.round(price) : listingData.price;
        const proposed = {
          title: deriveTitle(),
          description: description || listingData.description,
          category: category || listingData.category,
          condition: condition || listingData.condition,
          color: parsed?.color,
          size: parsed?.size,
          tags: Array.isArray(tags) ? tags.join(", ") : deriveTags(),
          price: pricing,
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
        if (pricing !== undefined && pricing !== null) {
          setListingField("price", pricing);
        }
        setShowReviewPill(true);
        await runReview(proposed);
      }
    } catch (err) {
      console.warn("Auto Fill failed:", err);
      throw err;
    } finally {
      setAutoFillLoading(false);
    }
  };
  const handleMagicFill = async () => {
    if (!(listingData.photos || []).length) {
      alert("Please upload at least one photo to run Magic Fill.");
      return;
    }
    setMagicLoading(true);
    try {
      const photoPayload = (listingData.photos || []).slice(0, 4);
      const analysis = await analyzeListingPhotos(photoPayload);
      const updates = {};
      if (analysis.category) updates.category = analysis.category;
      if (analysis.condition) updates.condition = analysis.condition;
      if (analysis.description) updates.description = analysis.description;
      if (analysis.color) updates.color = analysis.color;
      if (Array.isArray(analysis.tags) && analysis.tags.length) {
        updates.tags = analysis.tags.join(", ");
      }
      Object.entries(updates).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== "") {
          setListingField(key, val);
        }
      });
      setShowReviewPill(true);
      await runReview(updates);
    } catch (err) {
      console.warn("Magic Fill failed:", err);
      alert("Magic Fill couldn't complete — using your existing details.");
      throw err;
    } finally {
      setMagicLoading(false);
    }
  };
  const handleAIReview = async () => {
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
    try {
      await runReview();
    } finally {
      setShowReviewPanel(true);
    }
  };

  const handleClearListing = () => {
    resetListingStore();
    resetSmartFillTags();
    setPhotoPreviews([]);
    setShowReviewPill(false);
    setReview(null);
    setReviewResults(null);
    setDiffReport([]);
    setShowDiffPanel(false);
    setSizeInput("");
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
    resetListingStore();
    resetSmartFillTags();
    setPhotoPreviews([]);
    setSizeInput("");
  };

  const handleDiscard = () => discardDraft();
  const handleSaveDraft = () => saveDraftOnly();
  const handlePreviewListing = () => gate("launches", triggerPreflight);
  const handleLaunch = () => gate("launches", () => navigate("/loading"));
  const handleDeck = () => {
    setListing(listingData);
    navigate("/launch-deck");
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
            {/* TITLE */}
            <section className="section-wrapper spaced-section description-block">
              <h2 className="section-title">Listing Details</h2>
              <p className="section-subtitle">Universal details that feed every platform.</p>
              <p className="section-subtitle listing-question">What are you selling?</p>
              <label className="input-label">Title</label>
              <input
                className="input-neon title-highlight"
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

            {/* SMART FILL — PREMIUM AI CONCIERGE */}
            <div className="rr-smartfill-wrapper">
              <h2 className="rr-smart-title">Smart Fill (Optional)</h2>
              <p className="rr-smart-helper">
                Choose how much help you want — from a quick polish to full AI automation.
              </p>

              {/* Usage box */}
              <div className="rr-usage-box">
                <div className="rr-usage-label">Your AI Usage Today</div>
                <p className="rr-usage-line">
                  Smart Fill {smartUsage}/{smartLimit}
                  &nbsp;&nbsp;•&nbsp;&nbsp;
                  Auto Fill {autoCount}/0
                  &nbsp;&nbsp;•&nbsp;&nbsp;
                  AI Review {reviewCount}/0
                  &nbsp;&nbsp;•&nbsp;&nbsp;
                  Launches {launchUsage}/{launchLimit}
                </p>
              </div>

              {/* Magic Fill */}
              <div
                className="rr-smart-card rr-magic-card"
                onClick={() => {
                  incrementUsage("smartFill");
                  handleMagicFill()
                    .then(() => toast("✨ Magic Fill complete — review below"))
                    .catch(() => toast("Magic Fill couldn't complete — using your details."));
                }}
              >
                <div className="rr-smart-header">
                  <span className="rr-smart-title-inline">✨ Magic Fill My Listing</span>
                  <span className="rr-premium-tag">Free • 1/day</span>
                </div>
                <p className="rr-smart-desc">
                  <strong>What it does:</strong> Uses your photos to auto-detect category, color, size, and tags.<br />
                  <strong>Best for:</strong> A fast jumpstart before polishing.
                </p>
              </div>

              {/* Auto Fill */}
              <div
                className="rr-smart-card rr-auto-card"
                onClick={() => {
                  incrementUsage("autoFill");
                  handleAutoFill()
                    .then(() => toast("⚡ Auto-Fill complete — your listing is now fully built"))
                    .catch(() => toast("Auto-Fill couldn't complete."));
                }}
              >
                <div className="rr-smart-header">
                  <span className="rr-smart-title-inline">⚡ Full AI Auto-Fill</span>
                  <span className="rr-premium-tag premium">Premium</span>
                </div>
                <p className="rr-smart-desc">
                  <strong>What it does:</strong> Builds the entire listing automatically — title, description, category, tags, condition.<br />
                  <strong>Best for:</strong> “Do it all for me” mode.
                </p>
              </div>

              {/* AI Review */}
              <div
                className="rr-smart-card rr-review-card"
                onClick={() => {
                  incrementUsage("aiReview");
                  handleAIReview()
                    .then(() => toast("🛠 AI Review complete — see suggested improvements"))
                    .catch(() => toast("AI Review couldn't complete."));
                }}
              >
                <div className="rr-smart-header">
                  <span className="rr-smart-title-inline">🛠 Optimize Listing (AI Review)</span>
                  <span className="rr-premium-tag">Free • 1/day</span>
                </div>
                <p className="rr-smart-desc">
                  <strong>What it does:</strong> Improves clarity, keywords, formatting, and boosts visibility.
                  <span className="rr-powered-tag">Review powered by Repost Rocket AI</span>
                </p>
              </div>

              {/* Clear Listing */}
              <div
                className="rr-smart-card rr-clear-card"
                onClick={handleClearListing}
              >
                <div className="rr-smart-header">
                  <span className="rr-smart-title-inline">🧹 Clear Listing Fields</span>
                </div>
                <p className="rr-smart-desc">
                  Resets everything so you can start fresh.
                </p>
              </div>
            </div>

            {/* DESCRIPTION */}
            <section className="section-wrapper spaced-section">
              <div className="section-card">
                <h2 className="section-title">Description</h2>
                <p className="section-sub">Tell buyers what makes this item great.</p>
                <textarea
                  rows={6}
                  className="input-neon description-box"
                  value={listingData.description || ""}
                  onChange={(e) => setListingField("description", e.target.value)}
                  placeholder="Write a clear, helpful description..."
                />
              </div>
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
                    onClick={() => handleCategoryClick(cat)}
                  >
                    {cat}
                  </button>
                ))}
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
                    onClick={() => handleSizeSelect(sz)}
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
                      onClick={() => handleSizeSelect(sz)}
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
                          onClick={() => handleSizeSelect(sz)}
                        >
                          {sz}
                        </button>
                      ))}
                    </div>
                  )}
              {convertedSize && (
                <div className="size-intel-box">
                  {convertedSize.us_women && <p>Women’s US: {convertedSize.us_women}</p>}
                  {convertedSize.us_men && <p>Men’s US: {convertedSize.us_men}</p>}
                  {convertedSize.eu && <p>EU: {convertedSize.eu}</p>}
                  {convertedSize.uk && <p>UK: {convertedSize.uk}</p>}
                  {convertedSize.cm && <p>CM: {convertedSize.cm}</p>}
                  {convertedSize.us_alpha && <p>US Alpha: {convertedSize.us_alpha}</p>}
                  {convertedSize.us_numeric && <p>US Numeric: {convertedSize.us_numeric}</p>}
                </div>
              )}
              {babyInfo && (
                <div className="baby-size-tooltip">
                  <p><strong>Fits:</strong> {babyInfo.weight}</p>
                  <p>{babyInfo.notes}</p>
                  <p style={{ opacity: 0.7 }}>
                    Tip: Babies grow 1 size every 2–3 months. 
                    Shopping ahead? Choose the next size up for future seasons.
                  </p>
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

            {/* SMART TAGS */}
            <section className="section-wrapper spaced-section">
              <h2 className="section-title center">Smart Tags</h2>
              <p className="section-subtitle center">Tap all that apply — these help refine your listing everywhere.</p>
              {showTags && (
                <div className="curated-style-tags">
                  <div className="tag-chip-wrapper">
                    {tags.map((tag) => (
                      <span key={tag} className="tag-chip">
                        <span>{tag}</span>
                        <button
                          type="button"
                          className="tag-chip-remove"
                          onClick={() => handleRemoveTagChip(tag)}
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                  <input
                    type="text"
                    className="input-neon custom-tag-input"
                    placeholder="Add custom tag"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addCustomTag(e.target.value);
                        e.target.value = "";
                      }
                    }}
                  />
                </div>
              )}

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
              <div className="section-card ready-launch">
                <h2 className="section-title">Ready to Launch</h2>
                <p className="section-sub">Preview your listing and launch to your selected platforms.</p>

                <button className="utility-link discard-draft" onClick={handleDiscard}>
                  Delete Listing
                </button>

                <button className="btn-outline-champagne" onClick={handlePreviewListing}>
                  PREVIEW LISTING →
                </button>

                <button className="btn-primary-champagne" onClick={handleLaunch}>
                  🚀 LAUNCH TO PLATFORMS →
                </button>
              </div>
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
    <PremiumModal
      open={paywallState.open}
      reason={paywallState.reason}
      usage={paywallState.usage}
      limit={paywallState.limit}
      tempMessage={tempMessage}
      onClose={() => {
        closePaywall();
        setTempMessage("");
      }}
      onUpgrade={() => {
        window.location.href = "/upgrade";
      }}
    />
  </>
  );
}

export default CreateListing;
