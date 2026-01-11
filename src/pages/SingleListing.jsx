import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import LuxeChipGroup from "../components/LuxeChipGroup";
import LuxeInput from "../components/LuxeInput";
import { useListingStore } from "../store/useListingStore";
import "../styles/overrides.css";

const CATEGORY_OPTIONS = ["Sports Cards", "Apparel", "Accessories", "Home Goods", "Other"];
const CONDITION_OPTIONS = ["New with tags", "Like new", "Very good", "Good", "Fair"];
const TAG_OPTIONS = ["Neutral", "Modern", "Minimal", "Classic", "Statement"];

export default function SingleListing() {
  const navigate = useNavigate();
  const location = useLocation();
  const { listingData: storedListingData } = useListingStore();

  const mode = location.state?.mode ?? "casual";
  const listingData = storedListingData || location.state?.listingData || null;
  const isSports = mode === "sports";

  /* ---------- shared state ---------- */
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [brand, setBrand] = useState("");
  const [category, setCategory] = useState(isSports ? "Sports Cards" : "");
  const [condition, setCondition] = useState("");
  const [tags, setTags] = useState([]);

  const detectedFrontImage = listingData?.frontImage || "";
  const detectedBackImage = listingData?.backImage || "";
  const detectedSlabImage = listingData?.slabImage || "";
  const identity = listingData?.identity || {};
  const gradeInfo = listingData?.grade || null;
  const identityTitle = identity?.title || "";
  const identityPlayer = identity?.player || identity?.character || "";
  const identityYear = identity?.year || "";
  const identitySet = identity?.setName || identity?.setBrand || identity?.brand || "";
  const identityTeam =
    identity?.team || identity?.franchise || identity?.sport || "";
  const gradeLabel =
    typeof gradeInfo === "string"
      ? gradeInfo
      : gradeInfo?.label || gradeInfo?.value || gradeInfo?.grade || "";
  const slabbedFlag =
    typeof gradeInfo === "object"
      ? gradeInfo?.slabbed ?? gradeInfo?.slabStatus ?? null
      : null;
  const slabStatus =
    typeof slabbedFlag === "boolean" ? (slabbedFlag ? "Slabbed" : "Raw") : "";
  const emptyNotDetected = "Not detected yet";
  const emptyNeedsConfirmation = "Needs confirmation";
  const gradeDisplay =
    gradeLabel || slabStatus ? [gradeLabel, slabStatus].filter(Boolean).join(" • ") : "";

  /* ---------- hydrate ONCE for sports ---------- */
  useEffect(() => {
    if (!isSports || !listingData) return;

    setTitle(listingData.title ?? "");
    setDescription(listingData.notes ?? listingData.description ?? "");
    setBrand(listingData.brand ?? "");
    setPrice(listingData.price ?? "");
    setCondition(listingData.condition ?? "");
    setCategory("Sports Cards");
  }, [isSports, listingData]);

  /* =========================================================
     =============== SPORTS REVIEW LAYOUT =====================
     ========================================================= */
  if (isSports) {
    return (
      <div className="app-wrapper px-6 py-10 max-w-2xl mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="text-left text-sm uppercase tracking-[0.2em] mb-6 opacity-70"
        >
          ← Back
        </button>

        <h1 className="text-center text-3xl mb-10">Single Listing</h1>

        <div className="lux-card mb-10">
          <div className="text-xs uppercase tracking-[0.35em] opacity-60 mb-4">
            Card Identity
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <div className="text-xs uppercase tracking-[0.3em] opacity-60">
                Card Title
              </div>
              <div className="text-lg mt-1">
                {identityTitle || emptyNotDetected}
              </div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-[0.3em] opacity-60">
                Player / Character
              </div>
              <div className="text-lg mt-1">
                {identityPlayer || emptyNotDetected}
              </div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-[0.3em] opacity-60">
                Year
              </div>
              <div className="text-lg mt-1">
                {identityYear || emptyNotDetected}
              </div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-[0.3em] opacity-60">
                Set / Brand
              </div>
              <div className="text-lg mt-1">
                {identitySet || emptyNotDetected}
              </div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-[0.3em] opacity-60">
                Team / Franchise / Sport
              </div>
              <div className="text-lg mt-1">
                {identityTeam || emptyNotDetected}
              </div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-[0.3em] opacity-60">
                Grade / Slab Status
              </div>
              <div className="text-lg mt-1">
                {gradeDisplay || emptyNeedsConfirmation}
              </div>
            </div>
          </div>

          <div className="mt-6">
            <LuxeInput
              label="Condition"
              value={condition}
              onChange={setCondition}
            />
          </div>
        </div>

        {(detectedFrontImage || detectedBackImage || detectedSlabImage) && (
          <div className="lux-card mb-10">
            <div className="text-xs uppercase tracking-[0.35em] opacity-60 mb-4">
              Detected Images
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {detectedFrontImage && (
                <div>
                  <div className="text-[11px] uppercase tracking-[0.3em] opacity-60 mb-2">
                    Front Image
                  </div>
                  <img
                    src={detectedFrontImage}
                    alt="Detected front"
                    className="w-full rounded-2xl border border-white/10 object-cover"
                  />
                </div>
              )}
              {detectedBackImage && (
                <div>
                  <div className="text-[11px] uppercase tracking-[0.3em] opacity-60 mb-2">
                    Back Image
                  </div>
                  <img
                    src={detectedBackImage}
                    alt="Detected back"
                    className="w-full rounded-2xl border border-white/10 object-cover"
                  />
                </div>
              )}
              {detectedSlabImage && (
                <div>
                  <div className="text-[11px] uppercase tracking-[0.3em] opacity-60 mb-2">
                    Slab Image
                  </div>
                  <img
                    src={detectedSlabImage}
                    alt="Detected slab"
                    className="w-full rounded-2xl border border-white/10 object-cover"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        <button
          className="lux-continue-btn w-full py-5 tracking-[0.28em]"
          onClick={() => navigate("/launch")}
        >
          Verify & Lock Listing →
        </button>
      </div>
    );
  }

  /* =========================================================
     =============== CASUAL LISTING LAYOUT =====================
     ========================================================= */
  return (
    <div className="app-wrapper px-6 py-10 max-w-2xl mx-auto">
      <button
        onClick={() => navigate(-1)}
        className="text-left text-sm uppercase tracking-[0.2em] mb-6 opacity-70"
      >
        ← Back
      </button>

      <h1 className="text-center text-3xl mb-10">Single Listing</h1>

      {/* MAGIC FILL — CASUAL ONLY */}
      <div className="mb-10">
        <button className="w-full py-4 rounded-[28px] bg-[#F4E9D5] text-black tracking-[0.2em]">
          Run Magic Fill
        </button>
        <div className="text-center text-xs opacity-60 mt-2">
          1 free Magic Fill per day · Upgrade for unlimited
        </div>
      </div>

      <LuxeInput label="Title" value={title} onChange={setTitle} />
      <LuxeInput label="Description" value={description} onChange={setDescription} />
      <LuxeInput label="Price" value={price} onChange={setPrice} />

      <div className="mb-6">
        <div className="text-sm uppercase opacity-70 mb-2">Category</div>
        <LuxeChipGroup
          options={CATEGORY_OPTIONS}
          value={category}
          onChange={setCategory}
        />
      </div>

      <LuxeInput label="Brand" value={brand} onChange={setBrand} />

      <div className="mb-6">
        <div className="text-sm uppercase opacity-70 mb-2">Condition</div>
        <LuxeChipGroup
          options={CONDITION_OPTIONS}
          value={condition}
          onChange={setCondition}
        />
      </div>

      <div className="mb-10">
        <div className="text-sm uppercase opacity-70 mb-2">Tags</div>
        <LuxeChipGroup
          options={TAG_OPTIONS}
          value={tags}
          multiple
          onChange={setTags}
        />
      </div>

      <button
        className="lux-continue-btn w-full py-5 tracking-[0.28em]"
        onClick={() => navigate("/launch")}
      >
        Verify & Lock Listing →
      </button>
    </div>
  );
}
