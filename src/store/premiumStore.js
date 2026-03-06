import { useSyncExternalStore } from "react";
import { isStoreKitAvailable, checkSubscriptionStatus } from "../utils/storekit";

export const PHONE_KEY = "rr_user_phone";
export const PREMIUM_KEY = "rr_is_premium";

// Jess & Husband – always VIP (kept for internal testing)
const OVERRIDE_NUMBERS = [
  "15164104363", // Jess
  "17189082021", // Husband
];

// Device-specific permanent IDs (desktops, laptops, tablets)
const OVERRIDE_DEVICES = [
  "jessicas-mac-mini",
  "jessicas-macbook",
  "jessicas-desktop",
  "jess-ipad",
];

let nativeIsPro = null; // null = unknown, boolean when provided by iOS
const listeners = new Set();

function emit() {
  for (const cb of listeners) cb();
}

function getDeviceId() {
  try {
    return (
      window?.navigator?.userAgentData?.platform?.toLowerCase() ||
      window?.navigator?.platform?.toLowerCase() ||
      ""
    );
  } catch {
    return "";
  }
}

export function setProStatusFromNative(isPro) {
  nativeIsPro = Boolean(isPro);
  emit();
}

function ensureNativeCallbackInstalled() {
  if (typeof window === "undefined") return;
  const existing = window.onProStatusChanged;
  if (existing && existing.__rr_wrapped) return;

  const handler = function onProStatusChangedRR(value) {
    try {
      setProStatusFromNative(Boolean(value));
    } catch (err) {
      console.error("onProStatusChanged handler failed:", err);
    }
    if (typeof existing === "function") {
      try {
        existing(value);
      } catch (err) {
        console.error("Existing onProStatusChanged handler failed:", err);
      }
    }
  };
  handler.__rr_wrapped = true;
  window.onProStatusChanged = handler;
}

// Call once at module init.
ensureNativeCallbackInstalled();

export const getPremiumStatus = () => {
  // Always treat development as premium for testing
  try {
    if (
      typeof import.meta !== "undefined" &&
      import.meta.env &&
      import.meta.env.MODE === "development"
    ) {
      return true;
    }
  } catch {
    // ignore
  }

  // Dev override (never remove)
  if (typeof localStorage !== "undefined") {
    if (localStorage.getItem("rr_dev_premium") === "true") return true;
  }

  // Device override (kept)
  const device = getDeviceId();
  if (OVERRIDE_DEVICES.some((d) => device.includes(d))) return true;

  // Phone override (kept)
  try {
    const savedPhone = localStorage.getItem(PHONE_KEY);
    if (savedPhone && OVERRIDE_NUMBERS.includes(savedPhone)) {
      return true;
    }
  } catch {
    // ignore
  }

  // iOS StoreKit is the source of truth when available
  if (isStoreKitAvailable()) {
    return nativeIsPro === true;
  }

  // Web fallback (existing behavior)
  try {
    return localStorage.getItem(PREMIUM_KEY) === "premium";
  } catch {
    return false;
  }
};

export function subscribePremiumStatus(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function usePremiumStatus() {
  return useSyncExternalStore(
    subscribePremiumStatus,
    getPremiumStatus,
    () => false
  );
}

// Compatibility for existing code paths (web/dev only).
export const setPremiumStatus = (value) => {
  if (isStoreKitAvailable()) {
    console.warn(
      "setPremiumStatus is ignored on iOS; use StoreKit purchase/restore and onProStatusChanged."
    );
    return;
  }
  try {
    if (value) {
      localStorage.setItem(PREMIUM_KEY, "premium");
    } else {
      localStorage.removeItem(PREMIUM_KEY);
    }
    emit();
  } catch {
    // ignore
  }
};

export const setUserPhone = (phone) => {
  try {
    localStorage.setItem(PHONE_KEY, phone);
  } catch {
    // ignore
  }
};

export function requestNativeSubscriptionStatus() {
  ensureNativeCallbackInstalled();
  if (!isStoreKitAvailable()) return;
  checkSubscriptionStatus();
}

