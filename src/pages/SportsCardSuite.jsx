import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { loadListingLibrary } from "../utils/savedListings";
import usePaywallGate from "../hooks/usePaywallGate";
import PremiumModal from "../components/PremiumModal";
import { useListingStore } from "../store/useListingStore";

export default function SportsCardSuite() {
  const navigate = useNavigate();
  const { gate, paywallState, closePaywall } = usePaywallGate();
  const { setBatchMode } = useListingStore();
  const hasCards = useMemo(() => {
    try {
      const library = loadListingLibrary();
      return Array.isArray(library)
        ? library.some((item) => item?.category === "Sports Cards")
        : true;
    } catch {
      return true;
    }
  }, []);
  const markBatchMode = () => {
    setBatchMode("sports_cards");
  };

  const handleNavigate = (path, premiumKey = null, options = undefined) => {
    if (path === "/batch") {
      markBatchMode();
    }
    const navOptions =
      path === "/batch"
        ? {
            state: {
              batchMode: "sports_cards",
              ...(options?.state || {}),
            },
          }
        : options;
    if (premiumKey) {
      gate(premiumKey, () => navigate(path, navOptions));
    } else {
      navigate(path, navOptions);
    }
  };

  const multiCardInfo = {
    title: "Multi-Card Auto Detection",
    description: "One photo → automatic card slicing + detection.",
    disclaimer: "Experimental • Optimized for well-lit photos • Accuracy varies",
    trustNote: "Does not alter your original files.",
    path: "/multi-detect",
  };
  const SHOW_MULTI_CARD_EXPERIMENT = false;

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
        <p className="text-lg text-white/75 mb-10 leading-relaxed max-w-3xl">
          Built exclusively for high-volume sports card sellers. Batch the entire flow—capture,
          confirm corners, analyze, and launch listings without ever losing momentum.
        </p>

        {/* CTA Section */}
        <div className="flex flex-col gap-5 mt-8">
          <button
            onClick={() =>
              handleNavigate("/batch", "batchMode", {
                state: { flow: "sports" },
              })
            }
            className="w-full text-left px-6 py-6 rounded-3xl border border-[#F4E9D5]/90 text-[#F8EED5] bg-gradient-to-b from-[#161210] via-[#0C0A0A] to-[#070606] shadow-[0_25px_70px_rgba(8,4,0,0.55)] hover:shadow-[0_30px_85px_rgba(8,4,0,0.65)] transition-all"
          >
            <div className="text-sm uppercase tracking-[0.45em] opacity-80 mb-2">
              Batch Sports Cards
              <span className="ml-3 px-2 py-0.5 text-[10px] rounded-full border border-[#CBB78A]/40 text-[#CBB78A] uppercase tracking-[0.3em]">
                Premium
              </span>
            </div>
            <div className="text-[17px] text-white leading-relaxed mb-4 max-w-3xl">
              One guided pipeline: capture → confirm corners → analyze → decide →
              launch. Every card stays in the same flow until it’s marketplace-ready.
            </div>
            <div className="text-sm text-white/60 mb-3">
              Best for: turning stacks into graded, priced, launch-ready listings.
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-white/70">
              {[
                "Step 1 — Capture front + back with auto-crop + corner detection.",
                "Step 2 — Server analysis for player/year/set, grading, and pricing.",
                "Step 3 — Select cards to launch or send individual cards to polish.",
                "Step 4 — Launch Deck pre-fills marketplace templates instantly.",
              ].map((step) => (
                <div
                  key={step}
                  className="rounded-xl border border-white/10 bg-black/20 px-3 py-2"
                >
                  {step}
                </div>
              ))}
            </div>
            <span className="mt-4 inline-flex text-xs tracking-[0.3em] uppercase">
              Enter Batch Flow →
            </span>
          </button>

          <button
            onClick={() => handleNavigate("/card-prep")}
            className="w-full text-left px-5 py-5 rounded-2xl border border-white/15 text-white bg-white/5 hover:bg-white/10 transition-all"
          >
            <div className="text-sm uppercase tracking-[0.35em] opacity-70 mb-2">
              Single Card Pro Editor
            </div>
            <div className="text-base text-white/80 leading-relaxed mb-3">
              The full-frame editor for one-off cards. Confirm corners, run AI
              polish, and fine-tune titles + tags before sending to Launch Deck.
            </div>
            <div className="text-sm text-white/60 mb-2">
              Best for: grail cards or detail work you want to perfect manually.
            </div>
            <span className="text-xs tracking-[0.3em] uppercase">
              Open Pro Editor →
            </span>
          </button>

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
        <div className="mt-16">
          <h2 className="text-2xl font-cinzel mb-2">Included in Your Suite</h2>
          <p className="text-sm text-white/55 mb-5">
            Every batch inherits the same intelligence as our single-card flow — just scaled.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-white/10 rounded-2xl p-4 bg-white/5">
              <div className="text-xs uppercase tracking-[0.4em] text-white/50 mb-3">
                Intelligence
              </div>
              <ul className="space-y-2 text-white/80 text-sm leading-relaxed">
                <li>• Automatic brand, year, player, and team extraction</li>
                <li>• Parallel + serial detection for modern releases</li>
                <li>• Grading and corner condition guidance</li>
                <li>• Pricing ranges with suggested list price</li>
                <li>• Batch comps + keyword recommendations</li>
              </ul>
            </div>
            <div className="border border-white/10 rounded-2xl p-4 bg-white/5">
              <div className="text-xs uppercase tracking-[0.4em] text-white/50 mb-3">
                Speed &amp; Launch
              </div>
              <ul className="space-y-2 text-white/80 text-sm leading-relaxed">
                <li>• Auto-crop and confirmed corners before analysis</li>
                <li>• One tap to send selected cards into Launch Deck</li>
                <li>• Marketplace-ready titles &amp; descriptions</li>
                <li>• Instant item specifics + SEO keyword builder</li>
                <li>• Luxe dark + champagne dashboard for clarity</li>
              </ul>
            </div>
          </div>

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
