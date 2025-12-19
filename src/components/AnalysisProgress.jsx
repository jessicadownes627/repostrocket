import { useEffect, useState } from "react";

const STEPS = [
  "Images uploaded",
  "Corners extracted",
  "Reading card details",
  "Evaluating condition",
  "Estimating market value",
];

export default function AnalysisProgress({ active }) {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    if (!active) {
      setStage(0);
      return;
    }

    setStage(1);
    const timers = [];
    const increments = [600, 1200, 1200, 900];
    let accumulated = 0;
    increments.forEach((duration, idx) => {
      accumulated += duration;
      timers.push(
        setTimeout(() => {
          setStage(Math.min(STEPS.length, idx + 2));
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
