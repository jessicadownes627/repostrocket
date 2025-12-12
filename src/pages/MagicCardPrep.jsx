import { useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useListingStore } from "../store/useListingStore";
import { convertHeicIfNeeded } from "../utils/imageTools";
import { deriveAltTextFromFilename } from "../utils/photoHelpers";
import { runMagicFill } from "../utils/runMagicFill";
import { parseMagicFillOutput } from "../engines/MagicFillEngine";
import "../styles/createListing.css"; // still safe to reuse

const fileToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    if (!(file instanceof File)) {
      resolve(null);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else resolve(null);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

export default function MagicCardPrep() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const { setListingField, resetListing } = useListingStore();

  const [previews, setPreviews] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  /* ------------------------------------------------------ */
  /*  SIMPLE CARD FILE HANDLER (no HEIC, no clothes logic)  */
  /* ------------------------------------------------------ */
  const handleFiles = useCallback(
    async (files) => {
      const incoming = Array.from(files || []);
      if (!incoming.length) return;

      resetListing();
      setAnalyzing(false);

      const converted = [];

      for (const file of incoming) {
        try {
          const fixed = await convertHeicIfNeeded(file);
          converted.push(fixed);
        } catch (err) {
          console.error("HEIC conversion failed for card prep:", err);
          converted.push(file);
        }
      }

      const urls = converted.map((f) => URL.createObjectURL(f));

      urls.forEach((url) => {
        const img = new Image();
        const commit = () =>
          setPreviews((prev) => (prev.includes(url) ? prev : [...prev, url]));
        img.onload = commit;
        img.onerror = commit;
        img.src = url;
      });

      const photosWithAlt = urls.map((url, idx) => {
        const file = converted[idx];
        const fallbackAlt =
          deriveAltTextFromFilename(file?.name) || `card photo ${idx + 1}`;
        return { url, altText: fallbackAlt, file };
      });

      setListingField("photos", photosWithAlt);
      setListingField("category", "Sports Cards");

      if (!photosWithAlt.length) return;

      setAnalyzing(true);
      try {
        const primaryPhoto = photosWithAlt[0];
        const photoDataUrl = await fileToDataUrl(primaryPhoto.file);

        const listingPayload = {
          title: "",
          description: "",
          price: "",
          brand: "",
          condition: "",
          category: "Sports Cards",
          size: "",
          tags: [],
          photos: photosWithAlt,
          previousAiChoices: {},
        };

        const requestPayload = {
          listing: listingPayload,
          userCategory: "Sports Cards",
          photoContext: primaryPhoto.altText || "",
          photoDataUrl,
        };

        const ai = await runMagicFill(requestPayload);
        const parsed = parseMagicFillOutput(ai);

        if (parsed?.title?.after) {
          setListingField("title", parsed.title.after);
        }
        if (parsed?.description?.after) {
          setListingField("description", parsed.description.after);
        }
        if (parsed?.price?.after) {
          setListingField("price", parsed.price.after);
        }
        if (Array.isArray(parsed?.tags?.after) && parsed.tags.after.length) {
          setListingField("tags", parsed.tags.after);
        }
        if (parsed?.category_choice) {
          setListingField("category", parsed.category_choice);
        }
      } catch (err) {
        console.error("Magic Fill card prep failed:", err);
      } finally {
        setAnalyzing(false);
      }
    },
    [resetListing, setListingField]
  );

  /* ------------------------------------------------------ */
  /*  DRAG & DROP                                            */
  /* ------------------------------------------------------ */
  const handleDrop = async (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length) await handleFiles(e.dataTransfer.files);
  };

  const handleBrowse = () => fileInputRef.current?.click();

  /* ------------------------------------------------------ */
  /*  CONTINUE → SingleListing (card editor)                 */
  /* ------------------------------------------------------ */
  const goNext = () => {
    if (!previews.length) return;
    setTimeout(() => navigate("/single-listing"), 150);
  };

  return (
    <div className="app-wrapper min-h-screen px-6 py-10 flex flex-col relative">

      {/* Soft charcoal background */}
      <div className="rr-deep-emerald"></div>

      {/* --------------------------------------------- */}
      {/*   HEADER                                       */}
      {/* --------------------------------------------- */}
      <button
        onClick={() => navigate(-1)}
        className="text-left text-sm text-[#E8DCC0] uppercase tracking-[0.2em] mb-4 w-fit hover:opacity-80 transition"
      >
        ← Back
      </button>
      <h1 className="sparkly-header header-glitter text-center text-3xl mb-3">
        Upload Your Sports Card
      </h1>

      <div className="magic-cta-bar mb-6" />

      <p className="text-center opacity-65 text-sm mb-6">
        Add a card photo → Repost Rocket analyzes player, year, set & more.
      </p>

      {/* --------------------------------------------- */}
      {/*   UPLOAD ZONE                                 */}
      {/* --------------------------------------------- */}
      <div
        className={`
          lux-upload-zone mt-4 flex flex-col items-center justify-center cursor-pointer
          ${isDragging ? "lux-upload-hover" : ""}
        `}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={handleBrowse}
      >
        <p className="text-lg opacity-80 mb-2">Drop card photo or click to upload</p>
        <p className="text-sm opacity-60">JPEG / PNG supported</p>

        <input
          type="file"
          accept="image/*"
          className="hidden"
          ref={fileInputRef}
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {/* PREVIEWS */}
      {previews.length > 0 && (
        <>
          {analyzing && (
            <div className="text-center mt-6 text-sm uppercase tracking-[0.35em] text-[#E8DCC0]">
              Analyzing card…
            </div>
          )}
          <div className="mt-6 grid grid-cols-2 gap-4 fade-in relative z-20">
            {previews.map((url, i) => (
              <div
                key={i}
                className="rounded-xl overflow-hidden border border-[rgba(232,213,168,0.25)] bg-black/30"
              >
                <img
                  src={url}
                  alt="preview"
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
        </>
      )}

      {/* --------------------------------------------- */}
      {/*   CONTINUE                                     */}
      {/* --------------------------------------------- */}
      <div className="mt-auto pt-10 relative z-30">
        <button
          onClick={goNext}
          disabled={!previews.length || analyzing}
          className={`
            w-full py-4 text-lg font-semibold rounded-xl
            lux-continue-btn
            ${!previews.length ? "opacity-40 cursor-not-allowed" : ""}
          `}
        >
          Continue →
        </button>
      </div>
    </div>
  );
}
