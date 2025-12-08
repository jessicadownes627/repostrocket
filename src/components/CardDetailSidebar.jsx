import { useState } from "react";

export default function CardDetailSidebar({
  item,
  index,
  updateItem,
  onClose,
}) {
  const [quickFixMode, setQuickFixMode] = useState(null);
  const [quickFixValue, setQuickFixValue] = useState("");

  const applyQuickFix = () => {
    if (!quickFixMode) return;
    updateItem(index, (prev) => ({
      ...prev,
      [quickFixMode]: quickFixValue.trim(),
    }));
    setQuickFixMode(null);
  };

  const fields = [
    ["cardPlayer", "Player"],
    ["cardTeam", "Team"],
    ["cardYear", "Year"],
    ["cardBrandExact", "Brand / Set"],
    ["cardNumber", "Card #"],
    ["cardSerial", "Serial #"],
    ["cardParallel", "Parallel"],
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
        onClick={onClose}
      ></div>

      {/* Slide-out panel */}
      <div className="fixed top-0 right-0 w-full max-w-sm h-full bg-black border-l border-white/20 z-50 p-6 overflow-y-auto transition-transform duration-300">
        <div className="flex justify-between items-center mb-6">
          <div className="text-2xl font-semibold text-white">Card Details</div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white text-xl"
          >
            ✕
          </button>
        </div>

        {/* Image preview */}
        <div className="w-full mb-6">
          <img
            src={item?.photos?.[0]}
            alt="Card"
            className="w-full rounded-lg border border-white/20 shadow-xl"
          />
        </div>

        {/* Field list */}
        <div className="space-y-4 mb-10">
          {fields.map(([key, label]) => (
            <div key={key} className="text-white/90">
              <div className="text-sm uppercase tracking-wide opacity-60">
                {label}
              </div>

              <div className="flex items-center justify-between mt-1">
                <div className="text-base">
                  {item?.[key] || <span className="opacity-40">—</span>}
                </div>

                <button
                  className="text-xs text-[#E8DCC0] hover:text-[#FFF3D0]"
                  onClick={() => {
                    setQuickFixMode(key);
                    setQuickFixValue(item?.[key] || "");
                  }}
                >
                  ✎
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Copy buttons */}
        {item?.autoListing && (
          <div className="space-y-3">
            <button
              className="w-full py-2 rounded-lg bg-[#F5E7D0] text-black font-semibold"
              onClick={() =>
                navigator.clipboard.writeText(item.autoListing.title)
              }
            >
              Copy Title
            </button>

            <button
              className="w-full py-2 rounded-lg bg-black/40 border border-white/20 text-white"
              onClick={() =>
                navigator.clipboard.writeText(item.autoListing.description)
              }
            >
              Copy Description
            </button>

            <button
              className="w-full py-2 rounded-lg bg-black/40 border border-white/20 text-white"
              onClick={() =>
                navigator.clipboard.writeText(
                  JSON.stringify(item.autoListing.specifics, null, 2)
                )
              }
            >
              Copy Item Specifics
            </button>

            <button
              className="w-full py-2 rounded-lg bg-black/40 border border-white/20 text-white"
              onClick={() => {
                const full = `${item.autoListing.title}\n\n${
                  item.autoListing.description
                }\n\nItem Specifics:\n${JSON.stringify(
                  item.autoListing.specifics,
                  null,
                  2
                )}`;
                navigator.clipboard.writeText(full);
              }}
            >
              Copy Full Listing
            </button>
          </div>
        )}
      </div>

      {/* Quick Fix Modal */}
      {quickFixMode && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
          onClick={() => setQuickFixMode(null)}
        >
          <div
            className="bg-black border border-white/20 rounded-xl p-6 w-full max-w-sm text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-xl font-semibold mb-3">
              Fix {quickFixMode.replace("card", "")}
            </div>

            <input
              value={quickFixValue}
              onChange={(e) => setQuickFixValue(e.target.value)}
              className="w-full bg-black/40 border border-white/20 rounded-lg p-2 mb-4 text-white"
              placeholder="Enter value..."
            />

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setQuickFixMode(null)}
                className="px-3 py-1 rounded-md border border-white/20"
              >
                Cancel
              </button>
              <button
                onClick={applyQuickFix}
                className="px-4 py-1 rounded-md bg-[#F5E7D0] text-black font-medium"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
