import { useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useListingStore } from "../store/useListingStore";
import { convertHeicIfNeeded } from "../utils/imageTools";
import "../styles/createListing.css"; // small helpers only

export default function MagicPhotoPrep() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const { setListingField, resetListing } = useListingStore();

  const [previews, setPreviews] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");

  /* ------------------------------------------------------ */
  /*  FILE HANDLING + HEIC CONVERSION                      */
  /* ------------------------------------------------------ */
  const handleFiles = useCallback(
    async (files) => {
      if (!files || files.length === 0) return;

      const list = Array.from(files);
      if (list.length > 1) {
        setUploadMessage("Single Listing supports one photo at a time. Using the first image you selected.");
      } else {
        setUploadMessage("");
      }

      // New item: clear any existing listing data before setting photos
      resetListing();

      const firstOriginal = list[0];
      let processedFile = firstOriginal;
      try {
        processedFile = await convertHeicIfNeeded(firstOriginal);
      } catch (err) {
        console.error("HEIC conversion failed:", err);
      }

      const url = URL.createObjectURL(processedFile);

      setTimeout(() => {
        const img = new Image();
        const commit = () => setPreviews([url]);
        img.onload = commit;
        img.onerror = commit;
        img.src = url;
      }, 0);

      const fileName = processedFile?.name || "";
      const fallbackAlt = fileName
        ? fileName.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ")
        : "item photo";

      setListingField("photos", [
        {
          url,
          altText: fallbackAlt,
          file: processedFile,
        },
      ]);
    },
    [resetListing, setListingField]
  );

  /* ------------------------------------------------------ */
  /*  DRAG & DROP                                            */
  /* ------------------------------------------------------ */
  const handleDrop = async (e) => {
    e.preventDefault();
    setIsDragging(false);
    const dtFiles = e.dataTransfer.files;
    if (dtFiles.length) await handleFiles(dtFiles);
  };

  const handleBrowse = () => fileInputRef.current?.click();

  /* ------------------------------------------------------ */
  /*  CONTINUE → SINGLE LISTING                             */
  /* ------------------------------------------------------ */
  const goNext = () => {
    if (!previews.length) return;
    setTimeout(
      () => navigate("/single-listing", { state: { mode: "casual" } }),
      150
    );
  };

  return (
    <div className="app-wrapper min-h-screen px-6 py-10 flex flex-col relative">

      {/* Emerald glow background layer */}
      <div className="rr-deep-emerald"></div>

      {/* --------------------------------------------- */}
      {/*   HEADER + LINES                              */}
      {/* --------------------------------------------- */}
      <button
        onClick={() => navigate("/dashboard")}
        className="text-left text-sm text-[#E8DCC0] uppercase tracking-[0.2em] mb-4 w-fit hover:opacity-80 transition"
      >
        ← Back
      </button>
      <h1 className="sparkly-header header-glitter text-center text-3xl mb-3">
        Start Your Listing
      </h1>

      {/* Single animated champagne line under the main heading */}
      <div className="magic-cta-bar mb-6" />

      <p className="text-center opacity-65 text-sm mb-6">
        Upload a photo and let Repost Rocket transform it.
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
        <p className="text-lg opacity-80 mb-2">Drop a photo or click to upload</p>
        <p className="text-sm opacity-60 mb-2">Single Listing supports one photo at a time (HEIC / JPEG / PNG)</p>
        {uploadMessage && (
          <p className="text-xs text-[#E8D5A8] tracking-wide">{uploadMessage}</p>
        )}

        <input
          type="file"
          accept="image/*,image/heic,heic"
          className="hidden"
          ref={fileInputRef}
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {/* PREVIEW GRID */}
      {previews.length > 0 && (
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
      )}

      {/* --------------------------------------------- */}
      {/*   CONTINUE CTA BAR                            */}
      {/* --------------------------------------------- */}
      <div className="mt-auto pt-10 relative z-30">
        <button
          onClick={goNext}
          disabled={!previews.length}
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
