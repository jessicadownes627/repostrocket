// ====================================
// paywall.js (FULL REPLACE)
// ====================================

import {
  getUsageCount,
  getLimitFor,
  incrementUsage,
  canUseFeature
} from "./usageTracker";

import {
  getPremiumStatus
} from "../store/premiumStore";

// Unified reasons → readable labels
export const FEATURE_LABELS = {
  launches: "Platform Launches",
  smartFill: "Smart Fill",
  magicFill: "Magic Fill",
  autoFill: "Auto Fill",
  aiReview: "AI Review",
  batchMode: "Batch Mode"
};

/**
 * Core gatekeeper:
 * Decides whether the user can perform an action.
 *
 * @param {string} key - one of:
 *   "launches", "smartFill", "magicFill", "autoFill", "aiReview"
 *
 * @returns {
 *   allowed: boolean,
 *   reason?: string,
 *   usage?: number,
 *   limit?: number,
 *   premium?: boolean
 * }
 */
export const checkAccess = (key) => {
  const premium = getPremiumStatus();

  const devOverride = localStorage.getItem("rr_dev_premium") === "true";
  if (devOverride) return {
    allowed: true, reason: null, premium: true, usage: 0, limit: Infinity
  };

  // Developer / spouse override: always allowed
  // Premium users: unlimited access
  if (premium) {
    return {
      allowed: true,
      reason: null,
      premium: true,
      usage: 0,
      limit: Infinity
    };
  }

  // Free user:
  const usage = getUsageCount(key);
  const limit = getLimitFor(key, false);

  const allowed = usage < limit;

  if (!allowed) {
    return {
      allowed: false,
      reason: key,
      usage,
      limit,
      premium: false
    };
  }

  return {
    allowed: true,
    reason: null,
    usage,
    limit,
    premium: false
  };
};

/**
 * If allowed, increments usage and returns success.
 * If denied, returns the denial payload for the modal.
 */
export const attemptAction = (key) => {
  const result = checkAccess(key);

  if (result.allowed) {
    incrementUsage(key);
  }

  return result;
};

/**
 * Convenience wrapper for UI hooks:
 * Used by usePaywallGate() → opens modal with details
 */
export const shouldShowPaywall = (result) => {
  return !result.allowed && !!result.reason;
};
