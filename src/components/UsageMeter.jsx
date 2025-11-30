// src/components/UsageMeter.jsx
import React from "react";
import { getUsage, getLimitFor } from "../utils/usageTracker";
import "../styles/usageMeter.css";

export default function UsageMeter() {
  const usage = getUsage(); // {smartFill:0, launches:1, etc}

  const features = [
    { key: "smartFill", label: "Smart Fill" },
    { key: "autoFill", label: "Auto Fill" },
    { key: "aiReview", label: "AI Review" },
    { key: "launches", label: "Launches" },
  ];

  return (
    <div className="usage-meter">
      {features.map((f) => {
        const used = usage?.[f.key] || 0;
        const limit = getLimitFor(f.key);

        return (
          <div key={f.key} className="usage-row">
            <span className="usage-label">{f.label}</span>
            <span className="usage-values">
              {used}/{limit}
            </span>
          </div>
        );
      })}
    </div>
  );
}
