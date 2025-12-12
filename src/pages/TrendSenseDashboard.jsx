import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { runTrendSenseInfinity } from "../utils/trendSenseInfinity";
import { runTrendSenseUltra } from "../utils/trendSenseUltra";
import { loadListingLibrary } from "../utils/savedListings";
import { getLiveTrendAlerts } from "../utils/liveTrendAlerts";
import Sparkline from "../components/Sparkline";
import TrendingTodayCard from "../components/TrendingTodayCard";
import ListNextCard from "../components/ListNextCard";
import FlipPotentialCard from "../components/FlipPotentialCard";
import HotTagCard from "../components/HotTagCard";
import SmartPriceBandCard from "../components/SmartPriceBandCard";
import CategoryMomentumCard from "../components/CategoryMomentumCard";
import TrendSenseSearchPanel from "../components/TrendSenseSearchPanel";
import SalesAlertsPanel from "../components/SalesAlertsPanel";
import usePaywallGate from "../hooks/usePaywallGate";
import PremiumModal from "../components/PremiumModal";
import {
  trendingPairs,
  trendingOpportunities,
} from "../data/trendingOpportunities";
import {
  IconFlame,
  IconChart,
  IconFlip,
  IconBolt,
  IconPrice,
  IconBrain,
} from "../components/LuxIcons";

const SAMPLE_REPORTS = [
  {
    item: { id: "sample-1", title: "90s Starter Chicago Bulls Jacket" },
    trendScore: 82,
    eventLinked: true,
    eventHeadline: "Playoff spike pushing prices 30% higher",
    buyerHint: "List before tonight's tipoff for peak demand.",
    ts: {
      demandLabel: "Heating",
      smartBands: { floor: 110, target: 135, ceiling: 160 },
      smartPriceRange: { min: 110, target: 135, max: 160 },
      buyerHint: "BIN + watchers captures the premium right now.",
      profitPotential: 45,
    },
  },
];

const SAMPLE_INFINITY = {
  listNext: SAMPLE_REPORTS,
  flipPotential: [
    {
      item: { id: "sample-2", title: "Shohei Rookie Chrome PSA 9", price: 95 },
      ts: {
        demandLabel: "Hot",
        smartBands: { floor: 140, target: 165, ceiling: 190 },
        smartPriceRange: { min: 140, target: 165, max: 190 },
        buyerHint: "Opening week buzz is fueling bids.",
        profitPotential: 70,
      },
    },
  ],
  hotTags: [
    { keyword: "starter jacket", score: 78 },
    { keyword: "shohei rookie", score: 83 },
  ],
  categoryMomentum: {
    "Vintage Outerwear": {
      score: 72,
      direction: "rise",
      trend: "up",
      insight: "NBA playoff merch is driving traffic.",
    },
  },
  reports: SAMPLE_REPORTS.map((rep) => ({
    ...rep,
  })),
};

const SAMPLE_ALERTS = [
  { message: "Starter jackets up +45% week over week in Chicago." },
];

export default function TrendSenseDashboard() {
  const [reports, setReports] = useState([]);
  const [infinity, setInfinity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState([]);
  const navigate = useNavigate();
  const [openItem, setOpenItem] = useState(null);
  const { gate, paywallState, closePaywall } = usePaywallGate();
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    const allowed = gate("trendsense", () => setHasAccess(true));
    if (!allowed) {
      setHasAccess(false);
      setReports(SAMPLE_REPORTS);
      setInfinity(SAMPLE_INFINITY);
      setAlerts(SAMPLE_ALERTS);
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (hasAccess !== true) return;
    async function load() {
      const items = loadListingLibrary() || [];
      if (!items.length) {
        setReports([]);
        setInfinity({
          reports: [],
          listNext: [],
          flipPotential: [],
          hotTags: [],
          categoryMomentum: {},
        });
        setLoading(false);
        return;
      }

      const rep = [];
      for (const item of items) {
        const r = await runTrendSenseUltra(item);
        if (r) {
          rep.push({ item, ...r });
        }
      }

      const inf =
        (await runTrendSenseInfinity(items)) || {
          reports: [],
          listNext: [],
          flipPotential: [],
          hotTags: [],
          categoryMomentum: {},
        };

      const alertList = getLiveTrendAlerts(rep);

      setReports(rep);
      setInfinity(inf);
      setAlerts(alertList);
      setLoading(false);
    }
    load();
  }, [hasAccess]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050807] text-[#E8E1D0] p-6">
        Loading TrendSense…
      </div>
    );
  }

  const trendingToday = reports.filter((r) => r.eventLinked);
  const listNext = infinity.listNext || [];
  const flipPotential = infinity.flipPotential || [];
  const hotTags = infinity.hotTags || [];

  return (
    <div className="min-h-screen bg-[#050807] text-[#E8E1D0] px-6 py-10">
      <div className="max-w-3xl mx-auto">
        <h1 className="sparkly-header header-glitter text-3xl mb-3">
          TrendSense
        </h1>
        <p className="text-sm opacity-70 mb-8">
          Live demand signals, category momentum, and smart “list next”
          insights for your saved listings.
        </p>
        {hasAccess === false && (
          <div className="text-xs uppercase tracking-[0.35em] text-center text-white/60 bg-black/30 border border-white/10 rounded-full py-2 mb-6">
            Preview mode — upgrade to Premium for live TrendSense data.
          </div>
        )}

        {/* 🔎 TrendSense Search */}
        <div className="mt-8 mb-12">
          <TrendSenseSearchPanel disabled={hasAccess === false} />
        </div>

        {/* 🔥 Trending Today Panel */}
        <div className="mt-6 mb-10">
          <h2 className="sparkly-header text-2xl mb-2">
            Trending Today
          </h2>
          <p className="text-xs opacity-60 mb-4">
            Items seeing the strongest real-time momentum.
          </p>

          {reports && reports.length > 0 ? (
            reports
              .filter((r) => r.trendScore >= 65 || r.eventLinked)
              .slice(0, 5)
              .map((rep) => (
                <TrendingTodayCard key={rep.item.id} report={rep} />
              ))
          ) : (
            <div className="text-xs opacity-40 italic">
              Nothing trending yet — save a listing to see insights.
            </div>
          )}
        </div>

        {/* SIDE-BY-SIDE TRENDING DUO */}
        {trendingPairs.length > 0 && (
          <Section
            title={
              <>
                <IconFlame />
                Today’s Trending Duo
              </>
            }
          >
            {(() => {
              const pair = trendingPairs[0];
              if (!pair) return null;
              return (
                <div className="grid grid-cols-2 gap-4">
                  {/* LEFT BOX */}
                  <div className="bg-black/30 border border-[#E8D5A8]/60 rounded-lg p-4">
                    <div className="text-xs uppercase opacity-60 mb-1">
                      Do you have this?
                    </div>
                    <Title>{pair.left.title}</Title>
                    <Details>{pair.left.reason}</Details>
                    <Details className="opacity-60 text-xs mt-1">
                      Category: {pair.left.category}
                    </Details>
                    <button
                      className="mt-3 text-xs px-2 py-1 border border-[#E8D5A8]/60 rounded hover:bg-[#E8D5A8]/10"
                      onClick={() => navigate("/prep")}
                    >
                      Add Listing
                    </button>
                  </div>

                  {/* RIGHT BOX */}
                  <div className="bg-black/30 border border-[#E8D5A8]/60 rounded-lg p-4">
                    <div className="text-xs uppercase opacity-60 mb-1">
                      No? You definitely have this.
                    </div>
                    <Title>{pair.right.title}</Title>
                    <Details>{pair.right.reason}</Details>
                    <Details className="opacity-60 text-xs mt-1">
                      Category: {pair.right.category}
                    </Details>
                    <button
                      className="mt-3 text-xs px-2 py-1 border border-[#E8D5A8]/60 rounded hover:bg-[#E8D5A8]/10"
                      onClick={() => navigate("/prep")}
                    >
                      Add Listing
                    </button>
                  </div>
                </div>
              );
            })()}
          </Section>
        )}

        {/* OPPORTUNITY PANEL — Only if no saved listings */}
        {reports.length === 0 && (
          <Section
            title={
              <>
                <IconFlame />
                Trending Opportunities
              </>
            }
          >
            {trendingOpportunities.map((op, i) => (
              <Card key={i}>
                <Title>{op.title}</Title>
                <Details>{op.reason}</Details>
                <Details className="opacity-60 text-xs mt-1">
                  Category: {op.category}
                </Details>

                <div className="flex gap-3 mt-3 text-xs">
                  <button
                    className="px-2 py-1 border border-[#E8D5A8]/60 rounded hover:bg-[#E8D5A8]/10"
                    onClick={() => navigate("/prep")}
                  >
                    Add Your First Listing
                  </button>
                </div>
              </Card>
            ))}
          </Section>
        )}

        {/* 🥇 List Next */}
        <div className="mt-14 mb-10">
          <h2 className="sparkly-header text-2xl mb-2">
            List Next
          </h2>
          <p className="text-xs opacity-60 mb-4">
            Based on demand, price signals, and category momentum.
          </p>

          {infinity?.listNext?.length > 0 ? (
            infinity.listNext.slice(0, 5).map((entry) => (
              <ListNextCard key={entry.id} report={entry} />
            ))
          ) : (
            <div className="text-xs opacity-40 italic">
              No strong recommendations yet — save a listing to begin.
            </div>
          )}
        </div>

        {/* 💰 Flip Potential */}
        <div className="mt-14 mb-10">
          <h2 className="sparkly-header text-2xl mb-2">
            Flip Potential
          </h2>
          <p className="text-xs opacity-60 mb-4">
            High-upside items with strong sell-through signals.
          </p>

          {infinity?.flipPotential?.length > 0 ? (
            infinity.flipPotential.slice(0, 5).map((entry) => (
              <FlipPotentialCard key={entry.id} report={entry} />
            ))
          ) : (
            <div className="text-xs opacity-40 italic">
              No standout flip opportunities yet — save a listing to begin.
            </div>
          )}
        </div>

        {/* Live Trend Alerts */}
        <div className="mt-14 mb-10">
          <h2 className="sparkly-header text-2xl mb-2">
            Live Trend Alerts
          </h2>

          {alerts && alerts.length > 0 ? (
            alerts.map((a, i) => (
              <div
                key={i}
                className="text-sm text-[#E8E1D0] mb-2"
              >
                • {a.message}
              </div>
            ))
          ) : (
            <div className="text-xs opacity-40 italic">
              No live trend alerts.
            </div>
          )}
        </div>

        {/* 🔔 Sales Monitor & Alerts */}
        <SalesAlertsPanel reports={reports} />

        {/* 💰 Smart Price Bands */}
        <div className="mt-14 mb-10">
          <h2 className="sparkly-header text-2xl mb-2">
            Smart Price Bands
          </h2>
          <p className="text-xs opacity-60 mb-4">
            Min–Target–Max pricing predicted from active demand and comps.
          </p>

          {infinity?.reports?.length > 0 ? (
            infinity.reports
              .filter((rep) => rep.ts?.smartPriceRange)
              .slice(0, 5)
              .map((entry) => (
                <SmartPriceBandCard
                  key={entry.item.id}
                  entry={entry}
                />
              ))
          ) : (
            <div className="text-xs opacity-40 italic">
              No price bands available yet — save a listing to generate
              data.
            </div>
          )}
        </div>

        {/* 📊 Category Momentum */}
        <div className="mt-14 mb-10">
          <h2 className="sparkly-header text-2xl mb-2">
            Category Momentum
          </h2>
          <p className="text-xs opacity-60 mb-4">
            Which categories are heating up or cooling off this week.
          </p>

          {infinity?.categoryMomentum &&
          Object.keys(infinity.categoryMomentum).length > 0 ? (
            Object.entries(infinity.categoryMomentum)
              .slice(0, 8)
              .map(([category, data]) => (
                <CategoryMomentumCard
                  key={category}
                  category={category}
                  data={data}
                />
              ))
          ) : (
            <div className="text-xs opacity-40 italic">
              No category insights yet — save a few items to begin.
            </div>
          )}
        </div>

        {/* 🔥 Hot Tags This Week */}
        <div className="mt-14 mb-10">
          <h2 className="sparkly-header text-2xl mb-2">
            Hot Tags This Week
          </h2>
          <p className="text-xs opacity-60 mb-4">
            Emerging keywords across the resale market.
          </p>

          {infinity?.hotTags && infinity.hotTags.length > 0 ? (
            infinity.hotTags.slice(0, 10).map((t, index) => (
              <HotTagCard key={`${t.keyword || index}-${index}`} tag={t} />
            ))
          ) : (
            <div className="text-xs opacity-40 italic">
              No hot tags yet — save a few listings to begin.
            </div>
          )}
        </div>
      </div>

      <PremiumModal
        open={paywallState.open}
        reason={paywallState.reason}
        usage={paywallState.usage}
        limit={paywallState.limit}
        onClose={closePaywall}
      />

      {openItem && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 z-50">
          <div className="bg-[#0A0D0F] w-full max-w-lg border border-[#E8D5A8] rounded-xl p-6 relative">
            <button
              className="absolute right-4 top-4 text-[#E8D5A8]/70 hover:text-[#E8D5A8]"
              onClick={() => setOpenItem(null)}
            >
              ✕
            </button>

            <h2 className="text-xl mb-3">
              {openItem.item?.title || "Listing"}
            </h2>

            {(() => {
              const ultra = openItem.ts || openItem;
              const floor =
                ultra.priceFloor ?? ultra.smartPriceRange?.min ?? "—";
              const target =
                ultra.priceTarget ??
                ultra.smartPriceRange?.target ??
                "—";
              const ceil =
                ultra.priceCeiling ?? ultra.smartPriceRange?.max ?? "—";
              const catKey = openItem.item?.category || "Other";
              const catInfo =
                infinity.categoryMomentum &&
                infinity.categoryMomentum[catKey];
              const flipScore =
                ultra.priceCeiling && ultra.priceFloor
                  ? ultra.priceCeiling - ultra.priceFloor
                  : null;

              return (
                <div className="space-y-2 text-sm opacity-80">
                  <div>
                    <strong>Headline:</strong>{" "}
                    {ultra.eventHeadline || "—"}
                  </div>
                  <div>
                    <strong>Why:</strong>{" "}
                    {ultra.eventReasons?.join(" • ") || "—"}
                  </div>
                  <div>
                    <strong>Price Band:</strong>{" "}
                    {floor} → {target} → {ceil}
                  </div>
                  <div>
                    <strong>Flip Potential:</strong>{" "}
                    {flipScore ?? "—"}
                  </div>
                  <div>
                    <strong>Category Momentum:</strong>{" "}
                    {catInfo?.direction || "—"}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}

/* ——————— Reusable Components ——————— */

function Section({ title, children }) {
  return (
    <div className="mb-10">
      <h2 className="text-xl font-semibold mb-4">{title}</h2>
      {children}
    </div>
  );
}

function Card({ children, item, navigate, onClick }) {
  return (
    <div
      className="relative bg-black/30 border border-[#E8D5A8]/60 rounded-lg p-4 mb-3 hover:bg-black/40 transition cursor-pointer"
      onClick={onClick}
    >
      <div>{children}</div>

      {item && navigate && (
        <div className="flex gap-3 mt-3 text-xs">
          <button
            onClick={() => navigate(`/inventory?open=${item.id}`)}
            className="px-2 py-1 border border-[#E8D5A8]/60 rounded hover:bg-[#E8D5A8]/10"
          >
            Open Listing
          </button>

          <button
            onClick={() =>
              navigate("/launch-listing", { state: { item } })
            }
            className="px-2 py-1 border border-[#E8D5A8]/60 rounded hover:bg-[#E8D5A8]/10"
          >
            LaunchDeck
          </button>
        </div>
      )}
    </div>
  );
}

function Title({ children }) {
  return <div className="font-semibold text-[#E8D5A8]">{children}</div>;
}

function Subtitle({ children }) {
  return <div className="mt-2 font-medium">{children}</div>;
}

function Details({ children, className = "" }) {
  return (
    <div
      className={`text-xs mt-1 opacity-75 leading-relaxed ${className}`}
    >
      {children}
    </div>
  );
}

function Empty({ children }) {
  return <div className="text-xs opacity-50 italic p-2">{children}</div>;
}
