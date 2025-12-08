import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { getUsageCount, getLimit } from "../utils/usageTracker";
import usePaywallGate from "../hooks/usePaywallGate";
import PremiumModal from "../components/PremiumModal";

export default function Dashboard() {
  const navigate = useNavigate();

  const { gate, paywallState, closePaywall } = usePaywallGate();

  // Daily magic listing usage
  const [magicUsage, setMagicUsage] = useState(getUsageCount("magicFill"));
  const [magicLimit, setMagicLimit] = useState(getLimit("magicFill"));

  const hasMagicLeft = magicUsage < magicLimit;

  // Keeps magic usage updated when user returns to dashboard
  useEffect(() => {
    const handleFocus = () => {
      setMagicUsage(getUsageCount("magicFill"));
      setMagicLimit(getLimit("magicFill"));
    };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, []);

  const handleBatchClick = () => {
    gate("batchMode", () => navigate("/batch"));
  };

  return (
    <div className="min-h-screen bg-[#050807] text-[#E8E1D0] px-6 py-10 relative">

      {/* ✨ Background Luxe Layers */}
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

      {/* MAGIC STATUS BAR */}
      <div
        className={`magic-status-bar ${!hasMagicLeft ? "used" : ""}`}
      >
        {hasMagicLeft ? (
          <>
            Your premium Magic Listing is available.
            <div className="magic-status-sub">
              Use it to unlock full AI prep for one item today.
            </div>
          </>
        ) : (
          <>
            You’ve used today’s Magic Listing.
            <div className="magic-status-sub">
              Your devices stay unlimited. Upgrade for daily magic.
            </div>
          </>
        )}
      </div>

      {/* MAIN ACTIONS */}
      <div className="space-y-6 mb-16">

        {/* Magic Photo Prep */}
        <button
          onClick={() => navigate("/prep")}
          className="lux-dashboard-card w-full text-left"
        >
          <div className="lux-card-subtitle">SINGLE LISTING</div>
          <div className="lux-card-title">Magic Photo Prep</div>
          <div className="lux-card-desc">
            Clean photos. Extract details. Prep one item like a pro.
          </div>
        </button>

        {/* TrendSense */}
        <button
          onClick={() => navigate("/trends")}
          className="lux-dashboard-card w-full text-left"
        >
          <div className="lux-card-subtitle">INSIGHTS</div>
          <div className="lux-card-title">TrendSense</div>
          <div className="lux-card-desc">
            What’s selling best right now — in real time.
          </div>
        </button>

        {/* Batch Mode (Premium Glossy Card) */}
        <button
          onClick={handleBatchClick}
          className="lux-dashboard-card premium-card relative overflow-hidden w-full text-left"
        >
          {/* premium tag */}
          <div className="premium-pill">PREMIUM</div>

          {/* glossy highlight */}
          <div className="premium-gloss"></div>

          <div className="lux-card-subtitle">MULTI-ITEM FLOW</div>
          <div className="lux-card-title">Batch Mode</div>
          <div className="lux-card-desc">
            Prep multiple items at once. Save hours. (Premium only)
          </div>
        </button>

        {/* Sports Card Suite */}
        <button
          onClick={() => navigate("/sports-cards")}
          className="lux-dashboard-card w-full text-left"
        >
          <div className="lux-card-subtitle">COLLECTIBLES</div>
          <div className="lux-card-title">Sports Card Suite 🃏</div>
          <div className="lux-card-desc">
            Dedicated tools for sports cards — batch detection, auto marketplace builds, and more.
          </div>
        </button>
      </div>

      {/* UPGRADE STRIP */}
      <div
        className="mb-8 bg-[#CBB78A]/10 border border-[#CBB78A]/30 rounded-xl p-4 
                   text-center cursor-pointer hover:bg-[#CBB78A]/20 transition"
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
