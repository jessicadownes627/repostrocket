import React from "react";
import { buildListingExportLinks } from "../utils/exportListing";

function safeCopy(text) {
  if (!text) return;
  if (navigator?.clipboard?.writeText) {
    navigator.clipboard.writeText(text).catch(() => {});
  }
}

function platformMeta(key) {
  switch (key) {
    case "ebay":
      return { label: "eBay", accent: "#F5E7D0" };
    case "poshmark":
      return { label: "Poshmark", accent: "#F5E7D0" };
    case "mercari":
      return { label: "Mercari", accent: "#F5E7D0" };
    case "depop":
      return { label: "Depop", accent: "#F5E7D0" };
    case "grailed":
      return { label: "Grailed", accent: "#F5E7D0" };
    default:
      return { label: key.toUpperCase(), accent: "#F5E7D0" };
  }
}

export default function PreviewCard({
  platform,
  item,
  onEdit,
  platformTitle,
  platformDescription,
}) {
  if (!item) return null;

  const photo = item.editedPhoto || (item.photos && item.photos[0]) || null;
  const { label } = platformMeta(platform);

  const links = buildListingExportLinks({
    title: item.title || "",
    price: item.price,
    description: item.description || "",
  });

  const launchUrl = links[platform];

  const displayTitle = platformTitle || item.title || "Untitled Listing";
  const displayDescription =
    platformDescription ||
    item.description ||
    "Description not added yet.";

  return (
    <div
      className="
      w-full rounded-2xl border border-[rgba(232,213,168,0.20)]
      bg-[rgba(0,0,0,0.40)]
      px-4 py-5 mb-8
      shadow-[0_4px_16px_rgba(0,0,0,0.55)]
      backdrop-blur-sm
    "
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-[11px] uppercase tracking-[0.15em] text-[rgba(232,213,168,0.55)]">
          {label} Preview
        </div>
        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            className="text-[11px] px-3 py-1 rounded-full border border-[rgba(232,213,168,0.30)] text-[rgba(232,213,168,0.80)] hover:bg-black/50 transition"
          >
            Edit Details
          </button>
        )}
      </div>

      {/* Body */}
      <div className="flex gap-4 items-start">
        {/* Thumbnail */}
        {photo ? (
          <img
            src={photo}
            alt="Preview"
            className="w-20 h-20 object-cover rounded-[14px] border border-[rgba(232,213,168,0.25)] shadow-[0_3px_10px_rgba(0,0,0,0.50)]"
          />
        ) : (
          <div className="w-20 h-20 rounded-[14px] bg-black/40 border border-[rgba(255,255,255,0.05)]" />
        )}

        {/* Text content */}
        <div className="flex-1">
          {/* Title */}
          <div className="text-[15px] font-semibold text-[#F4E9D5] leading-snug mb-1">
            {displayTitle}
          </div>

          {/* Details line */}
          <div className="text-[12px] text-white/50 mb-2">
            {[
              item.price ? `$${item.price}` : "",
              item.condition || "",
              item.category || "",
              item.size ? `Size ${item.size}` : "",
            ]
              .filter(Boolean)
              .join(" · ") || "Details incomplete"}
          </div>

          {/* Description – main hero text */}
          <div className="text-[13px] text-white/70 leading-relaxed line-clamp-4 whitespace-pre-line mb-3">
            {displayDescription}
          </div>

          {Array.isArray(item.tags) && item.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-4">
              {item.tags.slice(0, 4).map((tag) => (
                <span
                  key={tag}
                  className="text-[11px] px-2 py-0.5 rounded-full border border-[rgba(232,213,168,0.25)] text-[rgba(232,213,168,0.75)]"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Copy actions – high priority */}
          <div className="flex flex-col gap-2 mb-3">
            <button
              type="button"
              className="w-full text-[12px] px-3 py-2 rounded-xl bg-[rgba(232,213,168,0.90)] text-black font-semibold tracking-wide border border-[rgba(232,213,168,0.45)]"
              onClick={() => safeCopy(displayTitle)}
            >
              Copy Title
            </button>
            <button
              type="button"
              className="w-full text-[12px] px-3 py-2 rounded-xl bg-black/30 text-[#F4E9D5] border border-[rgba(232,213,168,0.35)] hover:bg-black/50 transition"
              onClick={() => safeCopy(displayDescription)}
            >
              Copy Description
            </button>
            {item.price && (
              <button
                type="button"
                className="w-full text-[12px] px-3 py-2 rounded-xl bg-black/30 text-[#F4E9D5] border border-[rgba(232,213,168,0.35)] hover:bg-black/50 transition"
                onClick={() =>
                  safeCopy(
                    typeof item.price === "number"
                      ? item.price.toString()
                      : item.price || ""
                  )
                }
              >
                Copy Price
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Launch row */}
      <div className="px-4 pb-4">
        <button
          type="button"
          disabled={!launchUrl}
          onClick={() => {
            if (!launchUrl) return;
            window.open(launchUrl, "_blank", "noopener");
          }}
          className={`
            w-full mt-2 py-2 rounded-xl text-[11px] font-semibold tracking-wide
            ${launchUrl
              ? "bg-black/60 text-[#F5E7D0] border border-[rgba(232,213,168,0.25)] hover:bg-black/75 transition"
              : "bg-black/30 text-white/40 border border-white/20 cursor-not-allowed"}
          `}
        >
          {launchUrl ? `Launch to ${label}` : "Launch unavailable"}
        </button>
      </div>
    </div>
  );
}
