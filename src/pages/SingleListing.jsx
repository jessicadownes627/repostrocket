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
  const {
    listingData: storedListingData,
    analysisInFlight,
    reviewIdentity,
    analysisState,
    requestSportsAnalysis,
  } = useListingStore();

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
  const identityPlayer = reviewIdentity?.player || "";
  const hasIdentityData = reviewIdentity !== null;
  const displayTitle = "";

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
    if (analysisInFlight && !hasIdentityData) {
      return (
        <div className="app-wrapper px-6 py-10 max-w-2xl mx-auto">
          <div className="lux-card">
            <div className="scan-frame">
              {detectedFrontImage && (
                <img
                  src={detectedFrontImage}
                  alt="Card under analysis"
                  className="w-full rounded-2xl border border-white/10 object-cover"
                />
              )}
              <div className="scan-line" />
            </div>
            <div className="text-sm uppercase tracking-[0.3em] opacity-60 mt-6 text-center">
              Analyzing card details…
            </div>
          </div>
        </div>
      );
    }
    return (
      <div className="app-wrapper px-6 py-10 max-w-2xl mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="text-left text-sm uppercase tracking-[0.2em] mb-6 opacity-70"
        >
          ← Back
        </button>

        <h1 className="text-center text-3xl mb-10">Single Listing</h1>

        {hasIdentityData && (
          <div className="lux-card mb-10">
            <div className="text-xs uppercase tracking-[0.35em] opacity-60 mb-4">
              Card Identity
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {identityPlayer && (
                <div>
                  <div className="text-xs uppercase tracking-[0.3em] opacity-60">
                    Player / Character
                  </div>
                  <div className="text-xl mt-1 text-white">{identityPlayer}</div>
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
