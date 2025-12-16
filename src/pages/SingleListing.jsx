import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useListingStore } from "../store/useListingStore";
import { getPremiumStatus } from "../store/premiumStore";
import {
  deriveAltTextFromFilename,
  getPhotoUrl,
  normalizePhotosArray,
} from "../utils/photoHelpers";
import { generateMagicDraft } from "../utils/generateMagicDraft";
import { buildApparelAttributesFromIntel } from "../utils/apparelIntel";
import {
  analyzeCardImages,
  buildCardAttributesFromIntel,
  extractCornerPhotoEntries,
} from "../utils/cardIntel";
import LuxeChipGroup from "../components/LuxeChipGroup";
import LuxeInput from "../components/LuxeInput";
import { useCardParser } from "../hooks/useCardParser";
import { buildCardTitle } from "../utils/buildCardTitle";
import { getCuratedTags } from "../utils/curatedTagBank";
import {
  brighten,
  warm,
  cool,
  removeShadows,
  studioMode,
  autoFix,
  cropPhoto,
} from "../utils/magicPhotoTools";
import { getPhotoWarnings } from "../utils/photoWarnings";
import { getDynamicPrice } from "../utils/dynamicPricing";
import { composeListing } from "../utils/listingComposer";
import { buildListingExportLinks } from "../utils/exportListing";
import { getCategoryFromText } from "../utils/textClassifiers";
import {
  saveListingToLibrary,
  loadListingLibrary,
} from "../utils/savedListings";
import { shareImage, getImageSaveLabel } from "../utils/saveImage";
import "../styles/overrides.css";

// --- TAG FALLBACKS (must be defined first) ---
const FALLBACK_TAG_OPTIONS = [
  "Neutral",
  "Modern",
  "Minimal",
  "Classic",
  "Statement",
];
const CORNER_LABELS = {
  topLeft: "Top Left",
  topRight: "Top Right",
  bottomLeft: "Bottom Left",
  bottomRight: "Bottom Right",
};
const GRADING_PATHS = {
  featured: null, // reserved for future partner
  primary: [
    {
      label: "PSA",
      description: "Industry-standard grading with broad buyer trust.",
      url: "https://www.psacard.com/",
    },
  ],
  alternatives: [
    {
      label: "SGC",
      description: "Popular for vintage + modern slabs.",
      url: "https://gosgc.com/",
    },
    {
      label: "BGS",
      description: "Beckett grading with subgrades available.",
      url: "https://www.beckett.com/grading/",
    },
    {
      label: "CGC",
      description: "Trusted crossover grader for sports & collectibles.",
      url: "https://www.cgccards.com/",
    },
  ],
};

const CLOTHING_CATEGORY_LIST = [
  "Tops",
  "Bottoms",
  "Dresses",
  "Outerwear",
  "Activewear",
  "Shoes",
  "Accessories",
  "Bags",
  "Kids & Baby",
];

const CLOTHING_CATEGORY_SET = new Set(CLOTHING_CATEGORY_LIST);

const cleanValue = (value) =>
  value === null || value === undefined
    ? ""
    : String(value).trim().toLowerCase();

const buildTagOptionsForCategory = (category) => {
  if (!category) return FALLBACK_TAG_OPTIONS;
  const curated = getCuratedTags(category);
  if (curated && curated.length) {
    return curated;
  }
  if (category && !CLOTHING_CATEGORY_SET.has(category)) {
    const homeTags = getCuratedTags("Home Goods");
    if (homeTags.length) return homeTags;
  }
  return FALLBACK_TAG_OPTIONS;
};

export default function SingleListing() {
  const navigate = useNavigate();

  // Pull listing data from global store
  const {
    listingData,
    setListingField,
    resetListing,
    premiumUsesRemaining,
    consumeMagicUse,
    removePhoto,
    batchMode,
  } = useListingStore();

  const devPremiumOverride =
    typeof window !== "undefined" &&
    window.localStorage.getItem("rr_dev_premium") === "true";
  const isPremiumUser = getPremiumStatus() || devPremiumOverride;

  const { cardData, parseCard, loading: parsingCard } = useCardParser();

  const title = listingData?.title || "";
  const description = listingData?.description || "";
  const price = listingData?.price || "";
  const condition = listingData?.condition || "";
  const category = listingData?.category || "";
  const brand = listingData?.brand || "";
  const size = listingData?.size || "";
  const tags = Array.isArray(listingData?.tags) ? listingData.tags : [];

  const [showMagicResults, setShowMagicResults] = useState(false);
  const [magicSuggestion, setMagicSuggestion] = useState(null);
  const [magicResults, setMagicResults] = useState({ diffs: [] });
  const [magicLoading, setMagicLoading] = useState(false);
  const [showUsageModal, setShowUsageModal] = useState(false);
  const [photoWarnings, setPhotoWarnings] = useState([]);
  const [autofilled, setAutofilled] = useState(false);
  const [dynamicPrice, setDynamicPrice] = useState(null);
  const [composed, setComposed] = useState(null);
  const [exportLinks, setExportLinks] = useState(null);
  const [magicAccepted, setMagicAccepted] = useState({});
  const [magicError, setMagicError] = useState("");
  const [dynamicError, setDynamicError] = useState("");
  const [cardError, setCardError] = useState("");
  const [localTitle, setLocalTitle] = useState(title);
  const [localDescription, setLocalDescription] = useState(description);
  const [localBrand, setLocalBrand] = useState(brand);
  const [localPrice, setLocalPrice] = useState(price);
  const [showShippingTips, setShowShippingTips] = useState(true);
  const [shippingAudience, setShippingAudience] = useState("sellers");
  const [chipFlash, setChipFlash] = useState({});
  const chipFlashTimeouts = useRef({});
  const [customTag, setCustomTag] = useState("");
  const [isTrackedForTrends, setIsTrackedForTrends] = useState(false);
  const [trackFeedback, setTrackFeedback] = useState("");
  const photoPickerRef = useRef(null);
  const resultsRef = useRef(null);
  const magicDiffs = Array.isArray(magicResults?.diffs)
    ? magicResults.diffs
    : [];
  const glowScore = magicResults?.glowScore || null;
  const glowRecommendations = Array.isArray(glowScore?.recommendations)
    ? glowScore.recommendations
    : [];
  const saveImageLabel = getImageSaveLabel();
  const [photoProcessing, setPhotoProcessing] = useState(null);
  const lastPolishedPhotoRef = useRef(null);
  const [autoAnalysisTriggered, setAutoAnalysisTriggered] = useState(false);
  const [autoScrollDone, setAutoScrollDone] = useState(false);
  const [serverCardAnalyzing, setServerCardAnalyzing] = useState(false);

  useEffect(() => {
    const id = listingData?.libraryId;
    if (!id) {
      setIsTrackedForTrends(Boolean(listingData?.trackForTrends));
      return;
    }
    const library = loadListingLibrary();
    const entry = library.find((item) => item?.id === id);
    if (entry) {
      setIsTrackedForTrends(entry.trackForTrends === true);
    } else {
      setIsTrackedForTrends(Boolean(listingData?.trackForTrends));
    }
  }, [listingData?.libraryId, listingData?.trackForTrends]);

  const hasPhoto =
    Array.isArray(listingData?.photos) && listingData.photos.length > 0;
  const mainPhotoEntry = hasPhoto ? listingData.photos[0] : null;
  const mainPhoto = getPhotoUrl(mainPhotoEntry);
  const displayedPhoto = listingData?.editedPhoto || mainPhoto;

  const cardAttributes = listingData?.cardAttributes || null;
  const cornerPhotos = listingData?.cornerPhotos || [];
  const apparelIntel = listingData?.apparelIntel || null;
  const apparelAttributes = listingData?.apparelAttributes || null;
  const hasApparelSignals =
    Boolean(apparelAttributes?.itemType) ||
    Boolean(apparelAttributes?.brand) ||
    Boolean(apparelAttributes?.size) ||
    Boolean(apparelAttributes?.condition) ||
    Boolean(apparelIntel?.notes);
  const cardIntel = listingData?.cardIntel || null;
  const isCardMode =
    category === "Sports Cards" ||
    Boolean(
      cardAttributes && typeof cardAttributes === "object" && Object.keys(cardAttributes).length
    );
  const isSportsAnalysisMode = batchMode === "sports_cards" && isCardMode;
  const sportsStatusMessage = useMemo(() => {
    if (!isSportsAnalysisMode) return null;
    if (cardError) {
      return {
        tone: "text-[#F6BDB2]",
        text:
          "We couldn’t finish analyzing this card. Retake photos in Sports Card Studio or continue with manual entry below.",
      };
    }
    if (serverCardAnalyzing) {
      return {
        tone: "text-[#E8D5A8]",
        text: "Analyzing your confirmed card photo. No extra action is required here.",
      };
    }
    if (cardAttributes) {
      return {
        tone: "text-[#8FF0C5]",
        text: "Analysis complete — review the detected details below.",
      };
    }
    return {
      tone: "text-white/70",
      text: "Card queued for analysis. We’ll move you forward automatically.",
    };
  }, [isSportsAnalysisMode, cardError, serverCardAnalyzing, cardAttributes]);
  const showPhotoTools = !isSportsAnalysisMode;

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

  const ADULT_SIZE_OPTIONS = ["XXS", "XS", "S", "M", "L", "XL", "XXL"];
  const KIDS_SIZE_OPTIONS = ["2T", "3T", "4T", "5", "6", "7", "8", "10", "12", "14"];
  const BABY_SIZE_OPTIONS = ["NB", "0-3m", "3-6m", "6-9m", "9-12m", "12-18m", "18-24m"];
  const SHOE_SIZE_OPTIONS = ["5", "5.5", "6", "6.5", "7", "7.5", "8", "8.5", "9", "9.5", "10", "11", "12"];

  const CATEGORY_ALIAS_MAP = {
    Handbags: "Bags",
    "General Merchandise": "Other",
    General: "Other",
  };
  const CATEGORY_OPTION_SET = new Set(CATEGORY_OPTIONS);
  const ALL_SIZE_KEYWORDS = [
    ...ADULT_SIZE_OPTIONS,
    ...KIDS_SIZE_OPTIONS,
    ...BABY_SIZE_OPTIONS,
    ...SHOE_SIZE_OPTIONS,
  ].map((value) => ({
    value,
    token: value.toLowerCase().replace(/[^a-z0-9]/g, ""),
  }));

  const normalizeCategoryGuess = (guess = "") => {
    if (!guess) return "";
    const trimmed = guess.trim();
    if (CATEGORY_OPTION_SET.has(trimmed)) return trimmed;
    if (CATEGORY_ALIAS_MAP[trimmed]) return CATEGORY_ALIAS_MAP[trimmed];
    if (trimmed.toLowerCase().includes("card")) return "Sports Cards";
    return CATEGORY_OPTION_SET.has("Other") ? "Other" : "";
  };

  const inferCategoryFromText = (text = "") => {
    const guess = getCategoryFromText(text);
    return normalizeCategoryGuess(guess);
  };

  const inferConditionFromText = (text = "") => {
    const lower = text.toLowerCase();
    if (
      /\bnwt\b/.test(lower) ||
      lower.includes("new with tags") ||
      lower.includes("brand new") ||
      lower.includes("never worn")
    ) {
      return "New";
    }
    if (
      lower.includes("like new") ||
      lower.includes("excellent") ||
      lower.includes("gently used")
    ) {
      return "Like New";
    }
    if (lower.includes("fair condition") || lower.includes("well loved")) {
      return "Fair";
    }
    return "Good";
  };

  const inferSizeFromText = (text = "") => {
    const compressed = text.toLowerCase().replace(/[^a-z0-9]/g, "");
    for (const entry of ALL_SIZE_KEYWORDS) {
      if (entry.token && compressed.includes(entry.token)) {
        return entry.value;
      }
    }
    const match = text.toLowerCase().match(/size\s*(\d{1,2}(?:t|m)?)/);
    if (match) {
      const candidate = match[1].toUpperCase();
      const mapped = ALL_SIZE_KEYWORDS.find(
        (entry) => entry.token === candidate.toLowerCase()
      );
      return mapped ? mapped.value : candidate;
    }
    return "";
  };

  const SELLER_TIPS = [
    "Ship within 1 business day so marketplaces boost your seller score.",
    "Match packaging to the item—poly mailers for soft goods, boxes for structured pieces.",
    "Include tracking and snap a photo of the packed label before mailing.",
  ];

const BUYER_TIPS = [
  "Send tracking the moment the label prints to build instant trust.",
  "Use insured services for any order over $200 to avoid payout delays.",
  "Upgrade to signature confirmation for collectibles or electronics.",
];

  const sizeOptionsForCategory = (() => {
    if (category === "Kids & Baby") {
      return [...BABY_SIZE_OPTIONS, ...KIDS_SIZE_OPTIONS];
    }
    if (category === "Shoes") {
      return SHOE_SIZE_OPTIONS;
    }
    if (category && CLOTHING_CATEGORY_SET.has(category)) {
      return ADULT_SIZE_OPTIONS;
    }
    return [];
  })();

  const shouldShowSize = sizeOptionsForCategory.length > 0;

  const tagOptionsForCategory = buildTagOptionsForCategory(category);
  const tagChipOptions = Array.from(
    new Set([
      ...tagOptionsForCategory,
      ...(Array.isArray(tags) ? tags : []),
    ])
  );

const shippingTips =
  shippingAudience === "buyers" ? BUYER_TIPS : SELLER_TIPS;

const triggerChipFlash = useCallback((key) => {
  if (!key) return;
  setChipFlash((prev) => ({ ...prev, [key]: true }));
  if (chipFlashTimeouts.current[key]) {
    clearTimeout(chipFlashTimeouts.current[key]);
  }
  chipFlashTimeouts.current[key] = setTimeout(() => {
    setChipFlash((prev) => ({ ...prev, [key]: false }));
    chipFlashTimeouts.current[key] = null;
  }, 900);
}, []);

useEffect(() => {
  return () => {
    Object.values(chipFlashTimeouts.current || {}).forEach((timer) => {
      if (timer) clearTimeout(timer);
    });
  };
}, []);

  useEffect(() => {
    const text = `${localTitle} ${localDescription}`.trim();
    if (!text) return;

    let resolvedCategory = category;
    if (!resolvedCategory) {
      const inferredCategory = inferCategoryFromText(text);
      if (inferredCategory && inferredCategory !== category) {
        resolvedCategory = inferredCategory;
        setListingField("category", inferredCategory);
        triggerChipFlash("category");
      }
    }

    if (!condition) {
      const inferredCondition = inferConditionFromText(text);
      if (inferredCondition) {
        setListingField("condition", inferredCondition);
        triggerChipFlash("condition");
      }
    }

    if (!size) {
      const inferredSize = inferSizeFromText(text);
      if (inferredSize) {
        setListingField("size", inferredSize);
        triggerChipFlash("size");
      }
    }

    const baseCategory = resolvedCategory || category;
    if ((!tags || tags.length === 0) && baseCategory) {
      const suggestedTags = buildTagOptionsForCategory(baseCategory).slice(0, 6);
      if (suggestedTags.length) {
        setListingField("tags", suggestedTags);
        triggerChipFlash("tags");
      }
    }
  }, [
    localTitle,
    localDescription,
    category,
    condition,
    size,
    tags,
    setListingField,
    triggerChipFlash,
  ]);

  const triggerPhotoPicker = () => {
    if (isSportsAnalysisMode) return;
    if (photoPickerRef.current) {
      photoPickerRef.current.value = "";
      photoPickerRef.current.click();
    }
  };

  const handlePhotoFileChange = (event) => {
    if (isSportsAnalysisMode) return;
    const file = event.target?.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    const altText = deriveAltTextFromFilename(file.name);
    const newEntry = { url, altText, file };

    setListingField("photos", [newEntry]);
    setListingField("editedPhoto", null);
    setListingField("editHistory", []);

    if (photoPickerRef.current) {
      photoPickerRef.current.value = "";
    }
  };

  const handleRemoveMainPhoto = () => {
    if (isSportsAnalysisMode) return;
    if (!hasPhoto) return;
    removePhoto(0);
    setListingField("editedPhoto", null);
    setListingField("editHistory", []);
  };

  const handleAddCustomTag = () => {
    const normalized = customTag.trim();
    if (!normalized) return;
    const existing = Array.isArray(tags) ? tags : [];
    const alreadyExists = existing.some(
      (tag) => tag.toLowerCase() === normalized.toLowerCase()
    );
    if (alreadyExists) {
      setCustomTag("");
      return;
    }
    setListingField("tags", [...existing, normalized]);
    setCustomTag("");
    triggerChipFlash("tags");
  };

  useEffect(() => {
    if (!listingData?.photos || listingData.photos.length === 0) {
      navigate("/prep");
    }
    // run ONLY once on first load
    // DO NOT depend on listingData
  }, []);

  useEffect(() => {
    if (!Array.isArray(listingData?.photos) || listingData.photos.length === 0) {
      return;
    }
    const requiresNormalization = listingData.photos.some(
      (entry) =>
        !entry ||
        typeof entry === "string" ||
        !entry.url ||
        !entry.altText
    );
    if (requiresNormalization) {
      setListingField(
        "photos",
        normalizePhotosArray(listingData.photos, "item photo")
      );
    }
  }, [listingData?.photos, setListingField]);

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
  }, []);

  // Photo warnings based on current active/edited photo
  useEffect(() => {
    const src = displayedPhoto;
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
  }, [displayedPhoto]);

  const runDynamicPricing = useCallback(
    (rawTitle) => {
      setDynamicError("");
      const trimmed = (rawTitle || "").trim();

      if (!trimmed || trimmed.length < 3) {
        setDynamicPrice(null);
        return;
      }

      getDynamicPrice(trimmed, condition || "Good")
        .then((out) => {
          setDynamicPrice(out);
        })
        .catch(() => {
          setDynamicPrice(null);
          setDynamicError(
            "Unable to load pricing insights right now. Please try again."
          );
        });
    },
    [condition]
  );

  const isBabyApparel = useMemo(() => {
    const lower = (category || "").toLowerCase();
    if (lower.includes("baby") || lower.includes("kids") || lower.includes("toddler")) {
      return true;
    }
    const text = `${title} ${description}`.toLowerCase();
    return /\b(onesie|romper|bodysuit|nb|newborn|3m|6m|toddler)\b/.test(text);
  }, [category, title, description]);

  const renderCardConfidence = useCallback(
    (field) => {
      const level = cardIntel?.confidence?.[field];
      if (!level) return null;
      const tone =
        level === "high"
          ? "text-emerald-300 border-emerald-300/40"
          : level === "medium"
          ? "text-[#CBB78A] border-[#CBB78A]/50"
          : "text-white/60 border-white/20";
      return (
        <span
          className={`ml-2 text-[9px] uppercase tracking-[0.3em] px-2 py-0.5 rounded-full border ${tone}`}
        >
          {level}
        </span>
      );
    },
    [cardIntel]
  );

  const renderApparelConfidence = useCallback(
    (field) => {
      const level = apparelIntel?.confidence?.[field];
      if (!level) return null;
      const tone =
        level === "high"
          ? "text-emerald-300 border-emerald-300/40"
          : level === "medium"
          ? "text-[#CBB78A] border-[#CBB78A]/50"
          : "text-white/60 border-white/20";
      return (
        <span
          className={`ml-2 text-[9px] uppercase tracking-[0.3em] px-2 py-0.5 rounded-full border ${tone}`}
        >
          {level}
        </span>
      );
    },
    [apparelIntel]
  );

  const renderCornerBadge = useCallback((level) => {
    if (!level) return null;
    const tone =
      level === "high"
        ? "text-emerald-300 border-emerald-300/40"
        : level === "medium"
        ? "text-[#CBB78A] border-[#CBB78A]/50"
        : "text-white/60 border-white/20";
    return (
      <span
        className={`ml-2 text-[9px] uppercase tracking-[0.3em] px-2 py-0.5 rounded-full border ${tone}`}
      >
        {level}
      </span>
    );
  }, []);

  const handleSaveCornerImages = useCallback(async () => {
    if (!cornerPhotos.length) return;
    const payload = cornerPhotos
      .filter((entry) => entry?.url)
      .map((entry, idx) => ({
        dataUrl: entry.url,
        filename:
          entry.label?.toLowerCase().replace(/\s+/g, "-") ||
          `corner-${idx + 1}.jpg`,
      }));
    if (!payload.length) return;
    await shareImage(payload, {
      filename: "corner-photo.jpg",
      title: "Corner inspection photos",
      text: "Saved from Repost Rocket",
    });
  }, [cornerPhotos]);

  useEffect(() => {
    if (magicAccepted?.title || parsingCard) {
      setLocalTitle(title);
    }
  }, [title, magicAccepted, parsingCard]);

  useEffect(() => {
    if (magicAccepted?.description || parsingCard) {
      setLocalDescription(description);
    }
  }, [description, magicAccepted, parsingCard]);

  useEffect(() => {
    if (magicAccepted?.brand || parsingCard) {
      setLocalBrand(brand);
    }
  }, [brand, magicAccepted, parsingCard]);

  useEffect(() => {
    if (magicAccepted?.price || parsingCard) {
      setLocalPrice(price);
    }
  }, [price, magicAccepted, parsingCard]);

  // -------------------------------------------
  //  INPUT HANDLERS
  // -------------------------------------------
  const handleFieldChange = (key) => (value) => {
    setListingField(key, value);
  };

  const handleTitleChange = useCallback((value) => {
    setLocalTitle(value);
  }, [setLocalTitle]);

  const handleDescriptionChange = useCallback((value) => {
    setLocalDescription(value);
  }, [setLocalDescription]);

  const handleBrandChange = useCallback((value) => {
    setLocalBrand(value);
  }, [setLocalBrand]);

  const handlePriceChange = useCallback((value) => {
    setLocalPrice(value);
  }, [setLocalPrice]);

  const commitTitleToStore = useCallback(() => {
    const trimmed = localTitle.trim();
    if (trimmed !== title) {
      setListingField("title", trimmed);
    }
    runDynamicPricing(trimmed);
  }, [localTitle, title, setListingField, runDynamicPricing]);

  const commitDescriptionToStore = useCallback(() => {
    if (localDescription === description) return;
    setListingField("description", localDescription);
  }, [localDescription, description, setListingField]);

  const commitBrandToStore = useCallback(() => {
    if (localBrand === brand) return;
    setListingField("brand", localBrand);
  }, [localBrand, brand, setListingField]);

  const commitPriceToStore = useCallback(() => {
    if (localPrice === price) return;
    setListingField("price", localPrice);
  }, [localPrice, price, setListingField]);

  // -------------------------------------------
  //  LUX HEADER BAR
  // -------------------------------------------
  const HeaderBar = ({ label, large = false }) => (
    <div className="w-full mt-8 mb-6">
      <div className="h-[1px] w-full bg-[var(--lux-border)] opacity-50"></div>
      <div
        className={`text-center uppercase text-[var(--lux-text)] ${
          large ? "text-xl tracking-[0.4em] py-4" : "text-[13px] tracking-[0.28em] py-3 opacity-70"
        }`}
      >
        {label}
      </div>
      <div className="h-[1px] w-full bg-[var(--lux-border)] opacity-50"></div>
    </div>
  );

  // -------------------------------------------
  //  MAGIC FILL HANDLERS
  // -------------------------------------------
  const handleRunMagicFill = async () => {
    setMagicResults({ diffs: [] });
    setMagicError("");
    if (listingData?.previousAiChoices) {
      listingData.previousAiChoices = {};
    }
    if (magicLoading) return;
    // Premium (including Jess override numbers + rr_dev_premium) bypasses daily limit
    if (!isPremiumUser && premiumUsesRemaining <= 0) {
      setShowUsageModal(true);
      return;
    }
    try {
      setMagicLoading(true);
      setMagicAccepted({});
      const raw = listingData || {};
      const current = {
        title: localTitle?.trim() || raw.title || "",
        description: localDescription?.trim() || raw.description || "",
        price: localPrice?.trim() || raw.price || "",
        brand: localBrand?.trim() || raw.brand || "",
        condition: raw.condition || "",
        category: raw.category || "",
        size: raw.size || "",
        tags: Array.isArray(raw.tags) ? raw.tags : [],
        photos: Array.isArray(raw.photos) ? raw.photos : [],
      };
      const draftInput = {
        ...raw,
        ...current,
        photos: Array.isArray(raw.photos) ? raw.photos : [],
        secondaryPhotos: Array.isArray(listingData?.secondaryPhotos)
          ? listingData.secondaryPhotos
          : [],
        editedPhoto: raw.editedPhoto,
        cardIntel: listingData?.cardIntel,
        apparelIntel: listingData?.apparelIntel,
      };

      const draft = await generateMagicDraft(draftInput, {
        glowMode: true,
        cardMode: category === "Sports Cards",
        apparelMode: isBabyApparel,
        onCardIntel: (intel) => {
          if (intel) {
            setListingField("cardIntel", intel);
            const attrs = buildCardAttributesFromIntel(intel);
            if (attrs) {
              setListingField("cardAttributes", attrs);
            }
            const cornerAssets = extractCornerPhotoEntries(intel);
            setListingField("cornerPhotos", cornerAssets);
          }
        },
        onApparelIntel: (intel) => {
          if (intel) {
            setListingField("apparelIntel", intel);
            const attrs = buildApparelAttributesFromIntel(intel);
            if (attrs) {
              setListingField("apparelAttributes", attrs);
            }
          }
        },
      });
      if (!draft) {
        setMagicError("Magic Fill failed — please try again.");
        setMagicLoading(false);
        return;
      }
      const { parsed, ai } = draft;
      if (!parsed.title.after && !parsed.description.after && parsed.tags.after.length === 0) {
        setMagicError("Magic Fill failed — please try again.");
        setMagicLoading(false);
        return;
      }
      const diffs = [];
      const accepted = {};

      const pushDiff = (fieldKey, label, before, after, note) => {
        if (!after || cleanValue(before) === cleanValue(after)) return;
        diffs.push({
          fieldKey,
          label,
          before: before || "",
          after: after || "",
          reason: note,
        });
        accepted[fieldKey] = true;
      };

      pushDiff("title", "Title", current.title, parsed.title.after, parsed.title.note);
      pushDiff(
        "description",
        "Description",
        current.description,
        parsed.description.after,
        parsed.description.note
      );
      pushDiff("price", "Price", current.price, parsed.price.after, parsed.price.note);

      const beforeTags = Array.isArray(current.tags) ? current.tags : [];
      const afterTags = Array.isArray(parsed.tags.after) ? parsed.tags.after : [];
      const beforeTagsStr = beforeTags.join(", ");
      const afterTagsStr = afterTags.join(", ");
      if (afterTags.length && cleanValue(beforeTagsStr) !== cleanValue(afterTagsStr)) {
        diffs.push({
          fieldKey: "tags",
          label: "Tags",
          before: beforeTagsStr,
          after: afterTagsStr,
          reason: parsed.tags.note,
        });
        accepted.tags = true;
      }

     const suggestion = {
       title: parsed.title.after || current.title,
       description: parsed.description.after || current.description,
       price: parsed.price.after || current.price,
       tags: afterTags.length ? afterTags : beforeTags,
        category_choice: parsed.category_choice,
        style_choices: parsed.style_choices,
        debug: parsed.debug,
     };

      consumeMagicUse();

      setMagicSuggestion(suggestion);
      setMagicResults({
        diffs,
        glowScore: ai?.glowScore || null,
        intent: ai?.intent || null,
      });
      setMagicAccepted(accepted);
      setShowMagicResults(true);
      setMagicError("");
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
  const handleAnalyzeCard = useCallback(async () => {
    if (!displayedPhoto) return;
    setCardError("");
    try {
      const result = await parseCard(displayedPhoto);
      if (!result) return;

      setListingField("cardAttributes", result);
      const manualCornerAssets = extractCornerPhotoEntries(result);
      if (manualCornerAssets.length) {
        setListingField("cornerPhotos", manualCornerAssets);
      }

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
  }, [displayedPhoto, parseCard, setListingField, setCardError]);

  useEffect(() => {
    if (isSportsAnalysisMode) return;
    if (!displayedPhoto) return;
    if (parsingCard) return;
    if (cardAttributes) return;
    if (autoAnalysisTriggered) return;
    setAutoAnalysisTriggered(true);
    handleAnalyzeCard();
  }, [
    isSportsAnalysisMode,
    displayedPhoto,
    parsingCard,
    cardAttributes,
    autoAnalysisTriggered,
    handleAnalyzeCard,
  ]);

  useEffect(() => {
    if (isSportsAnalysisMode) return;
    setAutoAnalysisTriggered(false);
  }, [displayedPhoto, isSportsAnalysisMode]);

  useEffect(() => {
    if (cardAttributes) return;
    setAutoScrollDone(false);
  }, [cardAttributes]);

  useEffect(() => {
    if (!isSportsAnalysisMode) return;
    if (!cardAttributes) return;
    if (autoScrollDone) return;
    if (!resultsRef.current) return;
    const timer = setTimeout(() => {
      resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      setAutoScrollDone(true);
    }, 350);
    return () => clearTimeout(timer);
  }, [isSportsAnalysisMode, cardAttributes, autoScrollDone]);

  useEffect(() => {
    if (!isSportsAnalysisMode) return;
    if (serverCardAnalyzing) return;
    if (listingData?.cardIntel) return;
    const front = Array.isArray(listingData?.photos) ? listingData.photos : [];
    const back = Array.isArray(listingData?.secondaryPhotos)
      ? listingData.secondaryPhotos
      : [];
    if (!front.length || !back.length) return;

    let cancelled = false;
    const payload = {
      ...listingData,
      category: "Sports Cards",
      photos: front,
      secondaryPhotos: back,
    };
    const photoBundle = [...front, ...back];

    const runAnalysis = async () => {
      setServerCardAnalyzing(true);
      setCardError("");
      try {
        const intel = await analyzeCardImages(payload, { photos: photoBundle });
        if (cancelled) return;
        if (intel) {
          setListingField("cardIntel", intel);
          const attrs = buildCardAttributesFromIntel(intel);
          if (attrs) {
            setListingField("cardAttributes", attrs);
          }
          const cornerAssets = extractCornerPhotoEntries(intel);
          if (cornerAssets.length) {
            setListingField("cornerPhotos", cornerAssets);
          }
        } else {
          setCardError("Unable to analyze card details right now. Please retake the photos.");
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Sports card analysis failed:", err);
          setCardError("Unable to analyze card details right now. Please retake the photos.");
        }
      } finally {
        if (!cancelled) {
          setServerCardAnalyzing(false);
        }
      }
    };

    runAnalysis();
    return () => {
      cancelled = true;
    };
  }, [
    isSportsAnalysisMode,
    serverCardAnalyzing,
    listingData,
    listingData?.cardIntel,
    listingData?.photos,
    listingData?.secondaryPhotos,
    setListingField,
  ]);

  // -------------------------------------------
  //  MAGIC PHOTO FIX (Single Listing)
  // -------------------------------------------
  const handleFix = useCallback(
    async (fn, mode = null) => {
      try {
        const src = displayedPhoto;
        if (!src) return;
        if (mode) {
          setPhotoProcessing(mode);
        }
        const updated = await fn(src);
        setListingField("editedPhoto", updated);
        setListingField("editHistory", [
          ...(Array.isArray(listingData?.editHistory)
            ? listingData.editHistory
            : []),
          updated,
        ]);
      } catch (err) {
        console.error("Photo fix failed:", err);
      } finally {
        if (mode) {
          setPhotoProcessing((prev) => (prev === mode ? null : prev));
        }
      }
    },
    [displayedPhoto, listingData?.editHistory, setListingField]
  );

  useEffect(() => {
    if (!mainPhoto) return;
    if (lastPolishedPhotoRef.current === mainPhoto) return;
    lastPolishedPhotoRef.current = mainPhoto;
    handleFix(autoFix, "autoFix");
  }, [mainPhoto, handleFix]);

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

  const handleSavePhotoAction = async () => {
    if (!displayedPhoto) return;
    await shareImage(displayedPhoto, {
      filename: "repostrocket-photo.jpg",
      title: localTitle || "Listing photo",
      text: "Saved from Repost Rocket",
    });
  };

  const upsertLibraryEntry = (id, fields = {}) => {
    const library = loadListingLibrary();
    const idx = library.findIndex((item) => item?.id === id);
    const existing = idx >= 0 ? library[idx] : {};
    const baseEntry = {
      ...existing,
      id,
      title: localTitle || listingData?.title || "Untitled Listing",
      description: localDescription || listingData?.description || "",
      price: localPrice || listingData?.price || "",
      category,
      brand,
      condition,
      tags,
      photos: normalizePhotosArray(listingData.photos || [], "item photo"),
      ...fields,
    };
    saveListingToLibrary(baseEntry);
  };

  const handleToggleTrackForTrends = () => {
    if (!isPremiumUser) {
      setTrackFeedback("Tracking requires Premium.");
      setTimeout(() => setTrackFeedback(""), 3500);
      return;
    }

    const existingId = listingData?.libraryId;

    if (isTrackedForTrends) {
      if (existingId) {
        upsertLibraryEntry(existingId, { trackForTrends: false });
      }
      setListingField("trackForTrends", false);
      setIsTrackedForTrends(false);
      setTrackFeedback("Tracking paused.");
      setTimeout(() => setTrackFeedback(""), 2500);
      return;
    }

    const newId =
      existingId ||
      listingData?.id ||
      `trend-${Date.now()}-${Math.random().toString(16).slice(2)}`;

    if (!existingId) {
      setListingField("libraryId", newId);
    }

    upsertLibraryEntry(newId, { trackForTrends: true });

    setListingField("trackForTrends", true);
    setIsTrackedForTrends(true);
    setTrackFeedback("TrendSense will track this listing.");
    setTimeout(() => setTrackFeedback(""), 2500);
  };

  // --------------------------
  // APPLY MAGIC RESULTS
  // --------------------------
  const handleApplyMagic = () => {
    try {
      if (!magicSuggestion) return;

      const accepted = magicAccepted || {};

      if (magicSuggestion.title && accepted.title !== false) {
        setListingField("title", magicSuggestion.title);
      }
      if (magicSuggestion.description && accepted.description !== false) {
        setListingField("description", magicSuggestion.description);
      }
      if (magicSuggestion.price && accepted.price !== false) {
        setListingField("price", magicSuggestion.price);
      }
      if (Array.isArray(magicSuggestion.tags) && accepted.tags !== false) {
        setListingField("tags", magicSuggestion.tags);
      }

      setShowMagicResults(false);
    } catch (err) {
      console.error("APPLY MAGIC FAILED:", err);
    }
  };

  // -------------------------------------------
  //  MAIN COMPONENT RENDER
  // -------------------------------------------
  console.log("🔁 SingleListing re-render");

  return (
    <div className="app-wrapper px-6 py-10 max-w-2xl mx-auto">

      <button
        onClick={() => navigate(-1)}
        className="text-left text-sm text-[#E8DCC0] uppercase tracking-[0.2em] mb-4 w-fit hover:opacity-80 transition"
      >
        ← Back
      </button>
      {/* ---------------------- */}
      {/*  PAGE TITLE            */}
      {/* ---------------------- */}
      <h1 className="sparkly-header header-glitter text-center text-3xl">
        Single Listing
      </h1>
      <p className="text-center lux-soft-text text-sm mb-8">
        Make your listing shine
      </p>
      <div className="lux-divider w-2/3 mx-auto mb-10"></div>

      {isSportsAnalysisMode && sportsStatusMessage && (
        <div className="bg-black/40 border border-white/10 rounded-2xl p-4 mb-8 text-sm text-white/80">
          <div className="text-[11px] uppercase tracking-[0.35em] text-white/50 mb-2">
            Sports Card Studio Handoff
          </div>
          <p>
            We’re analyzing the front/back photos you already confirmed — no additional uploads
            or edits are needed here.
          </p>
          <div className={`mt-3 text-xs flex items-center gap-2 ${sportsStatusMessage.tone}`}>
            <span className={`inline-flex h-2 w-2 rounded-full ${parsingCard ? "bg-[#E8D5A8] animate-pulse" : cardAttributes ? "bg-emerald-400" : "bg-white/50"}`}></span>
            {sportsStatusMessage.text}
          </div>
        </div>
      )}

      {/* ---------------------- */}
      {/*  MAIN PHOTO CARD       */}
      {/* ---------------------- */}
      <div className="lux-card relative mb-14 mt-6 shadow-xl">
        <div className="premium-gloss"></div>

        <div className="lux-card-title mb-3">Primary Listing Photo</div>
        <div className="text-sm opacity-70 mb-3">
          This photo is used to generate your title, description, and details.
        </div>
        <input
          type="file"
          accept="image/*"
          ref={photoPickerRef}
          className="hidden"
          disabled={isSportsAnalysisMode}
          onChange={handlePhotoFileChange}
        />

        {displayedPhoto ? (
          <>
            <div className="relative">
              <img
                src={displayedPhoto}
                alt="Main Photo"
                className="max-w-[500px] w-full mx-auto rounded-xl shadow-[0_0_40px_rgba(0,0,0,0.4)] object-cover"
              />
              {listingData?.editedPhoto && (
                <div className="absolute top-2 right-2 z-10 px-2 py-1 rounded-md text-[10px] font-semibold bg-[#E8D5A8] text-black shadow-md border border-black/40">
                  Edited
                </div>
              )}
            </div>
            <div className="text-center text-xs opacity-70 mt-3 select-none">
              {isSportsAnalysisMode
                ? "Photos stay locked once confirmed in Sports Card Studio."
                : "Luxe tools keep this photo launch-ready."}
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
            {isCardMode && !isSportsAnalysisMode && (
              <button
                onClick={handleAnalyzeCard}
                disabled={parsingCard}
                className="mt-4 w-full py-2.5 rounded-2xl bg-black/40 border border-[rgba(232,213,168,0.45)] text-[var(--lux-text)] text-xs tracking-[0.18em] uppercase hover:bg-black/60 transition"
              >
                {parsingCard ? "Analyzing Card…" : "Analyze Card Details"}
              </button>
            )}
            {isSportsAnalysisMode && (
              <div className="mt-4 text-xs text-white/60">
                {serverCardAnalyzing
                  ? "Analyzing card details now…"
                  : cardAttributes
                  ? "Analysis finished — review the detected details below."
                  : "Queued for analysis — we’ll move forward automatically."}
              </div>
            )}
            {cardError && (
              <div className="text-xs opacity-60 mt-2">
                {cardError}
              </div>
            )}
            {showPhotoTools ? (
              <>
                <div className="mt-4 space-y-3">
                  <div className="text-[11px] uppercase tracking-[0.3em] text-white/45 mb-1">
                    Smart Polish
                  </div>
                  <button
                    className={`w-full flex items-center justify-center gap-2 py-3 rounded-[22px] bg-[#E8D5A8] text-black text-sm font-semibold tracking-[0.2em] shadow-[0_15px_35px_rgba(0,0,0,0.55)] hover:shadow-[0_18px_45px_rgba(0,0,0,0.6)] transition ${photoProcessing ? "opacity-70 pointer-events-none" : ""}`}
                    disabled={Boolean(photoProcessing)}
                    onClick={() => handleFix(autoFix, "autoFix")}
                  >
                    {photoProcessing === "autoFix" ? "Polishing…" : "Auto-Fix"}
                  </button>
                  <button
                    className={`w-full flex items-center justify-center gap-2 py-3 rounded-[20px] border border-[#E8D5A8]/50 bg-black/30 text-[#E8D5A8] text-sm tracking-[0.2em] hover:bg-black/55 transition ${photoProcessing ? "opacity-60 pointer-events-none" : ""}`}
                    disabled={Boolean(photoProcessing)}
                    onClick={() => handleFix(studioMode, "studioMode")}
                  >
                    {photoProcessing === "studioMode" ? "Applying Studio…" : "Studio Mode"}
                  </button>
                  <button
                    className="w-full py-3 mt-2 rounded-[18px] border border-[#4CC790]/60 bg-transparent text-[#80F5C2] text-sm tracking-[0.18em] shadow-[0_8px_24px_rgba(76,199,144,0.25)] hover:bg-[#4CC790]/10 transition"
                    onClick={handleSavePhotoAction}
                  >
                    Save Image
                  </button>
                  {photoProcessing && (
                    <div className="text-center text-xs text-white/60">
                      {photoProcessing === "autoFix"
                        ? "Auto-Fix is polishing your photo…"
                        : "Studio Mode is giving this photo the luxe treatment…"}
                    </div>
                  )}
                </div>

                <div className="mt-6">
                  <div className="text-[11px] uppercase tracking-[0.3em] text-white/45 mb-2">
                    Quick Adjustments
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button className="lux-small-btn" onClick={() => handleFix(brighten)}>
                      Brighten
                    </button>
                    <button className="lux-small-btn" onClick={() => handleFix(warm)}>
                      Warm
                    </button>
                    <button className="lux-small-btn" onClick={() => handleFix(cool)}>
                      Cool
                    </button>
                    <button className="lux-small-btn" onClick={() => handleFix(removeShadows)}>
                      Shadows
                    </button>
                    <button className="lux-small-btn" onClick={() => handleFix(cropPhoto)}>
                      Crop
                    </button>
                  </div>
                </div>
                <div className="mt-6 pt-4 border-t border-white/10 space-y-2 text-[13px] text-white/70">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <button
                      type="button"
                      className="flex-1 py-2 rounded-[12px] border border-white/12 bg-black/20 text-[11px] tracking-[0.2em] hover:bg-black/40 transition"
                      onClick={triggerPhotoPicker}
                    >
                      Replace Photo
                    </button>
                    <button
                      type="button"
                      className="flex-1 py-2 rounded-[12px] border border-[rgba(255,93,93,0.4)] bg-black/15 text-[#F7B3B3] text-[11px] tracking-[0.2em] hover:bg-black/30 transition"
                      onClick={handleRemoveMainPhoto}
                    >
                      Remove Photo
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2 text-[11px] tracking-[0.2em]">
                    {listingData?.editHistory?.length > 0 && (
                      <button
                        className="flex-1 min-w-[110px] py-2 rounded-[10px] border border-white/70 text-white tracking-[0.2em] bg-transparent hover:bg-white/10 transition"
                        onClick={handleUndo}
                      >
                        Undo
                      </button>
                    )}
                    <button
                      className="flex-1 min-w-[110px] py-2 rounded-[10px] border border-white/8 bg-black/10 text-white/60 hover:bg-black/25 transition"
                      onClick={handleRevertOriginal}
                    >
                      Revert
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="mt-4 text-xs text-white/50">
                Photo edits are locked from Sports Card Studio. Head below to see the detected card details.
              </div>
            )}
            {glowScore && (
              <div className="mt-6 rounded-2xl border border-[rgba(232,213,168,0.35)] bg-black/30 p-4">
                <div className="text-xs uppercase tracking-[0.35em] text-white/60 mb-2">
                  Photo Readiness
                </div>
                <p className="text-sm">Clarity: {glowScore.clarity}/5</p>
                <p className="text-sm">Fit: {glowScore.fit}/5</p>
                <p className="text-sm">Vibe: {glowScore.vibe}/5</p>
                {glowRecommendations.length > 0 && (
                  <ul className="mt-3 text-xs opacity-80 space-y-1">
                    {glowRecommendations.map((rec, index) => (
                      <li key={index}>• {rec}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </>
        ) : (
          <div>
            <div className="opacity-60 text-sm mb-4">No photo found</div>
            {isSportsAnalysisMode ? (
              <p className="text-xs text-[#F7B3B3]">
                Head back to Sports Card Studio to capture the card photo before returning here.
              </p>
            ) : (
              <button
                type="button"
                className="w-full py-2.5 rounded-[16px] border border-[rgba(255,235,200,0.5)] bg-black/60 text-[#E8DCC0] text-sm tracking-[0.2em] uppercase hover:bg-black/80 transition"
                onClick={triggerPhotoPicker}
              >
                Upload Photo
              </button>
            )}
          </div>
        )}
      </div>

      <div className="lux-divider w-2/3 mx-auto my-12"></div>

      <div ref={resultsRef}>
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
              <div className="flex items-center gap-2">
                <span className="opacity-60">Player:</span>
                {renderCardConfidence("player")}
              </div>
              <div className="pl-4">
                {cardAttributes?.player || <span className="opacity-40">—</span>}
              </div>
              <div className="flex items-center gap-2">
                <span className="opacity-60">Team:</span>
                {renderCardConfidence("team")}
              </div>
              <div className="pl-4">
                {cardAttributes?.team || <span className="opacity-40">—</span>}
              </div>
              <div className="flex items-center gap-2">
                <span className="opacity-60">Year:</span>
                {renderCardConfidence("year")}
              </div>
              <div className="pl-4">
                {cardAttributes?.year || <span className="opacity-40">—</span>}
              </div>
              <div className="flex items-center gap-2">
                <span className="opacity-60">Set:</span>
                {renderCardConfidence("setName")}
              </div>
              <div className="pl-4">
                {cardAttributes?.set || cardAttributes?.setName || (
                  <span className="opacity-40">—</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="opacity-60">Parallel:</span>
                {renderCardConfidence("parallel")}
              </div>
              <div className="pl-4">
                {cardAttributes?.parallel || (
                  <span className="opacity-40">—</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="opacity-60">Card #:</span>
                {renderCardConfidence("cardNumber")}
              </div>
              <div className="pl-4">
                {cardAttributes?.cardNumber || (
                  <span className="opacity-40">—</span>
                )}
              </div>
            </div>
          </div>

          {cardAttributes?.corners && (
            <div className="lux-card mb-8">
              <div className="text-xs uppercase opacity-70 tracking-wide mb-3">
                Corner Inspection
              </div>
              <div className="space-y-4">
                {["front", "back"].map((side) => {
                  const cornerSet = cardAttributes.corners?.[side];
                  if (!cornerSet) return null;
                  const condition = cardAttributes.cornerCondition?.[side];
                  const prettySide = side === "front" ? "Front" : "Back";
                  return (
                    <div key={side}>
                      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.35em] opacity-70">
                        {prettySide} Corners
                        {renderCornerBadge(condition?.confidence)}
                      </div>
                      {condition?.description && (
                        <div className="text-xs opacity-60 mt-1">
                          Looks {condition.description}.
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-3 mt-3">
                        {Object.entries(CORNER_LABELS).map(([key, label]) => {
                          const entry = cornerSet[key];
                          return (
                            <div key={`${side}-${key}`} className="text-center text-[11px] uppercase tracking-[0.25em]">
                              <div className="mb-2 rounded-2xl border border-white/10 bg-black/30 overflow-hidden">
                                {entry?.image ? (
                                  <img
                                    src={entry.image}
                                    alt={`${prettySide} ${label}`}
                                    className="w-full h-24 object-cover"
                                  />
                                ) : (
                                  <div className="h-24 flex items-center justify-center text-[10px] opacity-40">
                                    No data
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center justify-center gap-2 text-[10px] tracking-[0.3em]">
                                {label}
                                {renderCornerBadge(entry?.confidence)}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
              {cornerPhotos.length > 0 && (
                <button
                  type="button"
                  onClick={handleSaveCornerImages}
                  className="mt-4 w-full text-center border border-white/20 rounded-2xl py-2 text-[11px] uppercase tracking-[0.35em] text-white/80 hover:bg-white/5 transition"
                >
                  Save Corner Images
                </button>
              )}
            </div>
          )}

          {(cardAttributes?.corners || GRADING_PATHS.featured) && (
            <div className="lux-card mb-8">
              <div className="text-xs uppercase opacity-70 tracking-wide mb-3">
                Grading Paths
              </div>

              {GRADING_PATHS.featured && (
                <div className="mb-4 border border-dashed border-[#E8DCC0]/40 rounded-xl p-3 text-xs uppercase tracking-[0.35em] text-[#E8DCC0]/70 text-center">
                  Featured Partner Slot
                </div>
              )}

              <div className="text-sm opacity-80 mb-3">
                Decide if grading supports your selling plan — these services open in new tabs.
              </div>

              <div className="space-y-3">
                {GRADING_PATHS.primary.map((path) => (
                  <button
                    key={path.label}
                    type="button"
                    onClick={() => window.open(path.url, "_blank", "noopener")}
                    className="w-full text-left border border-white/15 rounded-2xl px-4 py-3 bg-black/30 hover:bg-black/40 transition"
                  >
                    <div className="flex items-center justify-between text-xs uppercase tracking-[0.35em] text-[#E8DCC0]">
                      {path.label}
                      <span className="text-[10px] opacity-70">Neutral</span>
                    </div>
                    <div className="text-sm opacity-80 mt-1">{path.description}</div>
                  </button>
                ))}
              </div>

              <div className="mt-5 text-xs uppercase tracking-[0.35em] opacity-60">
                Alternative Options
              </div>
              <div className="space-y-2 mt-2">
                {GRADING_PATHS.alternatives.map((path) => (
                  <button
                    key={path.label}
                    type="button"
                    onClick={() => window.open(path.url, "_blank", "noopener")}
                    className="w-full text-left border border-white/10 rounded-2xl px-4 py-2.5 bg-black/20 hover:bg-black/35 transition"
                  >
                    <div className="text-[11px] uppercase tracking-[0.35em] text-white/70">
                      {path.label}
                    </div>
                    <div className="text-xs opacity-65 mt-0.5">{path.description}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* CARD GRADING ASSIST — Sports Card Mode Only */}
          <div className="lux-card mb-8">
            <div className="text-xs uppercase opacity-70 tracking-wide mb-3">
              Grading Assist
            </div>

            {cardAttributes?.grading ? (
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
            ) : (
              <div className="text-sm text-white/55">
                {serverCardAnalyzing
                  ? "Grading insights will appear after analysis completes."
                  : "No grading data available for this card."}
              </div>
            )}
          </div>

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
            value={localTitle}
            onChange={handleTitleChange}
            onBlur={commitTitleToStore}
            placeholder="e.g., 2023 Prizm Shohei Ohtani #25 Silver"
          />

          <LuxeInput
            label="Card Notes"
            value={localDescription}
            onChange={handleDescriptionChange}
            onBlur={commitDescriptionToStore}
            placeholder="Sharp corners, clean surface, no creases."
          />
        </>
      ) : (
        <>
          <HeaderBar label="Details" large />

          {hasApparelSignals && (
            <div className="lux-card mb-8">
              <div className="text-xs uppercase opacity-70 tracking-wide mb-3">
                Apparel Signals
              </div>

              <div className="space-y-3 text-sm opacity-85">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="opacity-60">Item Type:</span>
                    {renderApparelConfidence("itemType")}
                  </div>
                  <div className="pl-4">
                    {apparelAttributes?.itemType || (
                      <span className="opacity-40">—</span>
                    )}
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <span className="opacity-60">Brand:</span>
                    {renderApparelConfidence("brand")}
                  </div>
                  <div className="pl-4">
                    {apparelAttributes?.brand || (
                      <span className="opacity-40">—</span>
                    )}
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <span className="opacity-60">Size:</span>
                    {renderApparelConfidence("size")}
                  </div>
                  <div className="pl-4">
                    {apparelAttributes?.size || (
                      <span className="opacity-40">—</span>
                    )}
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <span className="opacity-60">Condition:</span>
                    {renderApparelConfidence("condition")}
                  </div>
                  <div className="pl-4">
                    {apparelAttributes?.condition || (
                      <span className="opacity-40">—</span>
                    )}
                  </div>
                </div>

                {apparelIntel?.notes && (
                  <div className="text-xs opacity-70 pl-1">
                    Note: {apparelIntel.notes}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* MAGIC FILL CTA */}
          <div className="mt-4 mb-8">
            <button
              onClick={handleRunMagicFill}
              className="
                w-full
                py-4
                rounded-[28px]
                bg-gradient-to-r from-[#EED9B1] via-[#F9EACB] to-[#EFDDB9]
                text-[#1B1208]
                font-semibold
                tracking-[0.2em]
                text-xs
                border border-[rgba(255,255,255,0.35)]
                shadow-[0_8px_24px_rgba(0,0,0,0.45)]
                hover:shadow-[0_12px_30px_rgba(0,0,0,0.55)]
                hover:translate-y-[-1px]
                transition-all duration-300
                active:scale-[0.99]
                relative overflow-hidden
              "
              disabled={magicLoading}
            >
              <span className="relative z-10">
              {magicLoading ? "Running Magic…" : "Run Magic Fill"}
              </span>
              <span className="absolute inset-0 bg-white/30 opacity-0 hover:opacity-20 transition" />
          </button>
          <div className="text-center text-[11px] uppercase tracking-[0.32em] text-white/55 mt-3">
            {isPremiumUser
              ? "Unlimited Magic Fill with Premium"
              : "1 free Magic Fill per day · Upgrade for unlimited"}
          </div>
          {magicError && (
            <div className="text-xs opacity-60 mt-2">
              {magicError}
            </div>
          )}
          </div>

          {/* CORE INFORMATION */}

          <LuxeInput
            label="Title"
            value={localTitle}
            onChange={handleTitleChange}
            onBlur={commitTitleToStore}
            placeholder="e.g., Lululemon Define Jacket — Size 6"
          />

          <LuxeInput
            label="Description"
            value={localDescription}
            onChange={handleDescriptionChange}
            onBlur={commitDescriptionToStore}
            placeholder="Brief, luxe description…"
          />

          <LuxeInput
            label="Price"
            value={localPrice}
            onChange={handlePriceChange}
            onBlur={commitPriceToStore}
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
                className="mt-3 text-[11px] uppercase tracking-[0.3em] text-[#E8D5A8] underline-offset-4 hover:text-white/90 transition"
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
                Generate Listing Copy
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
                className="mt-3 w-full border border-[#E8D5A8]/50 text-[#E8D5A8] rounded-lg py-2 text-xs uppercase tracking-[0.2em] hover:bg-[#E8D5A8]/10 transition"
                onClick={() => {
                  const links = buildListingExportLinks({
                    title: composed.title,
                    price: dynamicPrice?.dynamic,
                    description: composed.description,
                  });
                  setExportLinks(links);
                }}
              >
                Export Listing Links
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

          <div className={`mb-6 ${chipFlash.category ? "chip-flash" : ""}`}>
            <div className="text-sm uppercase opacity-70 tracking-wide mb-2">
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
            value={localBrand}
            onChange={handleBrandChange}
            onBlur={commitBrandToStore}
            placeholder="e.g., Lululemon, Nike, Zara"
          />

          {shouldShowSize && (
            <div className={`mb-6 ${chipFlash.size ? "chip-flash" : ""}`}>
              <div className="text-sm uppercase opacity-70 tracking-wide mb-2">
                Size
              </div>
              <LuxeChipGroup
                options={sizeOptionsForCategory}
                value={size}
                onChange={(val) => setListingField("size", val)}
              />
            </div>
          )}

          <div className={`mb-6 ${chipFlash.condition ? "chip-flash" : ""}`}>
            <div className="text-sm uppercase opacity-70 tracking-wide mb-2">
              Condition
            </div>
            <LuxeChipGroup
              options={CONDITION_OPTIONS}
              value={condition}
              onChange={(val) => setListingField("condition", val)}
            />
          </div>

          {tagChipOptions.length > 0 && (
            <>
              <div className={`mb-6 ${chipFlash.tags ? "chip-flash" : ""}`}>
                <div className="text-sm uppercase opacity-70 tracking-wide mb-2">
                  Tags
                </div>
                <LuxeChipGroup
                  options={tagChipOptions}
                  value={tags}
                  multiple
                  onChange={(val) => setListingField("tags", val)}
                />
                <div className="flex items-center gap-2 mt-3">
                  <input
                    type="text"
                    value={customTag}
                    onChange={(e) => setCustomTag(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddCustomTag();
                      }
                    }}
                    placeholder="Add custom tag"
                    className="flex-1 bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-white/40 transition"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomTag}
                    className="px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] border border-[#E8D5A8] text-[#E8D5A8] rounded-xl hover:bg-[#E8D5A8]/10 transition"
                  >
                    Add
                  </button>
                </div>
              </div>

              <div className="lux-animated-bar w-1/2 mx-auto my-12" />
            </>
          )}
        </>
      )}
      </div>

      {showShippingTips && (
        <div className="lux-card mt-16">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs uppercase opacity-70 tracking-[0.3em]">
              Shipping Tips
            </div>
            <button
              type="button"
              className="text-[11px] uppercase tracking-[0.3em] text-[#E8D5A8] hover:opacity-80 transition"
              onClick={() => setShowShippingTips(false)}
            >
              Dismiss
            </button>
          </div>
          <div className="flex gap-2 mb-4">
            <button
              type="button"
              className={`flex-1 py-2 rounded-xl border text-[11px] tracking-[0.25em] ${
                shippingAudience === "sellers"
                  ? "border-[#E8D5A8] text-[#E8D5A8]"
                  : "border-white/10 text-white/60"
              }`}
              onClick={() => setShippingAudience("sellers")}
            >
              For Sellers
            </button>
            <button
              type="button"
              className={`flex-1 py-2 rounded-xl border text-[11px] tracking-[0.25em] ${
                shippingAudience === "buyers"
                  ? "border-[#E8D5A8] text-[#E8D5A8]"
                  : "border-white/10 text-white/60"
              }`}
              onClick={() => setShippingAudience("buyers")}
            >
              For Buyers
            </button>
          </div>
          <ul className="space-y-2 text-sm opacity-80">
            {shippingTips.map((tip, idx) => (
              <li key={idx} className="border-l border-[#E8D5A8] pl-3">
                {tip}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-12 mb-8 rounded-2xl border border-white/10 bg-black/25 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="text-sm font-medium text-white">
            Track for TrendSense
          </div>
          <div className="text-xs text-white/60">
            Keep an eye on demand or pricing shifts.
          </div>
          {trackFeedback && (
            <div className="text-[11px] text-[#E8D5A8] mt-1">{trackFeedback}</div>
          )}
        </div>
        <button
          type="button"
          onClick={handleToggleTrackForTrends}
          className={`px-4 py-2 rounded-full text-xs tracking-[0.25em] border transition ${
            isTrackedForTrends
              ? "border-[#4cc790]/70 text-[#4cc790] bg-[#1a2a25]"
              : "border-white/20 text-white/70 bg-transparent hover:border-white/35"
          }`}
        >
          {isTrackedForTrends ? "Tracking" : "Track Item"}
        </button>
      </div>

      {/* ---------------------- */}
      {/*  MAGIC FILL DRAWER     */}
      {/* ---------------------- */}
      {!isCardMode && showMagicResults && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-end justify-center px-4">
          <div className="lux-drawer w-full max-w-xl pb-8 pt-5 px-5 space-y-4">
            <div className="text-center">
              <h2 className="text-[22px] font-semibold text-[#F4E9D5]">
                Magic Fill Results
              </h2>
              <p className="text-sm opacity-70 mt-1">
                Review the latest suggestions before applying them to your listing.
              </p>
              {magicDiffs.length === 0 && (
                <p className="text-sm opacity-70 mt-2">
                  Magic added fresh suggestions to your listing
                </p>
              )}
            </div>

            <div className="gold-divider" />

            <div className="space-y-4 max-h-[320px] overflow-y-auto pr-1">
              {magicDiffs.map((item, idx) => (
                <div
                  key={idx}
                  className="border border-[rgba(232,213,168,0.28)] rounded-xl p-3 bg-black/30"
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="text-[13px] uppercase tracking-wide opacity-70">
                      {item.label}
                    </div>
                    <button
                      type="button"
                      className={`text-[11px] px-2 py-0.5 rounded-full border transition ${
                        magicAccepted[item.fieldKey || item.label] !== false
                          ? "border-[rgba(232,213,168,0.65)] text-[rgba(232,213,168,0.9)] bg-black/40"
                          : "border-white/20 text-white/60 bg-black/20"
                      }`}
                      onClick={() => {
                        const key = item.fieldKey || item.label;
                        setMagicAccepted((prev) => {
                          const current = prev && Object.prototype.hasOwnProperty.call(prev, key)
                            ? prev[key]
                            : true;
                          return {
                            ...(prev || {}),
                            [key]: !current,
                          };
                        });
                      }}
                    >
                      {magicAccepted[item.fieldKey || item.label] !== false
                        ? "Will Apply"
                        : "Skip"}
                    </button>
                  </div>
                  <div className="flex flex-col gap-2 text-sm">
                    <div>
                      <div className="text-[12px] opacity-60 mb-0.5">Before</div>
                      <div className="text-[14px] opacity-85">
                        {item.before || <span className="opacity-50">—</span>}
                      </div>
                    </div>
                    <div>
                      <div className="text-[12px] opacity-60 mb-0.5">After</div>
                      <div className="text-[14px] text-[#F4E9D5]">
                        {item.after || <span className="opacity-50">—</span>}
                      </div>
                    </div>
                  </div>
                  {item.reason && (
                    <div className="mt-2 text-[12px] opacity-70">
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
                onClick={() => setShowMagicResults(false)}
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
      <div className="mt-16 space-y-4">
        <div className="lux-animated-bar w-1/4 mx-auto mb-6" />

        <button
          className="lux-continue-btn shadow-lg w-full py-5 text-base tracking-[0.32em]"
          onClick={() => {
            document.body.classList.add("lux-page-transition");
            setTimeout(() => {
              navigate("/launch");
              document.body.classList.remove("lux-page-transition");
            }, 180);
          }}
        >
          Preview Listing →
        </button>

        <button
          onClick={() => {
            resetListing();
            navigate("/dashboard");
          }}
          className="lux-quiet-btn w-full md:w-2/3 mx-auto text-[11px] tracking-[0.32em] py-3 opacity-80 hover:opacity-100 transition"
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
