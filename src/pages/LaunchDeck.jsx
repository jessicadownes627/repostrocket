import { useState } from "react";
import { useLocation } from "react-router-dom";
import { useListingStore } from "../store/useListingStore";
import "../styles/overrides.css";

export default function LaunchDeck() {
  const location = useLocation();
  const { listingData, setListing } = useListingStore();

  const listings = listingData?.photos?.length ? [{ ...listingData }] : [];

  const [activeItem, setActiveItem] = useState(null);

  const handleCloseModal = () => setActiveItem(null);

  return (
    <div className="min-h-screen bg-[#050807] text-[#E8E1D0] px-6 py-10">

      {/* HEADER */}
      <div className="mb-8">
        <h1 className="text-[30px] font-semibold tracking-tight sparkly-header header-glitter">
          LaunchDeck
        </h1>
        <p className="text-sm opacity-70 mt-1">
          Final polish before posting.
        </p>
      </div>

      {/* CAROUSEL */}
      <div
        className="
          flex gap-6 overflow-x-auto snap-x snap-mandatory 
          pb-4 hide-scrollbar
        "
      >
        {listings.map((item, idx) => (
          <div
            key={item.id || idx}
            className="
              min-w-[260px] snap-center 
              bg-[rgba(16,16,16,0.55)]
              border border-[rgba(232,213,168,0.40)]
              rounded-2xl overflow-hidden relative
              shadow-[0_0_18px_rgba(0,0,0,0.45)]
              transition-all duration-300
              hover:shadow-[0_0_22px_rgba(232,213,168,0.25)]
            "
            onClick={() => setActiveItem(item)}
          >
            {/* Image */}
            <div className="h-48 w-full overflow-hidden">
              <img
                src={item.photos?.[0]}
                className="w-full h-full object-cover"
                alt="item"
              />
            </div>

            {/* CONTENT */}
            <div className="p-4 space-y-1">
              <div className="font-semibold text-[15px] text-[#F4E9D5]">
                {item.title || "Untitled Listing"}
              </div>
              {item.brand && (
                <div className="text-[11px] opacity-80">
                  {item.brand}
                  {item.size ? ` · ${item.size}` : ""}
                </div>
              )}
              {!item.brand && item.size && (
                <div className="text-[11px] opacity-80">
                  Size {item.size}
                </div>
              )}
              <div className="text-xs opacity-70 line-clamp-2">
                {item.description || "No description provided."}
              </div>
              {Array.isArray(item.tags) && item.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {item.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 rounded-full border border-[rgba(232,213,168,0.35)] text-[10px] opacity-80"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Glossy shimmer */}
              <div className="premium-gloss absolute inset-0 pointer-events-none"></div>
            </div>
          </div>
        ))}
      </div>

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
            <div className="w-full h-56 overflow-hidden rounded-xl">
              <img
                src={activeItem.photos?.[0]}
                className="w-full h-full object-cover"
              />
            </div>

            {/* TITLE */}
            <div>
              <label className="text-xs uppercase opacity-60">
                Title
              </label>
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
              <label className="text-xs uppercase opacity-60">
                Description
              </label>
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
