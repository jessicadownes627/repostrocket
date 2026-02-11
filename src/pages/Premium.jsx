import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { setPremiumStatus } from "../store/premiumStore";
import "../styles/createListing.css";

export default function Premium() {
  const navigate = useNavigate();
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const normalizedStatus = ["loading", "ready", "error"].includes(status) ? status : "loading";
  const errorMessage =
    error || "We couldn’t load the upgrade screen. Please try again.";

  const loadPaywall = useCallback(async () => {
    setStatus("loading");
    setError("");
    try {
      if (typeof navigator !== "undefined" && navigator.onLine === false) {
        throw new Error("offline");
      }
      await new Promise((resolve) => setTimeout(resolve, 300));
      setStatus("ready");
    } catch (err) {
      console.error("Premium screen failed to load:", err);
      setError(
        navigator?.onLine === false
          ? "You’re offline. Reconnect to load upgrade options."
          : "We couldn’t load the upgrade screen. Please try again."
      );
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    loadPaywall();
  }, [loadPaywall]);

  const handleUpgrade = () => {
    alert("Premium checkout is coming soon!");
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

          <button
            className="w-full py-4 text-lg font-semibold rounded-xl lux-continue-btn"
            onClick={handleUpgrade}
          >
            Upgrade Now
          </button>
        </div>
      )}
    </div>
  );
}
