// ====================================
// usePaywallGate.js (FULL REPLACE)
// ====================================

import { useState } from "react";
import { attemptAction, shouldShowPaywall } from "../utils/paywall";
import { tryOneFree } from "../utils/usageTracker";

/**
 * A universal hook that gates any action behind the paywall system.
 *
 * Usage:
 *   const { gate, paywallState, closePaywall } = usePaywallGate();
 *
 *   gate("launches", () => {
 *      // safe to run action here
 *   });
 */
export default function usePaywallGate() {
  const [paywallState, setPaywallState] = useState({
    open: false,
    reason: null,
    usage: 0,
    limit: 0
  });

  const devOverrideFlag = import.meta?.env?.VITE_DEV_PREMIUM === "true";
  const devOverride =
    typeof window !== "undefined" &&
    devOverrideFlag &&
    window.location.hostname === "localhost";

  if (
    devOverride &&
    typeof window !== "undefined" &&
    window.localStorage.getItem("rr_dev_premium") !== "true"
  ) {
    window.localStorage.setItem("rr_dev_premium", "true");
  }

  /**
   * gate()
   * @param {string} key - feature name ("launches", "smartFill", etc.)
   * @param {Function} action - callback to run if allowed
   */
  const gate = (key, action, options = {}) => {
    const { tryKey } = options;

     if (devOverride) {
      if (typeof action === "function") {
        action();
      }
      return true;
    }

    if (tryKey && tryOneFree(tryKey)) {
      if (typeof action === "function") {
        action();
      }
      return true;
    }

    const result = attemptAction(key);

    if (shouldShowPaywall(result)) {
      setPaywallState({
        open: true,
        reason: result.reason,
        usage: result.usage,
        limit: result.limit
      });
      return false;
    }

    // Allowed → run the action
    if (typeof action === "function") {
      action();
    }

    return true;
  };

  const closePaywall = () => {
    setPaywallState((prev) => ({ ...prev, open: false }));
  };

  return {
    gate,
    paywallState,
    closePaywall
  };
}
