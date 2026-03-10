import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  purchaseProSubscription,
  requestProducts,
  restorePurchases,
  useStoreKitProducts,
} from "../utils/storekit";
import SubscriptionDisclosure from "../components/SubscriptionDisclosure";
import "../styles/createListing.css";

export default function Premium() {
  const navigate = useNavigate();
  const { status: productStatus, error: productError, products } =
    useStoreKitProducts();
  const [screenState, setScreenState] = useState("loading");
  const [screenError, setScreenError] = useState("");
  const normalizedStatus = ["loading", "ready", "error"].includes(screenState)
    ? screenState
    : "loading";
  const errorMessage =
    screenError || "We couldn’t load the upgrade screen. Please try again.";
  const primaryProduct = products[0] || null;
  const isUpgradeReady = productStatus === "ready" && Boolean(primaryProduct);

  const loadPaywall = useCallback(async () => {
    setScreenState("loading");
    setScreenError("");
    try {
      if (typeof navigator !== "undefined" && navigator.onLine === false) {
        throw new Error("offline");
      }
      await requestProducts();
      await new Promise((resolve) => setTimeout(resolve, 300));
      setScreenState("ready");
    } catch (err) {
      console.error("Premium screen failed to load:", err);
      setScreenError(
        navigator?.onLine === false
          ? "You’re offline. Reconnect to load upgrade options."
          : "We couldn’t load the upgrade screen. Please try again."
      );
      setScreenState("error");
    }
  }, []);

  useEffect(() => {
    loadPaywall();
  }, [loadPaywall]);

  const handleUpgrade = async () => {
    const result = await purchaseProSubscription();
    if (!result?.ok) {
      alert(result?.message || "Purchase could not be completed. Please try again.");
      return;
    }
    navigate("/dashboard");
  };

  return (
    <div className="app-wrapper min-h-screen px-6 py-10 flex flex-col relative">
      <div className="rr-deep-emerald"></div>

      <button
        onClick={() => navigate(-1)}
        className="text-left text-sm text-[#E8DCC0] uppercase tracking-[0.2em] mb-4 w-fit hover:opacity-80 transition"
      >
        ← Back
      </button>

      <h1 className="sparkly-header header-glitter text-center text-3xl mb-3">
        Upgrade to Premium
      </h1>
      <div className="magic-cta-bar mb-6" />

      {normalizedStatus === "loading" && (
        <div className="mt-6 text-center text-sm opacity-70">
          Loading upgrade options…
        </div>
      )}

      {normalizedStatus === "error" && (
        <div className="mt-6 text-center text-sm opacity-80">
          <p className="mb-4">{errorMessage}</p>
          <button
            onClick={loadPaywall}
            className="px-4 py-2 rounded-lg border border-[#CBB78A]/40 text-[#E8DCC0] hover:bg-[#CBB78A]/20 transition"
          >
            Retry
          </button>
        </div>
      )}

      {normalizedStatus === "ready" && (
        <div className="mt-6 space-y-6">
          <p className="text-center text-sm opacity-70">
            Premium unlocks unlimited Magic Fill, Batch workflows, and priority launches.
          </p>

          <div className="rounded-2xl border border-[#CBB78A]/25 bg-black/30 p-5 text-sm space-y-2">
            <div className="text-[#E8DCC0] font-semibold text-base">
              Premium Includes
            </div>
            <ul className="space-y-1 opacity-80">
              <li>Unlimited Magic Fill</li>
              <li>Unlimited Batch Mode</li>
              <li>Unlimited Launches</li>
              <li>Priority workflow updates</li>
            </ul>
          </div>

          {productStatus === "loading" && (
            <div className="text-center text-sm opacity-75">
              Loading App Store subscription details…
            </div>
          )}

          {productStatus === "ready" && primaryProduct && (
            <div className="rounded-2xl border border-[#CBB78A]/20 bg-black/20 p-4 text-sm">
              <div className="opacity-70">App Store subscription</div>
              <div className="mt-1 text-[#E8DCC0] font-semibold">
                {primaryProduct.title || "Repost Rocket Premium"}
              </div>
              {primaryProduct.displayPrice && (
                <div className="opacity-75">{primaryProduct.displayPrice}</div>
              )}
            </div>
          )}

          {productStatus === "error" && (
            <div className="rounded-2xl border border-[#CBB78A]/20 bg-black/20 p-4 text-sm opacity-80">
              {productError || "Premium is temporarily unavailable. Please try again later."}
            </div>
          )}

          <button
            className="w-full py-4 text-lg font-semibold rounded-xl lux-continue-btn disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleUpgrade}
            disabled={!isUpgradeReady}
          >
            {productStatus === "loading" ? "Loading Subscription…" : "Upgrade to Premium"}
          </button>

          <button
            type="button"
            className="w-full text-xs opacity-70 hover:opacity-100 transition underline underline-offset-4"
            onClick={async () => {
              const result = await restorePurchases();
              if (!result?.ok) {
                alert(result?.message || "Restore could not be completed. Please try again.");
              }
            }}
          >
            Restore Purchases
          </button>

          {productStatus === "error" && (
            <button
              type="button"
              onClick={loadPaywall}
              className="w-full text-xs opacity-70 hover:opacity-100 transition underline underline-offset-4"
            >
              Retry Loading Subscription
            </button>
          )}

          <SubscriptionDisclosure className="pt-2" />
        </div>
      )}
    </div>
  );
}
