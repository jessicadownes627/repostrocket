import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import LuxeChipGroup from "../components/LuxeChipGroup";
import LuxeInput from "../components/LuxeInput";
import "../styles/overrides.css";

const CATEGORY_OPTIONS = ["Sports Cards", "Apparel", "Accessories", "Home Goods", "Other"];
const CONDITION_OPTIONS = ["New with tags", "Like new", "Very good", "Good", "Fair"];
const TAG_OPTIONS = ["Neutral", "Modern", "Minimal", "Classic", "Statement"];

export default function SingleListing() {
  const navigate = useNavigate();
  const location = useLocation();

  const mode = location.state?.mode ?? "casual";
  const listingData = location.state?.listingData ?? null;
  const isSports = mode === "sports";

  /* ---------- shared state ---------- */
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [brand, setBrand] = useState("");
  const [category, setCategory] = useState(isSports ? "Sports Cards" : "");
  const [condition, setCondition] = useState("");
  const [tags, setTags] = useState([]);

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
          <div className="text-xs uppercase tracking-[0.35em] opacity-60 mb-2">
            Review & Confirm Detected Card Data
          </div>

          <LuxeInput
            label="Card Title"
            value={title}
            onChange={setTitle}
            placeholder="Detected card title"
          />

          <div className="mt-6 flex justify-between items-start gap-6">
            <div>
              <div className="text-xs uppercase tracking-[0.3em] opacity-60">
                Card Grade
              </div>
              <div className="text-xl mt-1">
                {listingData?.gradeLabel ?? "Raw card (no slab detected)"}
              </div>
            </div>

            <div className="text-right">
              <div className="text-xs uppercase tracking-[0.3em] opacity-60">
                Condition
              </div>
              <LuxeChipGroup
                options={CONDITION_OPTIONS}
                value={condition}
                onChange={setCondition}
              />
            </div>
          </div>

          <LuxeInput
            label="Card Notes"
            value={description}
            onChange={setDescription}
            placeholder="Detected notes from OCR"
          />
        </div>

        <div className="lux-card mb-10">
          <LuxeInput label="Price" value={price} onChange={setPrice} />
          <LuxeInput label="Brand" value={brand} onChange={setBrand} />
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
