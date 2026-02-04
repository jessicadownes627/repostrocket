// =============================
//  usageTracker.js
//  (FULL REPLACE — Deluxe Version)
// =============================

// Daily reset key
const LAST_RESET_KEY = "rr_last_reset";
const USAGE_KEY = "rr_usage_counts";

// Daily limits for FREE users
export const DAILY_LIMITS = {
  launches: 2,          // can launch to 2 platforms per day
  smartFill: 0,         // paywalled
  magicFill: 1,         // one Magic listing per day
  autoFill: 0,          // paywalled
  aiReview: 0,          // paywalled
  batchMode: 1          // limited batch mode for free users
};

const TRY_ONE_FREE_KEYS = {
  auto: "rr_try1_auto",
  magic: "rr_try1_magic",
  review: "rr_try1_review",
};

export function hasUsedTryOneFree(feature) {
  return localStorage.getItem(TRY_ONE_FREE_KEYS[feature]) === "1";
}

export function markTryOneFreeUsed(feature) {
  localStorage.setItem(TRY_ONE_FREE_KEYS[feature], "1");
}

export function tryOneFree(feature) {
  if (!feature) return false;
  if (!hasUsedTryOneFree(feature)) {
    markTryOneFreeUsed(feature);
    return true;
  }
  return false;
}

// Ensures localStorage is available
const safeGet = (key) => {
  try {
    return JSON.parse(localStorage.getItem(key));
  } catch {
    return null;
  }
};

const safeSet = (key, val) => {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch {}
};

// =============================
//  RESET MECHANISM
// =============================
const today = () => new Date().toDateString();

const ensureDailyReset = () => {
  const lastReset = safeGet(LAST_RESET_KEY);
  const now = today();

  if (lastReset !== now) {
    safeSet(USAGE_KEY, {
      launches: 0,
      smartFill: 0,
      magicFill: 0,
      autoFill: 0,
      aiReview: 0,
      batchMode: 0,
    });

    safeSet(LAST_RESET_KEY, now);
  }
};

ensureDailyReset();

// =============================
//  GETTERS
// =============================
export const getUsage = () => safeGet(USAGE_KEY) || {};

export const getUsageCount = (key) => {
  const usage = getUsage();
  return usage[key] ?? 0;
};

export const getLimitFor = (key, isPremium) => {
  if (isPremium) return Infinity; // premium = unlimited
  return DAILY_LIMITS[key] ?? 0;
};

export const getLimit = (key) => {
  return getLimitFor(key, false);
};

// Hook-friendly reference (simple function)
export const useUsage = () => getUsage();

// =============================
//  INCREMENT HANDLERS
// =============================
export const incrementUsage = (key) => {
  const usage = getUsage();
  usage[key] = (usage[key] ?? 0) + 1;
  safeSet(USAGE_KEY, usage);
};

// Direct helpers for clarity
export const incrementLaunch = () => incrementUsage("launches");
export const incrementSmartFill = () => incrementUsage("smartFill");
export const incrementMagicFill = () => incrementUsage("magicFill");
export const incrementAutoFill = () => incrementUsage("autoFill");
export const incrementAIReview = () => incrementUsage("aiReview");

// =============================
//  ACCESS CHECK
// =============================
export const canUseFeature = (key, isPremium) => {
  const count = getUsageCount(key);
  const limit = getLimitFor(key, isPremium);
  return count < limit;
};
