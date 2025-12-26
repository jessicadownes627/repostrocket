import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { getUsageCount, getLimit } from "../utils/usageTracker";
import usePaywallGate from "../hooks/usePaywallGate";
import PremiumModal from "../components/PremiumModal";
import LuxeCard from "../components/LuxeCard";
import { useListingStore } from "../store/useListingStore";
import "../styles/dashboardLux.css";

export default function Dashboard() {
  const navigate = useNavigate();
  const { gate, paywallState, closePaywall } = usePaywallGate();
  const { setBatchMode } = useListingStore();

  // Daily magic listing usage
  const [magicUsage, setMagicUsage] = useState(getUsageCount("magicFill"));
  const [magicLimit, setMagicLimit] = useState(getLimit("magicFill"));

  const hasMagicLeft = magicUsage < magicLimit;

  // Keeps magic usage updated when returning to dashboard
  useEffect(() => {
    const handleFocus = () => {
      setMagicUsage(getUsageCount("magicFill"));
      setMagicLimit(getLimit("magicFill"));
    };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, []);

  const handleTrendSense = () => navigate("/trendsense");

  const handleBatchMode = () => {
    setBatchMode("general");
    gate("batchMode", () =>
      navigate("/batch", { state: { batchMode: "general" } })
    );
  };

  return (
    <div className="min-h-screen bg-[#050807] text-[#E8E1D0] px-6 py-10 relative">

      {/* Background luxury layers */}
      <div className="rr-deep-emerald"></div>
      <div className="rr-gold-dust"></div>

      {/* HEADER */}
      <div className="mb-10">
        <h1 className="text-[36px] font-semibold tracking-tight">
          <span className="sparkly-header header-glitter">Repost Rocket</span>
        </h1>
        <p className="text-sm opacity-70 mt-1 tracking-wide">
          Luxury listing prep. Fast. Polished. Profitable.
        </p>
        <div className="lux-divider lux-divider-hero"></div>
      </div>

      <div className="rr-section-label">START SELLING</div>

      <LuxeCard
        title="Create Single Listing"
        subtitle="Single Item"
        description="Prep one item with smart guidance. Photos → Details → Launch."
        onClick={() => navigate("/prep")}
      />

      <div className="rr-section-label">COLLECTIBLES</div>

      <LuxeCard
        title="Sports Card Suite"
        subtitle="Collectibles"
        description="Tools for collectors — detection, pricing, builds, and more."
        onClick={() => navigate("/sports-cards")}
      />

      <div className="rr-section-label">PREMIUM TOOLS</div>

      <LuxeCard
        title="TrendSense"
        subtitle="Insights"
        description="Real-time selling trends. See what’s moving right now."
        premium
        onClick={handleTrendSense}
      />

      <LuxeCard
        title="Batch Mode"
        subtitle="Multi-Item"
        description="Prep large batches in one streamlined flow."
        premium
        onClick={handleBatchMode}
      />

      {/* UPGRADE STRIP */}
      <div className="lux-divider"></div>
      <div
        className="lux-upgrade-card"
        onClick={() => navigate("/settings")}
      >
        <div className="lux-upgrade-text">
          Premium = Unlimited + Batch + Pro workflows. Free = accurate but single-use.
        </div>
      </div>

      {/* PREMIUM MODAL */}
      <PremiumModal
        open={paywallState.open}
        reason={paywallState.reason}
        usage={paywallState.usage}
        limit={paywallState.limit}
        onClose={closePaywall}
      />
    </div>
  );
}
