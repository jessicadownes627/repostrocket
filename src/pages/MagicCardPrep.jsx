import { useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useListingStore } from "../store/useListingStore";
import "../styles/createListing.css"; // still safe to reuse

export default function MagicCardPrep() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const { setListingField } = useListingStore();

  const [previews, setPreviews] = useState([]);
  const [isDragging, setIsDragging] = useState(false);

  /* ------------------------------------------------------ */
  /*  SIMPLE CARD FILE HANDLER (no HEIC, no clothes logic)  */
  /* ------------------------------------------------------ */
  const handleFiles = useCallback(
    async (files) => {
      const arr = Array.from(files || []);
      const urls = arr.map((f) => URL.createObjectURL(f));

      // Set previews
      urls.forEach((url) => {
        const img = new Image();
        img.onload = () =>
          setPreviews((prev) => (prev.includes(url) ? prev : [...prev, url]));
        img.onerror = img.onload;
        img.src = url;
      });

      // Store photos (card flow)
      setListingField("photos", urls);
    },
    [setListingField]
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
      {/*   CONTINUE                                     */}
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
