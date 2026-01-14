import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import LuxeChipGroup from "../components/LuxeChipGroup";
import LuxeInput from "../components/LuxeInput";
import { useListingStore } from "../store/useListingStore";
import { composeCardTitle } from "../utils/composeCardTitle";
import { getPhotoUrl } from "../utils/photoHelpers";
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

  const detectedFrontImage =
    listingData?.editedPhoto ||
    listingData?.frontImage ||
    getPhotoUrl(listingData?.photos?.[0]) ||
    "";
  const detectedBackImage = listingData?.backImage || "";
  const detectedSlabImage = listingData?.slabImage || "";
  const identityPlayer =
    reviewIdentity?.player ||
    listingData?.identity?.player ||
    listingData?.player ||
    "";
  const identitySetName =
    reviewIdentity?.setName ||
    listingData?.identity?.setName ||
    listingData?.setName ||
    "";
  const identityTeam =
    reviewIdentity?.team ||
    listingData?.identity?.team ||
    listingData?.team ||
    "";
  const identityYear =
    reviewIdentity?.year ||
    listingData?.identity?.year ||
    listingData?.year ||
    "";
  const identitySport =
    reviewIdentity?.sport ||
    listingData?.identity?.sport ||
    listingData?.sport ||
    "";
  const gradeCompany =
    listingData?.gradingCompany ||
    listingData?.cardAttributes?.gradingAuthority ||
    listingData?.cardAttributes?.grading?.authority ||
    "";
  const gradeValue =
    listingData?.gradeValue ||
    listingData?.cardAttributes?.gradeValue ||
    listingData?.cardAttributes?.grading?.value ||
    listingData?.cardAttributes?.grade ||
    "";
  const isSlabbed = reviewIdentity?.isSlabbed === true;
  const showGraded = isSlabbed || reviewIdentity?.graded === true;
  const gradeLabel =
    showGraded && (gradeCompany || gradeValue)
      ? [gradeCompany, gradeValue].filter(Boolean).join(" ")
      : showGraded
      ? "Graded (details pending)"
      : "";
  const displayPlayer =
    identityPlayer && identityPlayer !== identitySetName ? identityPlayer : "";
  const cornersReviewed =
    Array.isArray(listingData?.cornerPhotos) && listingData.cornerPhotos.length > 0;
  const hasIdentityData = reviewIdentity !== null;
  const titleSetName =
    identitySetName && identitySetName !== identityPlayer ? identitySetName : "";
  const displayTitle = composeCardTitle({
    setName: titleSetName,
    player: identityPlayer,
  });

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
    const analysisComplete = !analysisInFlight && hasIdentityData;
    const showScanOverlay = !analysisComplete;
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
          <div className="scan-frame relative w-full max-w-[360px] mx-auto">
            {detectedFrontImage && (
              <img
                src={detectedFrontImage}
                alt="Card under analysis"
                className="w-full max-h-[50vh] rounded-2xl border border-white/10 object-cover"
              />
            )}
            <div
              className="absolute inset-0 rounded-2xl"
              style={{
                background:
                  "linear-gradient(120deg, rgba(255,255,255,0.04), rgba(255,255,255,0))",
                opacity: showScanOverlay ? 1 : 0,
                transition: "opacity 600ms ease",
                pointerEvents: "none",
              }}
            />
            <div
              className="scan-line"
              style={{
                opacity: showScanOverlay ? 1 : 0,
                transition: "opacity 600ms ease",
                animation: showScanOverlay ? undefined : "none",
              }}
            />
          </div>
          {Array.isArray(listingData?.cornerPhotos) &&
            listingData.cornerPhotos.length > 0 && (
              <div className="grid grid-cols-2 gap-3 mt-5">
                {listingData.cornerPhotos.slice(0, 4).map((entry, idx) => (
                  <div
                    key={`corner-${idx}`}
                    className="rounded-xl border border-white/10 bg-black/30 overflow-hidden"
                  >
                    {entry?.url ? (
                      <img
                        src={entry.url}
                        alt={entry?.label || "Corner detail"}
                        className="w-full h-20 object-cover"
                      />
                    ) : (
                      <div className="h-20 flex items-center justify-center text-[10px] opacity-40">
                        No data
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          {!analysisComplete && (
            <div className="text-sm uppercase tracking-[0.3em] opacity-60 mt-6 text-center">
              Analyzing card details…
            </div>
          )}
        </div>

        {analysisComplete && (
          <>
            <div
              className="lux-card mb-10"
              style={{
                opacity: analysisComplete ? 1 : 0,
                transition: "opacity 500ms ease",
              }}
            >
              {displayTitle && (
                <>
                  <div className="text-xs uppercase tracking-[0.35em] opacity-60 mb-3">
                    Card Title
                  </div>
                  <div className="text-2xl text-white mb-6">{displayTitle}</div>
                </>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="text-xs uppercase tracking-[0.3em] opacity-60">
                    Player
                  </div>
                  <div className="text-lg mt-1 text-white">
                    {displayPlayer || <span className="text-white/35">—</span>}
                  </div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-[0.3em] opacity-60">
                    Year
                  </div>
                  <div className="text-lg mt-1 text-white/85">
                    {identityYear || <span className="text-white/35">—</span>}
                  </div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-[0.3em] opacity-60">
                    Set
                  </div>
                  <div className="text-lg mt-1 text-white/85">
                    {identitySetName || <span className="text-white/35">—</span>}
                  </div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-[0.3em] opacity-60">
                    Team
                  </div>
                  <div className="text-lg mt-1 text-white/85">
                    {identityTeam || <span className="text-white/35">—</span>}
                  </div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-[0.3em] opacity-60">
                    Sport
                  </div>
                  <div className="text-lg mt-1 text-white/85">
                    {identitySport || <span className="text-white/35">—</span>}
                  </div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-[0.3em] opacity-60">
                    Condition / Grade
                  </div>
                  <div className="text-lg mt-1 text-white/85">
                    {gradeLabel || <span className="text-white/35">—</span>}
                  </div>
                </div>
              </div>
              {cornersReviewed && (
                <div className="text-xs uppercase tracking-[0.3em] opacity-60 mt-4">
                  Corners reviewed
                </div>
              )}
            </div>

            <button
              className="lux-continue-btn w-full py-5 tracking-[0.28em]"
              onClick={() => navigate("/launch")}
            >
              Verify & Lock Listing →
            </button>
          </>
        )}
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
