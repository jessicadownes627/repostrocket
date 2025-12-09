import { useEffect, useState } from "react";
import { analyzeListingForAlerts } from "../utils/salesMonitor";
import Sparkline from "./Sparkline";

export default function SalesAlertsPanel({ reports }) {
  const [entries, setEntries] = useState([]);

  useEffect(() => {
    if (!reports || !reports.length) {
      setEntries([]);
      return;
    }

    const arr = [];
    reports.forEach((rep) => {
      const result = analyzeListingForAlerts(rep);
      if (result && result.alerts && result.alerts.length) {
        arr.push({ listing: rep.item, report: result });
      }
    });

    setEntries(arr);
  }, [reports]);

  if (!entries.length) return null;

  return (
    <div className="mt-14 mb-10">
      <h2 className="sparkly-header text-2xl mb-2">Sales Monitor</h2>
      <p className="text-xs opacity-60 mb-4">
        Real-time alerts from market movement and listing age.
      </p>

      {entries.map(({ listing, report }) => (
        <div
          key={listing.id}
          className="lux-bento-card p-4 rounded-xl border border-[#26292B] bg-[#0B0D0F] mb-4"
        >
          <div className="font-medium mb-1">
            {listing.title || "Untitled Listing"}
          </div>

          <div className="mb-3">
            <Sparkline points={report.sparkline || []} />
          </div>

          {report.alerts.map((a, i) => (
            <div key={i} className="text-xs text-[#E8D5A8] mb-1">
              • {a.message}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

