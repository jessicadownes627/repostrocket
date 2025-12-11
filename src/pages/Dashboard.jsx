import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { getUsageCount, getLimit } from "../utils/usageTracker";
import usePaywallGate from "../hooks/usePaywallGate";
import PremiumModal from "../components/PremiumModal";
import LuxeCard from "../components/LuxeCard";
import "../styles/dashboardLux.css";

export default function Dashboard() {
  const navigate = useNavigate();
  const { gate, paywallState, closePaywall } = usePaywallGate();

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

  const handleTrendSense = () => {
    gate("trendsense", () => navigate("/trendsense"));
  };

  const handleBatchMode = () => {
    gate("batchMode", () => navigate("/batch"));
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
          Luxury AI selling-prep. Fast. Polished. Profitable.
        </p>
      </div>

      <div className="rr-section-label">START SELLING</div>

      <LuxeCard
        title="Create Single Listing"
        subtitle="Single Item"
        description="Prep one item with AI. Photos → Details → Launch."
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
        onClick={handleTrendSense}
      />

      <LuxeCard
        title="Batch Mode"
        subtitle="Multi-Item"
        description="Prep large batches in one streamlined flow."
        onClick={handleBatchMode}
      />

      {/* UPGRADE STRIP */}
      <div
        className="mb-8 bg-[#CBB78A]/10 border border-[#CBB78A]/30 rounded-xl p-4 
                   text-center cursor-pointer hover:bg-[#CBB78A]/20 transition mt-12"
        onClick={() => navigate("/settings")}
      >
        <div className="text-[13px] tracking-wide text-[#E8E1D0]">
          Unlock unlimited Magic + Batch Mode → Upgrade to Premium
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
