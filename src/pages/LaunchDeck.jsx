import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useListingStore } from "../store/useListingStore";
import PreviewCard from "../components/PreviewCard";
import { buildPlatformPreview } from "../utils/platformPreview";
import { formatDescriptionByPlatform } from "../utils/formatDescriptionByPlatform";
import "../styles/overrides.css";
import { getPhotoUrl } from "../utils/photoHelpers";

export default function LaunchDeck() {
  const location = useLocation();
  const navigate = useNavigate();
  const { listingData, setListing } = useListingStore();

  const locationItems = location.state?.items;
  const listings =
    locationItems && locationItems.length
      ? locationItems
      : listingData?.photos?.length
      ? [{ ...listingData }]
      : [];
  const finalListing = listingData || {};

  const activeListing = listings.length ? listings[0] : null;
  const platformPreview = activeListing
    ? buildPlatformPreview(activeListing)
    : null;

  const platformDescriptions =
    activeListing && platformPreview
      ? formatDescriptionByPlatform({
          ...activeListing,
          description:
            platformPreview.summaryDescription || activeListing.description,
        })
      : null;

  const [activeItem, setActiveItem] = useState(null);

  const safeCopy = (text) => {
    if (!text) return;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).catch((err) =>
        console.error("Copy failed:", err)
      );
    }
  };

  const handleCloseModal = () => setActiveItem(null);

  const formatListingDetails = (item) => {
    if (!item) return "";
    const lines = [];

    if (item.title) lines.push(item.title);

    const brandSize = [
      item.brand || "",
      item.size ? `Size ${item.size}` : "",
    ]
      .filter(Boolean)
      .join(" · ");
    if (brandSize) lines.push(brandSize);

    const catCond = [item.category || "", item.condition || ""]
      .filter(Boolean)
      .join(" · ");
    if (catCond) lines.push(catCond);

    if (item.price) lines.push(`Price: $${item.price}`);

    if (item.description) {
      lines.push("");
      lines.push(item.description);
    }

    if (Array.isArray(item.tags) && item.tags.length > 0) {
      lines.push("");
      lines.push("Tags: " + item.tags.join(", "));
    }

    return lines.join("\n");
  };

  return (
    <div className="min-h-screen bg-[#050807] text-[#E8E1D0] px-6 py-10">

      {/* HEADER */}
      <div className="mb-8">
        <h1 className="text-[30px] font-semibold tracking-tight sparkly-header header-glitter">
          Listing Preview
        </h1>
        <p className="text-sm opacity-70 mt-1 mb-3">
          Preview your listing for each marketplace, copy details, and launch.
        </p>
      </div>

      {/* PREVIEW CARDS */}
      {listings.length === 0 ? (
        <div className="text-sm opacity-60">
          No listing found to preview. Go back and create a listing first.
        </div>
      ) : (
        <div className="space-y-4">
          {["ebay", "poshmark", "mercari"].map((platformKey) => (
            <PreviewCard
              key={platformKey}
              platform={platformKey}
              item={activeListing}
              platformTitle={
                platformPreview?.titles
                  ? platformPreview.titles[platformKey]
                  : undefined
              }
              platformDescription={
                platformDescriptions
                  ? platformDescriptions[platformKey]
                  : undefined
              }
              onEdit={() => setActiveItem(activeListing)}
            />
          ))}
        </div>
      )}

      {/* EDIT MODAL */}
      {activeItem && (
        <div
          className="
            fixed inset-0 bg-black/70 backdrop-blur-md z-50 
            flex items-end justify-center px-4
          "
          onClick={handleCloseModal}
        >
          <div
            className="
              lux-drawer w-full max-w-lg
              p-6 pb-10 space-y-6
            "
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center">
              <h2 className="text-[22px] font-semibold mb-1 text-[#F4E9D5]">
                Edit Listing
              </h2>
              <p className="text-xs opacity-60">
                Make your final edits.
              </p>
            </div>

            {/* IMAGE */}
            <div>
              {(() => {
                const photoList = Array.isArray(activeItem.photos)
                  ? activeItem.photos
                  : [];
                const photoUrls = photoList
                  .map((p) => getPhotoUrl(p))
                  .filter(Boolean);
                const featured = activeItem.editedPhoto || photoUrls[0];

                return (
                  <>
                    {featured && (
                      <div className="w-full h-56 overflow-hidden rounded-xl">
                        <img
                          src={featured}
                          className="w-full h-full object-cover"
                          alt="listing"
                        />
                      </div>
                    )}

                    {photoUrls.length > 1 && (
                      <div className="mt-3 flex gap-2 overflow-x-auto hide-scrollbar">
                        {photoUrls.slice(1).map((url, idx) => (
                          <div
                            key={idx}
                            className="
                              w-16 h-16 rounded-lg overflow-hidden 
                              border border-[rgba(232,213,168,0.28)]
                              flex-shrink-0
                            "
                          >
                            <img
                              src={url}
                              alt="additional"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                );
              })()}
            </div>

            {/* TITLE */}
            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs uppercase opacity-60">
                  Title
                </label>
                <button
                  type="button"
                  className="text-[10px] px-2 py-0.5 rounded-full border border-[rgba(232,213,168,0.45)] text-[rgba(232,213,168,0.85)]"
                  onClick={() => safeCopy(activeItem.title || "")}
                >
                  Copy
                </button>
              </div>
              <input
                className="
                  w-full mt-1 p-3 rounded-xl bg-[#0F0F0F] 
                  border border-[rgba(232,213,168,0.28)]
                  text-sm lux-input
                "
                value={activeItem.title}
                onChange={(e) =>
                  setActiveItem({ ...activeItem, title: e.target.value })
                }
              />
            </div>

            {/* DESCRIPTION */}
            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs uppercase opacity-60">
                  Description
                </label>
                <button
                  type="button"
                  className="text-[10px] px-2 py-0.5 rounded-full border border-[rgba(232,213,168,0.45)] text-[rgba(232,213,168,0.85)]"
                  onClick={() => safeCopy(activeItem.description || "")}
                >
                  Copy
                </button>
              </div>
              <textarea
                className="
                  w-full mt-1 p-3 rounded-xl bg-[#0F0F0F] 
                  border border-[rgba(232,213,168,0.28)]
                  text-sm lux-textarea
                  h-28
                "
                value={activeItem.description}
                onChange={(e) =>
                  setActiveItem({
                    ...activeItem,
                    description: e.target.value,
                  })
                }
              />
            </div>

            {/* ATTRIBUTES */}
            <div>
              <label className="text-xs uppercase opacity-60">Attributes</label>
              <div className="mt-3 grid grid-cols-2 gap-3">
                {(activeItem.tags || []).map((tag) => (
                  <div key={tag} className="lux-chip">
                    {tag}
                  </div>
                ))}
              </div>
            </div>

            {/* FULL DETAILS SUMMARY */}
            <div>
              <label className="text-xs uppercase opacity-60">
                Full Details
              </label>
              <div className="mt-2 text-[13px] opacity-80 space-y-1">
                {activeItem.category && (
                  <div>
                    <span className="opacity-60">Category: </span>
                    {activeItem.category}
                  </div>
                )}
                {(activeItem.brand || activeItem.size) && (
                  <div>
                    <span className="opacity-60">Brand / Size: </span>
                    {[activeItem.brand, activeItem.size]
                      .filter(Boolean)
                      .join(" · ")}
                  </div>
                )}
                {activeItem.condition && (
                  <div>
                    <span className="opacity-60">Condition: </span>
                    {activeItem.condition}
                  </div>
                )}
                {activeItem.price && (
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="opacity-60">Price: </span>${activeItem.price}
                    </div>
                    <button
                      type="button"
                      className="text-[10px] px-2 py-0.5 rounded-full border border-[rgba(232,213,168,0.45)] text-[rgba(232,213,168,0.85)]"
                      onClick={() =>
                        safeCopy(
                          typeof activeItem.price === "number"
                            ? activeItem.price.toString()
                            : activeItem.price || ""
                        )
                      }
                    >
                      Copy
                    </button>
                  </div>
                )}
                {Array.isArray(activeItem.tags) &&
                  activeItem.tags.length > 0 && (
                    <div className="flex items-center justify-between">
                      <div className="truncate">
                        <span className="opacity-60">Tags: </span>
                        {activeItem.tags.join(", ")}
                      </div>
                      <button
                        type="button"
                        className="ml-2 text-[10px] px-2 py-0.5 rounded-full border border-[rgba(232,213,168,0.45)] text-[rgba(232,213,168,0.85)] flex-shrink-0"
                        onClick={() =>
                          safeCopy(
                            Array.isArray(activeItem.tags)
                              ? activeItem.tags.join(", ")
                              : ""
                          )
                        }
                      >
                        Copy
                      </button>
                    </div>
                  )}
              </div>
            </div>

            {/* COPY DETAILS */}
            <button
              className="
                w-full mt-2 py-3 rounded-xl 
                bg-[#111] border border-[rgba(232,213,168,0.45)]
                text-sm font-semibold
                hover:bg-[#181818] transition
              "
              onClick={() => {
                const text = formatListingDetails(activeItem || finalListing);
                safeCopy(text);
              }}
            >
              Copy Listing Details
            </button>

            {/* SAVE */}
            <button
              className="
                w-full mt-6 py-4 rounded-xl 
                bg-gradient-to-b from-[#f5e7ce] to-[#d9c19b]
                text-black font-semibold
                hover:brightness-110 transition
              "
              onClick={() => {
                setListing(activeItem);
                handleCloseModal();
              }}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
