import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { loadListingLibrary } from "../utils/savedListings";
import usePaywallGate from "../hooks/usePaywallGate";
import PremiumModal from "../components/PremiumModal";
import { useListingStore } from "../store/useListingStore";

export default function SportsCardSuite() {
  const navigate = useNavigate();
  const { gate, paywallState, closePaywall } = usePaywallGate();
  const { setBatchMode } = useListingStore();
  const [hasCards, setHasCards] = useState(true);
  const markBatchMode = (path) => {
    if (path === "/batch" || path === "/multi-detect" || path === "/batch-comps") {
      setBatchMode("sports_cards");
    }
  };

  const handleNavigate = (path, premiumKey = null) => {
    markBatchMode(path);
    const navOptions =
      path === "/batch" ? { state: { batchMode: "sports_cards" } } : undefined;
    if (premiumKey) {
      gate(premiumKey, () => navigate(path, navOptions));
    } else {
      navigate(path, navOptions);
    }
  };

  const primaryTools = [
    {
      title: "Bulk Card Upload",
      description: "Import a stack of cards and auto-create listings in one run.",
      bestFor: "Best for: Turning piles of cards into ready-to-edit drafts fast.",
      cta: "Start Bulk Run",
      path: "/batch",
      accent: "gold",
      premium: true,
      premiumKey: "batchMode",
    },
    {
      title: "Single Card Pro Editor",
      description: "Fine-tune one card at a time with full title + photo controls.",
      bestFor: null,
      cta: "Open Pro Editor",
      path: "/card-prep",
      accent: "neutral",
      premium: false,
    },
    {
      title: "Market Assist Workspace",
      description: "Deep market signals for pricing, comps, and launch timing.",
      bestFor: "Best for: Optimizing a card you already have listed or ready to sell.",
      cta: "Start Market Assist",
      path: "/batch-comps",
      accent: "neutral",
      premium: true,
      premiumKey: "batchMode",
    },
  ];

  const multiCardInfo = {
    title: "Multi-Card Auto Detection",
    description: "One photo → automatic card slicing + detection.",
    disclaimer: "Experimental • Optimized for well-lit photos • Accuracy varies",
    trustNote: "Does not alter your original files.",
    path: "/multi-detect",
  };
  const SHOW_MULTI_CARD_EXPERIMENT = false;

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
        <button
          type="button"
          onClick={() => navigate("/dashboard")}
          className="text-left text-xs uppercase tracking-[0.3em] text-[#E8DCC0] mb-6 hover:text-white transition"
        >
          ← Back
        </button>

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
        <div className="flex flex-col gap-5 mt-8">
          {primaryTools.map((tool) => (
            <button
              key={tool.title}
              onClick={() => handleNavigate(tool.path, tool.premiumKey)}
              className={`w-full text-left px-5 py-5 rounded-2xl border transition-all ${
                tool.accent === "gold"
                  ? "border-[#E8DCC0] text-[#F8EED5] bg-black/25 hover:bg-black/40"
                  : "border-white/15 text-white bg-white/5 hover:bg-white/10"
              }`}
            >
              <div className="text-sm uppercase tracking-[0.28em] opacity-70 mb-2">
                {tool.title}
                {tool.premium && (
                  <span className="ml-3 px-2 py-0.5 text-[10px] rounded-full border border-[#CBB78A]/40 text-[#CBB78A] uppercase tracking-[0.3em]">
                    Premium
                  </span>
                )}
              </div>
              <div className="text-base text-white/80 leading-relaxed mb-3">
                {tool.description}
              </div>
              {tool.bestFor && (
                <div className="text-sm text-white/60 mb-2">
                  {tool.bestFor}
                </div>
              )}
              <span className="text-xs tracking-[0.3em] uppercase">
                {tool.cta}
              </span>
            </button>
          ))}

          {SHOW_MULTI_CARD_EXPERIMENT && (
            <button
              onClick={() => handleNavigate(multiCardInfo.path)}
              className="w-full text-left px-5 py-5 rounded-2xl border border-white/10 bg-black/20 text-white/80 hover:bg-black/35 transition-all opacity-80"
            >
              <div className="text-[10px] uppercase tracking-[0.4em] text-white/50 mb-2">
                Experimental
              </div>
              <div className="text-lg font-semibold text-white">
                {multiCardInfo.title}
              </div>
              <div className="text-sm opacity-70 mt-1">
                {multiCardInfo.description}
              </div>
              <div className="text-[11px] opacity-60 mt-3 italic">
                {multiCardInfo.disclaimer}
              </div>
              <div className="text-[11px] opacity-55 mt-1">
                {multiCardInfo.trustNote}
              </div>
            </button>
          )}
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

        <PremiumModal
          open={paywallState.open}
          reason={paywallState.reason}
          usage={paywallState.usage}
          limit={paywallState.limit}
          onClose={closePaywall}
        />
      </div>
    </div>
  );
}
