import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { loadListingLibrary } from "../utils/savedListings";

export default function SportsCardSuite() {
  const navigate = useNavigate();
  const [hasCards, setHasCards] = useState(true);

  useEffect(() => {
    try {
      const library = loadListingLibrary();
      const anyCards = Array.isArray(library)
        ? library.some((item) => item?.category === "Sports Cards")
        : false;
      setHasCards(anyCards);
    } catch {
      setHasCards(true);
    }
  }, []);

  return (
    <div className="min-h-screen bg-black text-white px-6 py-12 font-inter">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <h1 className="text-4xl font-cinzel tracking-wide mb-4">
          Sports Card Suite
        </h1>
        <p className="text-lg text-white/70 mb-10 leading-relaxed">
          Built exclusively for high-volume sports card sellers.  
          Batch process cards, extract brand/year/player/parallel, and auto-build 
          marketplace-ready listings — instantly.
        </p>

        {/* CTA Section */}
        <div className="flex flex-col gap-6 mt-8">

          {/* Batch Upload */}
          <button
            onClick={() => navigate("/batch")}
            className="w-full py-4 rounded-xl border border-[#E8DCC0] text-[#E8DCC0] bg-black/20 
                       hover:bg-black/40 transition-all text-xl"
          >
            Batch Card Upload
          </button>

          {/* Single Card Mode */}
          <button
            onClick={() => navigate("/card-prep")}
            className="w-full py-4 rounded-xl border border-white/20 text-white bg-white/5
                       hover:bg-white/10 transition-all text-xl"
          >
            Single Card Pro Editor
          </button>

          {/* Multi-Card Auto Detection */}
          <button
            onClick={() => navigate("/multi-detect")}
            className="w-full py-4 rounded-xl border border-white/20 text-white bg-black/30
                       hover:bg-black/50 transition-all text-xl text-left px-5"
          >
            <div className="text-xs uppercase tracking-[0.22em] opacity-70 mb-1">
              BETA
            </div>
            <div className="text-lg font-semibold">
              Multi-Card Auto Detection
            </div>
            <div className="text-sm opacity-75 mt-1">
              Upload one photo → Repost Rocket detects and slices every card.
            </div>
          </button>

          {/* Batch Market Assist */}
          <button
            onClick={() => navigate("/batch-comps")}
            className="w-full py-4 rounded-xl border border-white/20 text-white bg-white/5
                       hover:bg-white/10 transition-all text-xl"
          >
            Batch Market Assist
          </button>

        </div>

        {/* Features */}
        <div className="mt-14">
          <h2 className="text-2xl font-cinzel mb-4">Included in Your Suite</h2>

          <ul className="text-white/80 space-y-3 text-base leading-relaxed">
            <li>• Automatic brand, year, player, and team extraction</li>
            <li>• Parallel detection (Silver, Mojo, Cracked Ice, Sapphire, etc.)</li>
            <li>• Serial and card number detection</li>
            <li>• Auto-built marketplace titles &amp; descriptions</li>
            <li>• Instant item specifics generation</li>
            <li>• Batch Fill with progress screen</li>
            <li>• SEO keyword builder</li>
            <li>• Luxe dark + champagne themed dashboard</li>
          </ul>

          {!hasCards && (
            <p className="text-xs opacity-50 italic mt-4">
              No cards in your collection yet. Use the tools above to add your first one.
            </p>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-white/40 text-sm mt-14">
          Sports Card Suite™ • Powered by Repost Rocket
        </p>
      </div>
    </div>
  );
}
