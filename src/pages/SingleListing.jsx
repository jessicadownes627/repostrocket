import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useListingStore } from "../store/useListingStore";
import { getPremiumStatus } from "../store/premiumStore";
import { runMagicFill } from "../engines/MagicFillEngine";
import LuxeChipGroup from "../components/LuxeChipGroup";
import { useCardParser } from "../hooks/useCardParser";
import { buildCardTitle } from "../utils/buildCardTitle";
import {
  brighten,
  warm,
  cool,
  autoSquare,
  removeShadows,
  blurBackground,
  studioMode,
  whiteBackgroundPro,
  downloadImageFile,
  autoFix,
} from "../utils/magicPhotoTools";
import { getPhotoWarnings } from "../utils/photoWarnings";
import { getDynamicPrice } from "../utils/dynamicPricing";
import { composeListing } from "../utils/listingComposer";
import { buildListingExportLinks } from "../utils/exportListing";
import "../styles/overrides.css";

export default function SingleListing() {
  const navigate = useNavigate();

  // Pull listing data from global store
  const {
    listingData,
    setListingField,
    resetListing,
    premiumUsesRemaining,
    consumeMagicUse,
  } = useListingStore();

  const { cardData, parseCard, loading: parsingCard } = useCardParser();

  const title = listingData?.title || "";
  const description = listingData?.description || "";
  const price = listingData?.price || "";
  const condition = listingData?.condition || "";
  const category = listingData?.category || "";
  const brand = listingData?.brand || "";
  const size = listingData?.size || "";
  const tags = Array.isArray(listingData?.tags) ? listingData.tags : [];

  const mainPhoto =
    listingData?.photos && listingData.photos.length > 0
      ? listingData.photos[0]
      : null;

  const displayedPhoto = listingData?.editedPhoto || mainPhoto;

  const cardAttributes = listingData?.cardAttributes || null;
  const isCardMode =
    category === "Sports Cards" ||
    Boolean(
      cardAttributes && typeof cardAttributes === "object" && Object.keys(cardAttributes).length
    );

  const [showReview, setShowReview] = useState(false);
  const [magicSuggestion, setMagicSuggestion] = useState(null);
  const [magicDiff, setMagicDiff] = useState(null);
  const [magicLoading, setMagicLoading] = useState(false);
  const [showUsageModal, setShowUsageModal] = useState(false);
  const [photoWarnings, setPhotoWarnings] = useState([]);
  const [autofilled, setAutofilled] = useState(false);
  const [dynamicPrice, setDynamicPrice] = useState(null);
  const [composed, setComposed] = useState(null);
  const [exportLinks, setExportLinks] = useState(null);
  const [magicError, setMagicError] = useState("");
  const [dynamicError, setDynamicError] = useState("");
  const [cardError, setCardError] = useState("");
  const [localTitle, setLocalTitle] = useState(title);

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
    "Kids & Baby",
    "Toys & Games",
    "Electronics",
    "Collectibles",
    "Sports Cards",
    "Other",
  ];

  const CONDITION_OPTIONS = ["New", "Like New", "Good", "Fair"];

  const SIZE_OPTIONS = [
    "XXS",
    "XS",
    "S",
    "M",
    "L",
    "XL",
    "XXL",
  ];

  const SMART_TAG_OPTIONS = [
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

  useEffect(() => {
    if (!listingData?.photos || listingData.photos.length === 0) {
      navigate("/prep");
      return;
    }
  }, [listingData, navigate]);

  // TrendSense Autofill — apply any saved autofill payload once
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("rr_autofill");
      if (!raw) return;
      const data = JSON.parse(raw);
      if (!data || typeof data !== "object") return;

      if (data.category) {
        setListingField("category", data.category);
      }
      if (data.brand) {
        setListingField("brand", data.brand);
      }
      if (Array.isArray(data.tags) && data.tags.length) {
        setListingField("tags", data.tags);
      }
      if (data.suggestedPrice) {
        setListingField("price", data.suggestedPrice);
      }

      window.localStorage.removeItem("rr_autofill");
      setAutofilled(true);
    } catch {
      // ignore bad or missing data
    }
  }, [setListingField]);

  // Photo warnings based on current main/edited photo
  useEffect(() => {
    const src = listingData?.editedPhoto || mainPhoto;
    if (!src) {
      setPhotoWarnings([]);
      return;
    }

    let cancelled = false;
    getPhotoWarnings(src)
      .then((warnings) => {
        if (!cancelled) setPhotoWarnings(warnings || []);
      })
      .catch(() => {
        if (!cancelled) setPhotoWarnings([]);
      });

    return () => {
      cancelled = true;
    };
  }, [listingData?.editedPhoto, mainPhoto]);

  // Title + Dynamic Pricing: debounce pricing so typing stays smooth
  useEffect(() => {
    setListingField("title", localTitle);
    setDynamicError("");
    const trimmed = localTitle.trim();

    if (!trimmed || trimmed.length < 3) {
      setDynamicPrice(null);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(() => {
      getDynamicPrice(trimmed, condition || "Good")
        .then((out) => {
          if (cancelled) return;
          setDynamicPrice(out);
        })
        .catch(() => {
          if (cancelled) return;
          setDynamicPrice(null);
          setDynamicError(
            "Unable to load pricing insights right now. Please try again."
          );
        });
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [localTitle, condition, setListingField]);

  // Keep local title in sync with store (e.g. Magic Fill, card analyze)
  useEffect(() => {
    setLocalTitle(title);
  }, [title]);

  // -------------------------------------------
  //  LUX INPUT FIELD
  // -------------------------------------------
  const handleFieldChange = (key) => (value) => {
    setListingField(key, value);
  };

  // -------------------------------------------
  //  LUX HEADER BAR
  // -------------------------------------------
  const HeaderBar = ({ label }) => (
    <div className="w-full mt-8 mb-6">
      <div className="h-[1px] w-full bg-[var(--lux-border)] opacity-50"></div>
      <div className="text-center text-[13px] tracking-[0.28em] uppercase text-[var(--lux-text)] opacity-70 py-3">
        {label}
      </div>
      <div className="h-[1px] w-full bg-[var(--lux-border)] opacity-50"></div>
    </div>
  );

  const LuxeInput = ({ label, value, onChange, placeholder }) => (
    <div className="mb-6">
      <div className="text-xs uppercase opacity-70 tracking-wide mb-2">
        {label}
      </div>
      <input
        className="w-full p-3 rounded-[12px] bg-black/30 border border-[var(--lux-border)] text-[var(--lux-text)] focus:outline-none lux-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );

  // -------------------------------------------
  //  MAGIC FILL HANDLERS
  // -------------------------------------------
  const handleRunMagicFill = async () => {
    setMagicError("");
    if (magicLoading) return;
    // Premium (including Jess override numbers + rr_dev_premium) bypasses daily limit
    const isPremiumUser =
      getPremiumStatus() ||
      (typeof window !== "undefined" &&
        window.localStorage.getItem("rr_dev_premium") === "true");

    if (!isPremiumUser && premiumUsesRemaining <= 0) {
      setShowUsageModal(true);
      return;
    }
    try {
      setMagicLoading(true);
      const raw = listingData || {};
      const current = {
        title: raw.title || "",
        description: raw.description || "",
        price: raw.price ?? "",
        condition: raw.condition || "",
        category: raw.category || "",
        size: raw.size || "",
        tags: Array.isArray(raw.tags) ? raw.tags : [],
        photos: Array.isArray(raw.photos) ? raw.photos : [],
      };

      const updated = await runMagicFill(current);
      if (!updated) {
        setMagicLoading(false);
        return;
      }

       // consume daily Magic Fill use
      consumeMagicUse();

      setMagicSuggestion(updated);

      const diffs = [];
      if (current.title !== updated.title) {
        diffs.push({
          label: "Title",
          before: current.title || "",
          after: updated.title || "",
          reason: "AI improved clarity and searchability.",
        });
      }
      if (current.description !== updated.description) {
        diffs.push({
          label: "Description",
          before: current.description || "",
          after: updated.description || "",
          reason: "AI expanded and polished the description.",
        });
      }
      if (current.price !== updated.price) {
        diffs.push({
          label: "Price",
          before: current.price || "",
          after: updated.price || "",
          reason: "AI adjusted price based on demand and condition.",
        });
      }

      const beforeTags = Array.isArray(current.tags)
        ? current.tags.join(", ")
        : "";
      const afterTags = Array.isArray(updated.tags)
        ? updated.tags.join(", ")
        : "";
      if (beforeTags !== afterTags) {
        diffs.push({
          label: "Tags",
          before: beforeTags,
          after: afterTags,
          reason: "AI refined your tags for better search visibility.",
        });
      }

      // Always store diffs (even empty) so drawer can show
      setMagicDiff(diffs);
      setShowReview(true);
    } catch (err) {
      console.error("Magic Fill failed:", err);
      setMagicError(
        "Unable to load Magic Fill insights right now. Please try again."
      );
    } finally {
      setMagicLoading(false);
    }
  };

  // -------------------------------------------
  //  CARD ANALYSIS (Sports Card Suite)
  // -------------------------------------------
  const handleAnalyzeCard = async () => {
    setCardError("");
    if (!displayedPhoto) return;

    try {
      const result = await parseCard(displayedPhoto);
      if (!result) return;

      // Store raw card attributes on the listing
      setListingField("cardAttributes", result);

      // If we can build a strong sports-card title, apply it
      const cardTitle = buildCardTitle(result);
      if (cardTitle) {
        setListingField("title", cardTitle);
      }
    } catch (err) {
      console.error("Analyze card failed:", err);
      setCardError(
        "Unable to analyze card details right now. Please try again."
      );
    }
  };

  // -------------------------------------------
  //  MAGIC PHOTO FIX (Single Listing)
  // -------------------------------------------
  const handleFix = async (fn) => {
    try {
      const src = listingData?.editedPhoto || mainPhoto;
      if (!src) return;
      const updated = await fn(src);
      setListingField("editedPhoto", updated);
      setListingField("editHistory", [
        ...(listingData.editHistory || []),
        updated,
      ]);
    } catch (err) {
      console.error("Photo fix failed:", err);
    }
  };

  const handleUndo = () => {
    const history = listingData?.editHistory || [];

    if (history.length <= 1) {
      setListingField("editedPhoto", null);
      setListingField("editHistory", []);
      return;
    }

    const newHistory = history.slice(0, -1);
    const previousVersion = newHistory[newHistory.length - 1];

    setListingField("editedPhoto", previousVersion);
    setListingField("editHistory", newHistory);
  };

  const handleRevertOriginal = () => {
    setListingField("editedPhoto", null);
    setListingField("editHistory", []);
  };

  // --------------------------
  // APPLY MAGIC RESULTS
  // --------------------------
  const handleApplyMagic = () => {
    try {
      if (!magicSuggestion) return;

      if (magicSuggestion.title) {
        setListingField("title", magicSuggestion.title);
      }
      if (magicSuggestion.description) {
        setListingField("description", magicSuggestion.description);
      }
      if (magicSuggestion.price) {
        setListingField("price", magicSuggestion.price);
      }
      if (Array.isArray(magicSuggestion.tags)) {
        setListingField("tags", magicSuggestion.tags);
      }

      setShowReview(false);
    } catch (err) {
      console.error("APPLY MAGIC FAILED:", err);
    }
  };

  // -------------------------------------------
  //  MAIN COMPONENT RENDER
  // -------------------------------------------
  return (
    <div className="app-wrapper px-6 py-10 max-w-2xl mx-auto">

      {/* ---------------------- */}
      {/*  PAGE TITLE            */}
      {/* ---------------------- */}
      <h1 className="sparkly-header header-glitter text-center text-3xl mb-3">
        Single Listing
      </h1>
      <p className="text-center lux-soft-text text-sm mb-10">
        Make your listing shine
      </p>

      {/* ---------------------- */}
      {/*  MAIN PHOTO CARD       */}
      {/* ---------------------- */}
      <div className="lux-card relative mb-14 shadow-xl">
        <div className="premium-gloss"></div>

        <div className="lux-card-title mb-3">Main Photo</div>
        <div className="text-sm opacity-70 mb-3">
          This is your primary listing photo.
        </div>

        {displayedPhoto ? (
          <>
            <div className="relative">
              <img
                src={displayedPhoto}
                alt="Main Photo"
                className="rounded-[14px] w-full h-auto object-cover"
              />
              {listingData?.editedPhoto && (
                <div className="absolute top-2 right-2 z-10 px-2 py-1 rounded-md text-[10px] font-semibold bg-[#E8D5A8] text-black shadow-md border border-black/40">
                  Edited
                </div>
              )}
            </div>
            <div className="text-center text-xs opacity-70 mt-3 select-none">
              Use the tools below to refine your photo.
            </div>
            {!listingData?.editedPhoto && photoWarnings.length > 0 && (
              <div className="mt-3 space-y-1">
                {photoWarnings.map((w, i) => (
                  <div
                    key={i}
                    className="text-[11px] opacity-70 border-l-2 border-[#E8D5A8] pl-2"
                  >
                    {w}
                  </div>
                ))}
              </div>
            )}
            {isCardMode && (
              <button
                onClick={handleAnalyzeCard}
                disabled={parsingCard}
                className="mt-4 w-full py-2.5 rounded-2xl bg-black/40 border border-[rgba(232,213,168,0.45)] text-[var(--lux-text)] text-xs tracking-[0.18em] uppercase hover:bg-black/60 transition"
              >
                {parsingCard ? "Analyzing Card…" : "Analyze Card Details"}
              </button>
            )}
            {cardError && (
              <div className="text-xs opacity-60 mt-2">
                {cardError}
              </div>
            )}
            <div className="flex flex-wrap gap-2 mt-4">
              <button
                className="lux-small-btn"
                onClick={() => handleFix(brighten)}
              >
                Brighten
              </button>
              <button
                className="lux-small-btn"
                onClick={() => handleFix(warm)}
              >
                Warm
              </button>
              <button
                className="lux-small-btn"
                onClick={() => handleFix(cool)}
              >
                Cool
              </button>
              <button
                className="lux-small-btn"
                onClick={() => handleFix(autoSquare)}
              >
                Auto-Square
              </button>
              <button
                className="lux-small-btn"
                onClick={() => handleFix(removeShadows)}
              >
                Shadows
              </button>
              <button
                className="lux-small-btn"
                onClick={() => handleFix(blurBackground)}
              >
                Blur BG
              </button>
              <button
                className="lux-small-btn"
                onClick={() => handleFix(whiteBackgroundPro)}
              >
                White BG Pro
              </button>
              <button
                className="lux-small-btn"
                onClick={() => handleFix(studioMode)}
              >
                Studio Mode
              </button>
              <button
                className="lux-small-btn bg-[#E8D5A8] text-black"
                onClick={() => handleFix(autoFix)}
              >
                Auto-Fix
              </button>
            </div>
            <button
              className="lux-small-btn mt-2"
              onClick={() =>
                downloadImageFile(
                  listingData?.editedPhoto || mainPhoto,
                  "repostrocket-photo.jpg"
                )
              }
            >
              Save Photo
            </button>
            <div className="flex flex-wrap gap-2 mt-2">
              <button
                className="lux-small-btn bg-black/40 border-white/20 text-white hover:bg-black/50"
                onClick={handleUndo}
              >
                Undo
              </button>
              <button
                className="lux-small-btn bg-red-500/20 border-red-500/40 text-red-200 hover:bg-red-500/30"
                onClick={handleRevertOriginal}
              >
                Revert
              </button>
            </div>
          </>
        ) : (
          <div className="opacity-60 text-sm">No photo found</div>
        )}
      </div>

      {/* ---------------------- */}
      {/*  MODE-SPECIFIC FIELDS  */}
      {/* ---------------------- */}
      {isCardMode ? (
        <>
          <HeaderBar label="Card Details" />

          <div className="lux-card mb-8">
            <div className="text-xs uppercase opacity-70 tracking-wide mb-3">
              Detected Attributes
            </div>
            <div className="space-y-1 text-sm opacity-85">
              <div>
                <span className="opacity-60">Player:</span>{" "}
                {cardAttributes?.player || <span className="opacity-40">—</span>}
              </div>
              <div>
                <span className="opacity-60">Team:</span>{" "}
                {cardAttributes?.team || <span className="opacity-40">—</span>}
              </div>
              <div>
                <span className="opacity-60">Year:</span>{" "}
                {cardAttributes?.year || <span className="opacity-40">—</span>}
              </div>
              <div>
                <span className="opacity-60">Set:</span>{" "}
                {cardAttributes?.set || cardAttributes?.setName || (
                  <span className="opacity-40">—</span>
                )}
              </div>
              <div>
                <span className="opacity-60">Parallel:</span>{" "}
                {cardAttributes?.parallel || (
                  <span className="opacity-40">—</span>
                )}
              </div>
              <div>
                <span className="opacity-60">Card #:</span>{" "}
                {cardAttributes?.cardNumber || (
                  <span className="opacity-40">—</span>
                )}
              </div>
            </div>
          </div>

          {/* CARD GRADING ASSIST — Sports Card Mode Only */}
          {cardAttributes?.grading && (
            <div className="lux-card mb-8">
              <div className="text-xs uppercase opacity-70 tracking-wide mb-3">
                Grading Assist
              </div>

              <div className="space-y-1 text-sm opacity-85">
                <div>
                  <span className="opacity-60">Centering:</span>{" "}
                  {cardAttributes.grading.centering || "—"}
                </div>
                <div>
                  <span className="opacity-60">Corners:</span>{" "}
                  {cardAttributes.grading.corners || "—"}
                </div>
                <div>
                  <span className="opacity-60">Edges:</span>{" "}
                  {cardAttributes.grading.edges || "—"}
                </div>
                <div>
                  <span className="opacity-60">Surface:</span>{" "}
                  {cardAttributes.grading.surface || "—"}
                </div>
              </div>
            </div>
          )}

          {/* MARKET VALUE ASSIST — Sports Card Mode Only */}
          {cardAttributes?.pricing && (
            <div className="lux-card mb-8">
              <div className="text-xs uppercase opacity-70 tracking-wide mb-3">
                Market Value Assist
              </div>

              <div className="space-y-1 text-sm opacity-85">
                <div>
                  <span className="opacity-60">Recent Low:</span>{" "}
                  {cardAttributes.pricing.low
                    ? `$${cardAttributes.pricing.low}`
                    : "—"}
                </div>
                <div>
                  <span className="opacity-60">Recent Mid:</span>{" "}
                  {cardAttributes.pricing.mid
                    ? `$${cardAttributes.pricing.mid}`
                    : "—"}
                </div>
                <div>
                  <span className="opacity-60">Recent High:</span>{" "}
                  {cardAttributes.pricing.high
                    ? `$${cardAttributes.pricing.high}`
                    : "—"}
                </div>
                <div className="mt-2">
                  <span className="opacity-60">Suggested List Price:</span>{" "}
                  {cardAttributes.pricing.suggestedListPrice
                    ? `$${cardAttributes.pricing.suggestedListPrice}`
                    : "—"}
                </div>
                <div>
                  <span className="opacity-60">Confidence:</span>{" "}
                  {cardAttributes.pricing.confidence || "—"}
                </div>
              </div>

              <div className="flex items-center gap-3 mt-4">
                <button
                  onClick={() => {
                    const encoded = encodeURIComponent(title || "");
                    if (!encoded) return;
                    window.open(
                      `https://www.ebay.com/sch/i.html?_nkw=${encoded}`,
                      "_blank"
                    );
                  }}
                  className="lux-small-btn"
                >
                  Open eBay
                </button>

                <button
                  onClick={() => {
                    const encoded = encodeURIComponent(title || "");
                    if (!encoded) return;
                    window.open(
                      `https://www.mercari.com/search/?keyword=${encoded}`,
                      "_blank"
                    );
                  }}
                  className="lux-small-btn"
                >
                  Open Mercari
                </button>

                <button
                  onClick={() => {
                    if (!title) return;
                    if (navigator?.clipboard?.writeText) {
                      navigator.clipboard.writeText(title);
                    }
                  }}
                  className="lux-small-btn"
                >
                  Copy Title
                </button>
              </div>
            </div>
          )}

          <LuxeInput
            label="Card Title"
            value={title}
            onChange={handleFieldChange("title")}
            placeholder="e.g., 2023 Prizm Shohei Ohtani #25 Silver"
          />

          <LuxeInput
            label="Card Notes"
            value={description}
            onChange={handleFieldChange("description")}
            placeholder="Sharp corners, clean surface, no creases."
          />
        </>
      ) : (
        <>
          {/* MAGIC FILL CTA */}
          <div className="mt-12 mb-6">
            <button
              onClick={handleRunMagicFill}
              className="
                w-full 
                py-3.5 
                rounded-2xl
                bg-[#E8D5A8]
                text-[#111]
                font-semibold
                tracking-wide
                text-sm
                border border-[rgba(255,255,255,0.25)]
                shadow-[0_4px_10px_rgba(0,0,0,0.45)]
                hover:bg-[#f0e1bf]
                transition-all
                active:scale-[0.98]
              "
              disabled={magicLoading}
            >
              {magicLoading ? "Running Magic…" : "Run Magic Fill"}
            </button>
            {magicError && (
              <div className="text-xs opacity-60 mt-2">
                {magicError}
              </div>
            )}
          </div>

          {/* CORE INFORMATION */}
          <HeaderBar label="Details Refined" />

          <LuxeInput
            label="Title"
            value={localTitle}
            onChange={setLocalTitle}
            placeholder="e.g., Lululemon Define Jacket — Size 6"
          />

          <LuxeInput
            label="Description"
            value={description}
            onChange={handleFieldChange("description")}
            placeholder="Brief, luxe description…"
          />

          <LuxeInput
            label="Price"
            value={price}
            onChange={handleFieldChange("price")}
            placeholder="e.g., 48"
          />

          {dynamicError && (
            <div className="text-xs opacity-60 mt-2">
              {dynamicError}
            </div>
          )}

          {dynamicPrice && (
            <>
              <div className="lux-bento-card p-4 border border-[#26292B] bg-[#0B0D0F] rounded-xl mt-4 mb-4">
                <div className="font-medium mb-1">Dynamic Price</div>
                <div className="text-2xl font-semibold text-[#E8D5A8]">
                  ${dynamicPrice.dynamic}
                </div>
                <div className="text-xs opacity-70 mt-2">
                  Recommended: ${dynamicPrice.floor} – $
                  {dynamicPrice.ceiling}
                </div>
                <div className="text-xs opacity-70">
                  Target: ${dynamicPrice.target}
                </div>
                {dynamicPrice.event && (
                  <div className="text-xs mt-2 opacity-80">
                    News Spike: {dynamicPrice.event}
                  </div>
                )}
                <button
                  type="button"
                  className="mt-3 px-3 py-1 bg-[#E8D5A8] text-black text-xs rounded-lg"
                  onClick={() =>
                    setListingField("price", dynamicPrice.dynamic)
                  }
                >
                  Set Dynamic Price
                </button>
              </div>

              <button
                type="button"
                className="mt-2 w-full bg-[#E8D5A8] text-black rounded-lg py-2 text-sm font-medium hover:opacity-90 transition"
                onClick={() => {
                  const composedResult = composeListing({
                    title,
                    brand,
                    category,
                    condition,
                    dynamicPrice: dynamicPrice.dynamic,
                    trendScore: dynamicPrice.trendScore,
                    hotTags: dynamicPrice.hotTags,
                    eventHeadline: dynamicPrice.event,
                  });
                  setComposed(composedResult);
                }}
              >
                Compose Listing
              </button>
            </>
          )}

          {composed && (
            <>
              <div className="lux-bento-card p-4 border border-[#26292B] bg-[#0B0D0F] rounded-xl mt-4 mb-4 space-y-4">
                <div>
                  <div className="font-medium mb-1">Optimized Title</div>
                  <div className="text-sm opacity-80">{composed.title}</div>
                </div>

                <div>
                  <div className="font-medium mb-1">Description</div>
                  <div className="text-sm opacity-80 whitespace-pre-line">
                    {composed.description}
                  </div>
                </div>

                {composed.hashtags && (
                  <div>
                    <div className="font-medium mb-1">Hashtags</div>
                    <div className="text-xs opacity-70">
                      {composed.hashtags}
                    </div>
                  </div>
                )}

                {composed.keywords && (
                  <div>
                    <div className="font-medium mb-1">Keywords</div>
                    <div className="text-xs opacity-70">
                      {composed.keywords}
                    </div>
                  </div>
                )}
              </div>

              <button
                type="button"
                className="mt-2 w-full bg-[#E8D5A8] text-black rounded-lg py-2 text-sm font-medium hover:opacity-90 transition"
                onClick={() => {
                  const links = buildListingExportLinks({
                    title: composed.title,
                    price: dynamicPrice?.dynamic,
                    description: composed.description,
                  });
                  setExportLinks(links);
                }}
              >
                Generate Export Links
              </button>

              {exportLinks && (
                <div className="lux-bento-card p-4 border border-[#26292B] bg-[#0B0D0F] rounded-xl mt-4 space-y-3">
                  <div className="font-medium mb-2">Export Your Listing</div>

                  <a
                    href={exportLinks.ebay}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-[#E8D5A8] underline block"
                  >
                    List on eBay →
                  </a>

                  <a
                    href={exportLinks.poshmark}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-[#E8D5A8] underline block"
                  >
                    List on Poshmark →
                  </a>

                  <a
                    href={exportLinks.mercari}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-[#E8D5A8] underline block"
                  >
                    List on Mercari →
                  </a>

                  <a
                    href={exportLinks.depop}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-[#E8D5A8] underline block"
                  >
                    List on Depop →
                  </a>

                  <a
                    href={exportLinks.grailed}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-[#E8D5A8] underline block"
                  >
                    List on Grailed →
                  </a>

                  <button
                    type="button"
                    onClick={() => {
                      if (!composed) return;
                      const text = `${composed.title}\n\n${composed.description}\n\nPrice: $${
                        dynamicPrice?.dynamic ?? ""
                      }`;
                      if (navigator?.clipboard?.writeText) {
                        navigator.clipboard.writeText(text);
                      }
                    }}
                    className="w-full text-xs py-2 mt-2 bg-[#1A1D20] border border-[#E8D5A8] text-[#E8D5A8] rounded-lg"
                  >
                    Copy Listing to Clipboard
                  </button>
                </div>
              )}
            </>
          )}

          <div className="mb-6">
            <div className="text-xs uppercase opacity-70 tracking-wide mb-2">
              Category
            </div>
            <LuxeChipGroup
              options={CATEGORY_OPTIONS}
              value={category}
              onChange={(val) => setListingField("category", val)}
            />
          </div>

          <LuxeInput
            label="Brand"
            value={brand}
            onChange={handleFieldChange("brand")}
            placeholder="e.g., Lululemon, Nike, Zara"
          />

          <div className="mb-6">
            <div className="text-xs uppercase opacity-70 tracking-wide mb-2">
              Size
            </div>
            <LuxeChipGroup
              options={SIZE_OPTIONS}
              value={size}
              onChange={(val) => setListingField("size", val)}
            />
          </div>

          <div className="mb-6">
            <div className="text-xs uppercase opacity-70 tracking-wide mb-2">
              Condition
            </div>
            <LuxeChipGroup
              options={CONDITION_OPTIONS}
              value={condition}
              onChange={(val) => setListingField("condition", val)}
            />
          </div>

          <div className="mb-6">
            <div className="text-xs uppercase opacity-70 tracking-wide mb-2">
              Tags
            </div>
            <LuxeChipGroup
              options={SMART_TAG_OPTIONS}
              value={tags}
              multiple
              onChange={(val) => setListingField("tags", val)}
            />
          </div>
        </>
      )}

      {/* ---------------------- */}
      {/*  MAGIC FILL DRAWER     */}
      {/* ---------------------- */}
      {!isCardMode && showReview && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-end justify-center px-4">
          <div className="lux-drawer w-full max-w-xl pb-8 pt-5 px-5 space-y-4">
            <div className="text-center">
              <h2 className="text-[20px] font-semibold text-[#F4E9D5]">
                Magic Fill Results
              </h2>
              <p className="text-xs opacity-70 mt-1">
                Review AI suggestions before applying them to your listing.
              </p>
              {magicDiff.length === 0 && (
                <p className="text-xs opacity-70 mt-2">
                  Magic added fresh suggestions to your listing
                </p>
              )}
            </div>

            <div className="gold-divider" />

            <div className="space-y-4 max-h-[320px] overflow-y-auto pr-1">
              {magicDiff.map((item, idx) => (
                <div key={idx} className="border border-[rgba(232,213,168,0.28)] rounded-xl p-3 bg-black/30">
                  <div className="text-xs uppercase tracking-wide opacity-70 mb-1">
                    {item.label}
                  </div>
                  <div className="flex flex-col gap-2 text-sm">
                    <div>
                      <div className="text-[11px] opacity-60 mb-0.5">Before</div>
                      <div className="text-[13px] opacity-85">
                        {item.before || <span className="opacity-50">—</span>}
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] opacity-60 mb-0.5">After</div>
                      <div className="text-[13px] text-[#F4E9D5]">
                        {item.after || <span className="opacity-50">—</span>}
                      </div>
                    </div>
                  </div>
                  {item.reason && (
                    <div className="mt-2 text-[11px] opacity-70">
                      {item.reason}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="gold-divider" />

            <div className="flex gap-3 pt-2">
              <button
                className="flex-1 lux-quiet-btn"
                onClick={() => setShowReview(false)}
              >
                Cancel
              </button>
              <button
                className="flex-1 lux-continue-btn shadow-lg"
                onClick={handleApplyMagic}
              >
                Apply Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------- */}
      {/*  ACTION BUTTONS        */}
      {/* ---------------------- */}
      <div className="mt-14 space-y-4">
        <button
          className="lux-continue-btn shadow-lg"
          onClick={() => {
            document.body.classList.add("lux-page-transition");
            setTimeout(() => {
              navigate("/launch");
              document.body.classList.remove("lux-page-transition");
            }, 180);
          }}
        >
          Continue to LaunchDeck →
        </button>

        <button
          onClick={() => navigate("/launch-listing")}
          className="w-full py-3.5 rounded-2xl bg-[#E8D5A8] text-[#111] font-semibold tracking-wide text-sm border border-[rgba(255,255,255,0.25)] shadow-[0_4px_10px_rgba(0,0,0,0.45)] hover:bg-[#f0e1bf] transition-all active:scale-[0.98]"
        >
          Launch Listing (Advanced Titles)
        </button>

        <button
          onClick={() => {
            resetListing();
            navigate("/dashboard");
          }}
          className="lux-quiet-btn w-full"
        >
          Cancel Listing
        </button>
      </div>

      {/* ---------------------- */}
      {/*  MAGIC USAGE MODAL     */}
      {/* ---------------------- */}
      {!isCardMode && showUsageModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center px-4">
          <div className="bg-[#0A0A0A] border border-[rgba(232,213,168,0.65)] rounded-2xl p-6 max-w-sm w-full text-center">
            <h2 className="text-[18px] font-semibold text-[#F4E9D5] mb-2">
              You’ve used today’s Magic Fill
            </h2>
            <p className="text-sm opacity-75 mb-5">
              You can run another Magic Fill tomorrow, or upgrade for unlimited daily magic.
            </p>
            <button
              className="lux-continue-btn w-full"
              onClick={() => setShowUsageModal(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
