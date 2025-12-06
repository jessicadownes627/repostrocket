import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useListingStore } from "../store/useListingStore";
import { runMagicFill } from "../engines/MagicFillEngine";
import "../styles/overrides.css";

export default function SingleListing() {
  const navigate = useNavigate();

  // Pull listing data from global store
  const {
    listingData,
    setListingField,
    resetListing,
    premiumUsesRemaining,
    consumeMagicUse,
  } = useListingStore();

  const title = listingData?.title || "";
  const description = listingData?.description || "";
  const price = listingData?.price || "";
  const condition = listingData?.condition || "";
  const category = listingData?.category || "";
  const brand = listingData?.brand || "";
  const size = listingData?.size || "";
  const tags = Array.isArray(listingData?.tags) ? listingData.tags : [];

  const mainPhoto =
    listingData?.photos && listingData.photos.length > 0
      ? listingData.photos[0]
      : null;

  const [isLoaded, setIsLoaded] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [magicSuggestion, setMagicSuggestion] = useState(null);
  const [magicDiff, setMagicDiff] = useState(null);
  const [magicLoading, setMagicLoading] = useState(false);
  const [showUsageModal, setShowUsageModal] = useState(false);

  // -------------------------------------------
  //  SAFE BOOT — prevents black screen
  // -------------------------------------------
  useEffect(() => {
    // If user arrives with NO MagicPrep data, kick them back
    if (!listingData?.photos || listingData.photos.length === 0) {
      navigate("/prep");
      return;
    }

    // Delay just to allow CSS fade-in
    const t = setTimeout(() => setIsLoaded(true), 150);
    return () => clearTimeout(t);
  }, [listingData, navigate]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center text-center text-[var(--lux-text)]">
        <div className="fade-in text-sm opacity-70">Loading your listing…</div>
      </div>
    );
  }

  // -------------------------------------------
  //  LUX INPUT FIELD
  // -------------------------------------------
  const handleFieldChange = (key) => (value) => {
    setListingField(key, value);
  };

  // -------------------------------------------
  //  LUX HEADER BAR
  // -------------------------------------------
  const HeaderBar = ({ label }) => (
    <div className="w-full mt-8 mb-6">
      <div className="h-[1px] w-full bg-[var(--lux-border)] opacity-50"></div>
      <div className="text-center text-[13px] tracking-[0.28em] uppercase text-[var(--lux-text)] opacity-70 py-3">
        {label}
      </div>
      <div className="h-[1px] w-full bg-[var(--lux-border)] opacity-50"></div>
    </div>
  );

  const LuxeInput = ({ label, value, onChange, placeholder }) => (
    <div className="mb-6">
      <div className="text-xs uppercase opacity-70 tracking-wide mb-2">
        {label}
      </div>
      <input
        className="w-full p-3 rounded-[12px] bg-black/30 border border-[var(--lux-border)] text-[var(--lux-text)] focus:outline-none lux-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );

  // -------------------------------------------
  //  MAGIC FILL HANDLERS
  // -------------------------------------------
  const handleRunMagicFill = async () => {
    if (magicLoading) return;
    if (premiumUsesRemaining <= 0) {
      setShowUsageModal(true);
      return;
    }
    try {
      setMagicLoading(true);
      const current = listingData || {};
      const updated = await runMagicFill(current);
      if (!updated) {
        setMagicLoading(false);
        return;
      }

       // consume daily Magic Fill use
      consumeMagicUse();

      setMagicSuggestion(updated);

      const diffs = [];
      if (current.title !== updated.title) {
        diffs.push({
          label: "Title",
          before: current.title || "",
          after: updated.title || "",
          reason: "AI improved clarity and searchability.",
        });
      }
      if (current.description !== updated.description) {
        diffs.push({
          label: "Description",
          before: current.description || "",
          after: updated.description || "",
          reason: "AI expanded and polished the description.",
        });
      }
      if (current.price !== updated.price) {
        diffs.push({
          label: "Price",
          before: current.price || "",
          after: updated.price || "",
          reason: "AI adjusted price based on demand and condition.",
        });
      }

      const beforeTags = Array.isArray(current.tags)
        ? current.tags.join(", ")
        : "";
      const afterTags = Array.isArray(updated.tags)
        ? updated.tags.join(", ")
        : "";
      if (beforeTags !== afterTags) {
        diffs.push({
          label: "Tags",
          before: beforeTags,
          after: afterTags,
          reason: "AI refined your tags for better search visibility.",
        });
      }

      setMagicDiff(diffs.length ? diffs : null);
      setShowReview(true);
    } catch (err) {
      console.error("Magic Fill failed:", err);
    } finally {
      setMagicLoading(false);
    }
  };

  const handleApplyMagic = () => {
    if (!magicSuggestion) {
      setShowReview(false);
      return;
    }
    if (magicSuggestion.title) {
      setListingField("title", magicSuggestion.title);
    }
    if (magicSuggestion.description) {
      setListingField("description", magicSuggestion.description);
    }
    if (magicSuggestion.price) {
      setListingField("price", magicSuggestion.price);
    }
    if (Array.isArray(magicSuggestion.tags)) {
      setListingField("tags", magicSuggestion.tags);
    }
    setShowReview(false);
  };

  // -------------------------------------------
  //  MAIN COMPONENT RENDER
  // -------------------------------------------
  return (
    <div className="app-wrapper px-6 py-10 max-w-2xl mx-auto">

      {/* ---------------------- */}
      {/*  PAGE TITLE            */}
      {/* ---------------------- */}
      <h1 className="sparkly-header header-glitter text-center text-3xl mb-3">
        Single Listing
      </h1>
      <p className="text-center lux-soft-text text-sm mb-10">
        Make your listing shine ✨
      </p>

      {/* ---------------------- */}
      {/*  MAIN PHOTO CARD       */}
      {/* ---------------------- */}
      <div className="lux-card relative mb-14 shadow-xl">
        <div className="premium-gloss"></div>

        <div className="lux-card-title mb-3">Main Photo</div>
        <div className="text-sm opacity-70 mb-3">
          This is the hero image buyers will see first.
        </div>

        {mainPhoto ? (
          <img
            src={mainPhoto}
            alt="Main Photo"
            className="rounded-[14px] w-full h-auto object-cover"
          />
        ) : (
          <div className="opacity-60 text-sm">No photo found</div>
        )}
      </div>

      {/* ---------------------- */}
      {/*  MAGIC FILL CTA        */}
      {/* ---------------------- */}
      <div className="mt-12 mb-10">
        <button
          onClick={handleRunMagicFill}
          className="btn-glass-gold w-full text-center py-3"
          disabled={magicLoading}
        >
          {magicLoading ? "Running Magic…" : "Run Magic Fill ✨"}
        </button>
      </div>

      {/* ---------------------- */}
      {/*  CORE INFORMATION      */}
      {/* ---------------------- */}
      <HeaderBar label="Details Refined" />

      <LuxeInput
        label="Title"
        value={title}
        onChange={handleFieldChange("title")}
        placeholder="e.g., Lululemon Define Jacket — Size 6"
      />

      <LuxeInput
        label="Description"
        value={description}
        onChange={handleFieldChange("description")}
        placeholder="Brief, luxe description…"
      />

      <LuxeInput
        label="Price"
        value={price}
        onChange={handleFieldChange("price")}
        placeholder="e.g., 48"
      />

      <LuxeInput
        label="Condition"
        value={condition}
        onChange={handleFieldChange("condition")}
        placeholder="New / Excellent / Good / Fair"
      />

      <LuxeInput
        label="Category"
        value={category}
        onChange={handleFieldChange("category")}
        placeholder="Women / Kids / Home / Toys"
      />

      <LuxeInput
        label="Brand"
        value={brand}
        onChange={handleFieldChange("brand")}
        placeholder="e.g., Lululemon, Nike, Zara"
      />

      <LuxeInput
        label="Size"
        value={size}
        onChange={handleFieldChange("size")}
        placeholder="e.g., S / M / 6 / 28"
      />

      <LuxeInput
        label="Tags"
        value={tags.join(", ")}
        onChange={(val) =>
          setListingField(
            "tags",
            val
              .split(",")
              .map((t) => t.trim())
              .filter(Boolean)
          )
        }
        placeholder="cozy, knit, neutral, fall"
      />

      {/* ---------------------- */}
      {/*  MAGIC FILL DRAWER     */}
      {/* ---------------------- */}
      {showReview && magicDiff && magicDiff.length > 0 && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-end justify-center px-4">
          <div className="lux-drawer w-full max-w-xl pb-8 pt-5 px-5 space-y-4">
            <div className="text-center">
              <h2 className="text-[20px] font-semibold text-[#F4E9D5]">
                Magic Fill Results
              </h2>
              <p className="text-xs opacity-70 mt-1">
                Review AI suggestions before applying them to your listing.
              </p>
            </div>

            <div className="gold-divider" />

            <div className="space-y-4 max-h-[320px] overflow-y-auto pr-1">
              {magicDiff.map((item, idx) => (
                <div key={idx} className="border border-[rgba(232,213,168,0.28)] rounded-xl p-3 bg-black/30">
                  <div className="text-xs uppercase tracking-wide opacity-70 mb-1">
                    {item.label}
                  </div>
                  <div className="flex flex-col gap-2 text-sm">
                    <div>
                      <div className="text-[11px] opacity-60 mb-0.5">Before</div>
                      <div className="text-[13px] opacity-85">
                        {item.before || <span className="opacity-50">—</span>}
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] opacity-60 mb-0.5">After</div>
                      <div className="text-[13px] text-[#F4E9D5]">
                        {item.after || <span className="opacity-50">—</span>}
                      </div>
                    </div>
                  </div>
                  {item.reason && (
                    <div className="mt-2 text-[11px] opacity-70">
                      {item.reason}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="gold-divider" />

            <div className="flex gap-3 pt-2">
              <button
                className="flex-1 lux-quiet-btn"
                onClick={() => setShowReview(false)}
              >
                Cancel
              </button>
              <button
                className="flex-1 lux-continue-btn shadow-lg"
                onClick={handleApplyMagic}
              >
                Apply Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------- */}
      {/*  ACTION BUTTONS        */}
      {/* ---------------------- */}
      <div className="mt-14 space-y-4">
        <button
          className="lux-continue-btn shadow-lg"
          onClick={() => {
            document.body.classList.add("lux-page-transition");
            setTimeout(() => {
              navigate("/launch");
              document.body.classList.remove("lux-page-transition");
            }, 180);
          }}
        >
          Continue to LaunchDeck →
        </button>

        <button
          onClick={() => {
            resetListing();
            navigate("/dashboard");
          }}
          className="lux-quiet-btn w-full"
        >
          Cancel Listing
        </button>
      </div>

      {/* ---------------------- */}
      {/*  MAGIC USAGE MODAL     */}
      {/* ---------------------- */}
      {showUsageModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center px-4">
          <div className="bg-[#0A0A0A] border border-[rgba(232,213,168,0.65)] rounded-2xl p-6 max-w-sm w-full text-center">
            <h2 className="text-[18px] font-semibold text-[#F4E9D5] mb-2">
              You’ve used today’s Magic Fill
            </h2>
            <p className="text-sm opacity-75 mb-5">
              You can run another Magic Fill tomorrow, or upgrade for unlimited daily magic.
            </p>
            <button
              className="lux-continue-btn w-full"
              onClick={() => setShowUsageModal(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
