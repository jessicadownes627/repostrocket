import { useEffect, useState } from "react";

const STEPS = [
  "Upload confirmed",
  "Reading card details",
  "Inspecting corners",
  "Estimating condition",
  "Building listing",
];

export default function AnalysisProgress({ active }) {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    if (!active) {
      setStage(0);
      return;
    }

    setStage(2);
    const timers = [];
    const increments = [750, 750, 750, 750];
    let accumulated = 0;
    increments.forEach((duration) => {
      accumulated += duration;
      timers.push(
        setTimeout(() => {
          setStage((prev) => Math.min(STEPS.length + 1, prev + 1));
        }, accumulated)
      );
    });

    return () => {
      timers.forEach((timer) => clearTimeout(timer));
    };
  }, [active]);

  if (!active && stage === 0) return null;

  return (
    <div className="analysis-progress">
      <ul>
        {STEPS.map((label, idx) => {
          const status =
            idx + 1 < stage ? "done" : idx + 1 === stage ? "current" : "pending";
          return (
            <li key={label} className={status}>
              {status === "done" ? label : idx + 1 === stage ? label : label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
