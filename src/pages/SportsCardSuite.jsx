import { useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { loadListingLibrary, saveListingToLibrary } from "../utils/savedListings";
import usePaywallGate from "../hooks/usePaywallGate";
import PremiumModal from "../components/PremiumModal";
import { useListingStore } from "../store/useListingStore";

const GRADING_LINKS = [
  {
    label: "PSA",
    description: "Industry-standard grading with broad buyer trust.",
    url: "https://www.psacard.com/",
  },
  {
    label: "BGS",
    description: "Beckett grading with subgrades available.",
    url: "https://www.beckett.com/grading/",
  },
  {
    label: "SGC",
    description: "Popular for vintage + modern slabs.",
    url: "https://gosgc.com/",
  },
  {
    label: "CGC",
    description: "Trusted crossover grader for sports & collectibles.",
    url: "https://www.cgccards.com/",
  },
];

export default function SportsCardSuite() {
  const navigate = useNavigate();
  const { gate, paywallState, closePaywall } = usePaywallGate();
  const { setBatchMode, listingData } = useListingStore(
    (state) => ({
      setBatchMode: state.setBatchMode,
      listingData: state.listingData,
    })
  );
  const batchItems = listingData?.batchItems || [];
  const savedDrafts = useListingStore((state) => state.savedDrafts || []);
  const listingRef = useRef(listingData);
  const savedListingIds = useRef(new Set());
  const savedBatchIds = useRef(new Set());

  useEffect(() => {
    if (!savedDrafts.length) return;
    savedDrafts.forEach((draft) => {
      if (draft?.id) {
        saveListingToLibrary(draft);
      }
    });
  }, [savedDrafts]);

  useEffect(() => {
    listingRef.current = listingData;
  }, [listingData]);

  const entryId = listingData?.libraryId || listingData?.id;
  const listingPhotosLength = listingData?.photos?.length || 0;
  const listingCardIntelHash = listingData?.cardIntelHash;
  const listingCardPlayer = listingData?.cardAttributes?.player;
  const listingTitle = listingData?.title;
  const listingHasContent =
    Boolean(listingPhotosLength) ||
    Boolean(listingCardIntelHash) ||
    Boolean(listingCardPlayer) ||
    Boolean(listingTitle);

  useEffect(() => {
    if (!entryId || !listingHasContent) return;
    if (savedListingIds.current.has(entryId)) return;
    const payload = {
      ...listingRef.current,
      id: entryId,
      category: listingRef.current?.category || "Sports Cards",
    };
    saveListingToLibrary(payload);
    savedListingIds.current.add(entryId);
  }, [
    entryId,
    listingPhotosLength,
    listingCardIntelHash,
    listingCardPlayer,
    listingTitle,
    listingHasContent,
  ]);

  useEffect(() => {
    batchItems.forEach((card) => {
      if (!card?.id || savedBatchIds.current.has(card.id)) return;
      const hasPhoto = Boolean(card.photos?.length);
      if (!hasPhoto) return;
      const entry = {
        ...card,
        id: card.id,
        title: card.title || "Sports Card",
        category: card.category || "Sports Cards",
      };
      saveListingToLibrary(entry);
      savedBatchIds.current.add(card.id);
    });
  }, [batchItems]);
  const slabContext = useMemo(() => {
    const library = loadListingLibrary();
    const authorities = {};
    let gradedCount = 0;

    const isKnownAuthority = (value) => {
      if (!value) return null;
      const upper = String(value).trim().toUpperCase();
      if (["PSA", "BGS", "SGC", "CGC"].includes(upper)) {
        return upper;
      }
      return null;
    };

    if (Array.isArray(library) && library.length) {
      for (const item of library) {
        const hasSlabFlag =
          Boolean(item?.cardAttributes?.isGradedCard) ||
          Boolean(item?.cardIntel?.isGradedCard) ||
          Boolean(item?.cardIntelligence?.graded) ||
          Boolean(item?.cardIntelligence?.slabbed) ||
          Boolean(item?.gradingCompany) ||
          Boolean(item?.isGraded);
        if (!hasSlabFlag) continue;

        gradedCount += 1;
        const authority =
          item?.cardAttributes?.gradingAuthority ||
          item?.cardIntel?.gradingAuthority ||
          item?.cardIntel?.grading?.authority ||
          item?.cardIntelligence?.gradingCompany ||
          item?.gradingCompany ||
          null;
        const known = isKnownAuthority(authority);
        if (known) {
          authorities[known] = (authorities[known] || 0) + 1;
        }
      }
    }

    const sorted = Object.entries(authorities).sort((a, b) => b[1] - a[1]);
    const likelyAuthority = sorted.length ? sorted[0][0] : null;

    return {
      gradedCount,
      likelyAuthority,
    };
  }, []);
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
          onClick={() => {
            if (typeof window !== "undefined" && window.history.length > 1) {
              navigate(-1);
            } else {
              navigate("/dashboard");
            }
          }}
          className="text-left text-xs uppercase tracking-[0.3em] text-[#E8DCC0] mb-6 hover:text-white transition"
        >
          ← Back
        </button>

        {/* Header */}
        <h1 className="text-4xl font-cinzel tracking-wide mb-4">
          Sports Card Suite
        </h1>
        <p className="text-lg text-white/75 mb-10 leading-relaxed max-w-3xl">
          Choose how you want to prep your card(s).
        </p>

        {/* Feature cards */}
        <div className="space-y-8 mt-10">
          <div className="rounded-[32px] border-[2px] border-white/25 bg-gradient-to-b from-[#161210] via-[#0C0A0A] to-[#070606] shadow-[0_30px_85px_rgba(8,4,0,0.65)]">
            <button
              onClick={() =>
                handleNavigate("/sports-batch", "batchMode", {
                  state: { flow: "sports" },
                })
              }
              className="w-full text-left px-6 py-6 rounded-[32px] text-[#F8EED5] bg-transparent hover:shadow-[0_30px_85px_rgba(8,4,0,0.65)] transition-all"
            >
              <div className="text-sm uppercase tracking-[0.45em] opacity-80 mb-2 flex items-center gap-3">
                <span>Batch Sports Cards</span>
                <span className="px-2 py-0.5 text-[10px] rounded-full border border-[#CBB78A]/40 text-[#CBB78A] uppercase tracking-[0.3em]">
                  Premium
                </span>
              </div>
              <div className="text-[17px] leading-relaxed mb-4 max-w-3xl text-white/80">
                Prep multiple cards in one guided flow from photos to launch.
              </div>
              <span className="mt-4 inline-flex text-[11px] tracking-[0.3em] uppercase text-white/90">
                Enter Batch Flow →
              </span>
            </button>
          </div>

          <div className="rounded-[32px] border-[2px] border-white/25 bg-black/15">
            <button
              onClick={() => handleNavigate("/card-prep")}
              className="w-full text-left px-6 py-5 rounded-[32px] text-white hover:bg-white/5 transition-all"
            >
              <div className="text-sm uppercase tracking-[0.35em] opacity-70 mb-2">
                Single Card Pro Editor
              </div>
              <div className="text-base text-white/80 leading-relaxed mb-2">
                Prep and fine-tune one card before launch.
              </div>
              <span className="text-xs uppercase tracking-[0.3em] text-white/70">
                Open Pro Editor →
              </span>
            </button>
          </div>

          <details className="rounded-[32px] border-[2px] border-white/15 bg-black/10 overflow-hidden">
            <summary className="cursor-pointer px-6 py-5 text-[10px] uppercase tracking-[0.4em] text-white/55 flex items-center justify-between">
              <span>Slab awareness + grading resources</span>
              <span className="text-[10px] text-white/40">(tap to view)</span>
            </summary>
            <div className="px-6 pb-6">
              <p className="text-sm leading-relaxed text-white/80">
                Recognizes slabbed cards and surfaces grading context when present.
              </p>
              {slabContext?.gradedCount > 0 && slabContext.likelyAuthority && (
                <p className="text-[11px] uppercase tracking-[0.35em] text-white/60 mt-2">
                  Likely {slabContext.likelyAuthority}
                </p>
              )}
              <div className="mt-4">
                <div className="text-[10px] uppercase tracking-[0.4em] text-white/50 mb-2">
                  Grading resources
                </div>
                <div className="flex flex-wrap gap-2">
                  {GRADING_LINKS.map((link) => (
                    <a
                      key={link.label}
                      href={link.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center rounded-full border border-white/15 px-3 py-1 text-[11px] uppercase tracking-[0.3em] text-white/70 hover:border-white/40 transition"
                    >
                      {link.label}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </details>

          {SHOW_MULTI_CARD_EXPERIMENT && (
            <div className="rounded-[32px] border border-white/10 bg-black/10">
              <button
                onClick={() => handleNavigate(multiCardInfo.path)}
                className="w-full text-left px-5 py-5 rounded-[32px] text-white/80 hover:bg-white/5 transition-all"
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
            </div>
          )}
        </div>

        {/* Features */}
        <div className="mt-16">
          <details className="border border-white/15 rounded-2xl bg-black/20 overflow-hidden">
            <summary className="cursor-pointer px-4 py-3 text-sm uppercase tracking-[0.3em] text-white/45 flex items-center justify-between">
              <span>What powers this suite</span>
              <span className="text-[11px] text-white/35">(tap to view)</span>
            </summary>
            <div className="px-4 py-4 space-y-4 text-white/75 text-sm leading-relaxed border-t border-white/10">
              <div>
                <div className="text-xs uppercase tracking-[0.4em] text-white/50 mb-2">
                  Intelligence
                </div>
                <ul className="space-y-1">
                  <li>• Automatic player, year, team, and brand extraction</li>
                  <li>• Parallel/serial hints and corner clarity checks</li>
                  <li>• Grading + pricing cues when text is visible</li>
                  <li>• Batch comps and listing-ready keywords</li>
                </ul>
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.4em] text-white/50 mb-2">
                  Speed &amp; Launch
                </div>
                <ul className="space-y-1">
                  <li>• Auto-crop, corner prep, and readiness flags</li>
                  <li>• One tap to move selected cards into Launch Deck</li>
                  <li>• Marketplace-ready titles and descriptions</li>
                  <li>• Item specifics + keyword helpers when detected</li>
                </ul>
              </div>
            </div>
          </details>

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
