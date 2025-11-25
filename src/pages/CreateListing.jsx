import { useEffect, useRef, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/createListing.css";
import { useListingStore } from "../store/useListingStore";
import { generateResizedVariants, resizeImage } from "../utils/imageTools";
import { mockAnalyzePhotos } from "../utils/aiSmartFill";
import { convertHeicToJpeg } from "../utils/heicConverter";

// --- CATEGORY-BASED SHIPPING HINTS ---
const getShippingHints = (category) => {
  switch ((category || "").toLowerCase()) {
    case "books":
    case "media":
      return [
        "Books, DVDs, and educational items often ship most affordably via USPS Media Mail.",
        "Media Mail is slower but can save significant money for heavier books.",
        "Buyer Pays is common for books due to predictable weight.",
      ];
    case "tops":
    case "bottoms":
    case "dresses":
    case "outerwear":
    case "activewear":
      return [
        "Lightweight items under 1 lb can often ship USPS First Class at a lower cost.",
        "Seller Pays may boost visibility on some marketplaces.",
        "Flat Rate envelopes can sometimes save money for heavy clothing.",
      ];
    case "shoes":
      return [
        "Shoes are often heavy — prepaid marketplace labels may be cheaper.",
        "Flat Rate Priority boxes can save money for certain weights.",
        "Buyer Pays is common for shoe listings.",
      ];
    case "electronics":
      return [
        "Electronics may ship cheaper with prepaid marketplace labels.",
        "Priority Mail includes insurance for many items.",
        "Consider the weight — heavy electronics may cost more than expected.",
      ];
    default:
      return [
        "Compare costs between USPS First Class and marketplace prepaid labels.",
        "Offering Seller Pays can increase buyer interest.",
        "Always confirm postage at your local post office.",
      ];
  }
};
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

  const triggerUpload = () => fileInputRef.current?.click();

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
      if (category) setListingField("category", category);
      if (condition) setListingField("condition", condition);
      if (description) setListingField("description", description);
      setListingField("title", deriveTitle());
      setListingField("tags", deriveTags());
      if (tags && Array.isArray(tags)) {
        setListingField("tags", tags.join(", "));
      }
    }

    setAutoFillLoading(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!listingData.title || !listingData.description || !listingData.price || !photos.length) {
      alert("Please complete title, description, price, and upload at least one photo.");
      return;
    }

    const draft = {
      ...listingData,
      selectedPlatforms,
      id: crypto.randomUUID(),
      lastEdited: Date.now(),
    };

    addDraft(draft);
    navigate("/launch");
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
            <section className="section-wrapper">
              <h2 className="section-title">Smart Fill (Optional)</h2>
              <p className="section-subtitle">AI can suggest category, condition, description, and tags.</p>
              <div className="autofill-row">
                <button
                  type="button"
                  className="autofill-btn"
                  onClick={handleAutoFill}
                  disabled={autoFillLoading}
                >
                  {autoFillLoading ? "Generating…" : "⚡ Auto-Fill Listing With AI"}
                </button>
              </div>
            </section>

            {/* TITLE */}
            <section className="section-wrapper">
              <h2 className="section-title">Listing Details</h2>
              <p className="section-subtitle">Universal details that feed every platform.</p>
              <label className="input-label">Title</label>
              <input
                className="input-neon"
                value={listingData.title || ""}
                onChange={(e) => setListingField("title", e.target.value)}
              />
            </section>

            {/* CATEGORY */}
            <section className="section-wrapper">
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
            <section className="section-wrapper">
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

            {/* DESCRIPTION */}
            <section className="section-wrapper">
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
            <section className="section-wrapper">
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
            <section className="section-wrapper">
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
            <section className="section-wrapper">
              <h2 className="section-title">Shipping</h2>
              <p className="section-subtitle">Choose who pays. Tips update automatically.</p>
              <div className="shipping-pill-row">
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

              {listingData.shipping && (
                <div className="shipping-tips-card">
                  <p className="tips-title">✨ Smart Shipping Tips</p>

                <ul className="tips-list">
                  {getShippingHints(listingData.category).map((hint, i) => (
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

            {/* ACTIONS */}
            <section className="section-wrapper">
              <h2 className="section-title">Ready to Launch</h2>
              <p className="section-subtitle">See how your listing looks on each platform.</p>
              <div className="actions">
                <button type="button" className="ghost-link discard" onClick={discardDraft}>
                  Discard Draft
                </button>
                <button type="button" className="btn-secondary create-cta" onClick={saveDraftOnly}>
                  Save Draft
                </button>
                <button type="submit" className="btn-glass-gold create-cta">
                  Continue to Launch →
                </button>
                <button
                  type="button"
                  className="btn-secondary create-cta"
                  onClick={() => navigate("/platform-prep")}
                >
                  🚀 Next → Platform Versions
                </button>
              </div>
              <div className="next-step-wrapper">
                <div className="next-step-label">Next → Platform Versions</div>
                <div className="next-step-sub">See how your listing looks on each platform.</div>
              </div>
            </section>

          </form>
        </div>
      </div>
    </div>
  );
}

export default CreateListing;
