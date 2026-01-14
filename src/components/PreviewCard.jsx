import React from "react";
import { buildListingExportLinks } from "../utils/exportListing";
import { getPhotoUrl } from "../utils/photoHelpers";

const APPAREL_CATEGORIES = new Set([
  "Tops",
  "Bottoms",
  "Dresses",
  "Outerwear",
  "Activewear",
  "Shoes",
  "Accessories",
  "Bags",
  "Kids & Baby",
]);

const shouldDisplaySize = (item = {}) => {
  if (!item?.size) return false;
  const category = (item.category || "").trim();
  if (category && APPAREL_CATEGORIES.has(category)) {
    return true;
  }
  if (item?.apparelAttributes?.size || item?.apparelIntel?.size) {
    return true;
  }
  return false;
};

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
  editLabel = "Edit Details",
  platformTitle,
  platformDescription,
  onLaunch,
  platformImage,
  isPrimary = false,
}) {
  if (!item) return null;

  const photoList = Array.isArray(item.photos) ? item.photos : [];
  const fallbackPhoto = photoList
    .map((p) => getPhotoUrl(p))
    .find((url) => Boolean(url));
  const photo = item.editedPhoto || fallbackPhoto || null;
  const previewPhoto = platformImage || photo;
  const { label } = platformMeta(platform);
  const displaySize = shouldDisplaySize(item) ? item.size : "";
  const launchButtonLabel = `Open ${label}`;
  const headerTitle = `Ready for ${label}`;
  const headerSubtext =
    "Formatted to match this marketplace’s listing flow and category structure.";

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
      transition duration-300 group
    "
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4 gap-4">
        <div className="flex-1">
          <div
            className={`uppercase tracking-[0.35em] text-[10px] ${
              isPrimary
                ? "text-[rgba(232,213,168,0.85)]"
                : "text-[rgba(232,213,168,0.5)]"
            } mb-1`}
          >
            {label}
          </div>
          <div
            className={`text-[17px] font-semibold leading-tight ${
              isPrimary ? "text-white" : "text-white/80"
            }`}
          >
            {headerTitle}
          </div>
          <div className="text-[10px] uppercase tracking-[0.3em] text-white/50 mt-1">
            {headerSubtext}
          </div>
        </div>
        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            className="text-[11px] px-3 py-1 rounded-full border border-[rgba(232,213,168,0.30)] text-[rgba(232,213,168,0.80)] hover:bg-black/50 transition"
          >
            {editLabel}
          </button>
        )}
      </div>

      {/* Body */}
      <div className="flex gap-4 items-start">
        {/* Thumbnail */}
        {previewPhoto ? (
          <img
            src={previewPhoto}
            alt={`${label} preview`}
            className="w-20 h-20 object-cover rounded-[14px] border border-[rgba(232,213,168,0.25)] shadow-[0_3px_10px_rgba(0,0,0,0.50)]"
          />
        ) : (
          <div className="w-20 h-20 rounded-[14px] bg-black/40 border border-[rgba(255,255,255,0.05)]" />
        )}

        {/* Text content */}
        <div className="flex-1">
          {/* Title */}
          <div
          className={`font-semibold leading-snug mb-1 transition-colors ${
            isPrimary
              ? "text-[15px] text-[#F4E9D5] group-hover:text-white"
              : "text-[14px] text-white/70 group-hover:text-white/85"
          }`}
        >
          {displayTitle}
        </div>

        {/* Details line */}
        <div
          className={`text-[12px] mb-2 transition-colors ${
            isPrimary
              ? "text-white/60 group-hover:text-white/80"
              : "text-white/30 group-hover:text-white/60"
          }`}
        >
            {[
              item.price ? `$${item.price}` : "",
              item.condition || "",
              item.category || "",
              displaySize ? `Size ${displaySize}` : "",
            ]
              .filter(Boolean)
              .join(" · ") || "Details incomplete"}
          </div>

          {/* Description – main hero text */}
          <div
            className={`text-[13px] leading-relaxed line-clamp-3 whitespace-pre-line mb-3 transition-colors ${
              isPrimary
                ? "text-white/75 group-hover:text-white"
                : "text-white/40 group-hover:text-white/70"
            }`}
          >
            {displayDescription}
          </div>

          {Array.isArray(item.tags) && item.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-4">
              {item.tags.slice(0, 4).map((tag) => (
                <span
                  key={tag}
                  className="text-[11px] px-2 py-0.5 rounded-full border border-[rgba(232,213,168,0.25)] text-[rgba(232,213,168,0.75)] transition-colors group-hover:border-[rgba(232,213,168,0.55)] group-hover:text-[rgba(232,213,168,0.95)]"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Copy actions – secondary */}
          <div className="flex flex-col gap-2 mb-4">
            <button
              type="button"
              className="w-full text-[11px] px-3 py-2 rounded-xl border border-[rgba(232,213,168,0.45)] text-[rgba(232,213,168,0.9)] bg-transparent hover:bg-black/25 transition"
              onClick={() =>
                navigator?.clipboard?.writeText &&
                navigator.clipboard.writeText(displayTitle)
              }
            >
              Copy Title
            </button>
            <button
              type="button"
              className="w-full text-[11px] px-3 py-2 rounded-xl border border-[rgba(232,213,168,0.35)] text-[rgba(232,213,168,0.85)] bg-transparent hover:bg-black/25 transition"
              onClick={() =>
                navigator?.clipboard?.writeText &&
                navigator.clipboard.writeText(displayDescription)
              }
            >
              Copy Description
            </button>
            {item.price && (
              <button
                type="button"
                className="w-full text-[11px] px-3 py-2 rounded-xl border border-[rgba(232,213,168,0.35)] text-[rgba(232,213,168,0.85)] bg-transparent hover:bg-black/25 transition"
                onClick={() =>
                  navigator?.clipboard?.writeText &&
                  navigator.clipboard.writeText(
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
        <div className="px-4 pb-5 pt-1">
          <button
            type="button"
            disabled={!launchUrl}
            onClick={() => {
              if (!launchUrl) return;
              if (onLaunch) {
                onLaunch({
                  platform,
                  label,
                  launchUrl,
                  title: displayTitle,
                  description: displayDescription,
                  price: item.price,
                });
                return;
              }
              window.open(launchUrl, "_blank", "noopener");
            }}
            className={`
              w-full mt-2 py-3 rounded-2xl text-[11px] font-semibold tracking-[0.3em] launch-pulse
              ${
                launchUrl
                  ? "bg-gradient-to-r from-[#F7E8C8] via-[#F2DDB1] to-[#E3CFA0] text-[#1B1208] border border-[rgba(248,233,207,0.6)] shadow-[0_10px_25px_rgba(0,0,0,0.45)] hover:shadow-[0_14px_30px_rgba(0,0,0,0.55)] transition"
                  : "bg-black/30 text-white/35 border border-white/10 cursor-not-allowed"
              }
            `}
          >
            {launchUrl ? launchButtonLabel : "Launch unavailable"}
          </button>
          <p className="text-[11px] text-white/50 mt-2">
            Opens in a new tab with your listing details prepared — you stay in full control.
          </p>
        </div>
    </div>
  );
}
