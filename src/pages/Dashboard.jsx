import { useNavigate } from "react-router-dom";
import LuxeCard from "../components/LuxeCard";
import { useListingStore } from "../store/useListingStore";
import "../styles/dashboardLux.css";

export default function Dashboard() {
  const navigate = useNavigate();
  const { setBatchMode } = useListingStore();

  const handleTrendSense = () => navigate("/trendsense");

  const handleBatchMode = () => {
    setBatchMode("general");
    navigate("/batch", { state: { batchMode: "general" } });
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
          Fast. Polished. Profitable.
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
        description="Sports card? Start here → capture, analyze, and launch with confidence."
        onClick={() => navigate("/sports-cards")}
      />

      <div className="rr-section-label">ADVANCED TOOLS</div>

      <LuxeCard
        title="TrendSense"
        subtitle="Insights"
        description="Real-time selling trends. See what’s moving now."
        onClick={handleTrendSense}
      />

      <LuxeCard
        title="Batch Mode"
        subtitle="Multi-Item"
        description="Prep large batches in one streamlined flow."
        onClick={handleBatchMode}
      />
    </div>
  );
}
