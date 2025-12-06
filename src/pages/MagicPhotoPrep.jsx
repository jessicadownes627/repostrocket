import { useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useListingStore } from "../store/useListingStore";
import { convertHeicToJpeg } from "../utils/heicConverter";
import "../styles/createListing.css"; // small helpers only

export default function MagicPhotoPrep() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const { setListingField } = useListingStore();

  const [previews, setPreviews] = useState([]);
  const [isDragging, setIsDragging] = useState(false);

  /* ------------------------------------------------------ */
  /*  FILE HANDLING + HEIC CONVERSION                      */
  /* ------------------------------------------------------ */
  const handleFiles = useCallback(
    async (files) => {
      const converted = [];

      for (const file of files || []) {
        // HEIC → JPEG
        if (file.type === "image/heic" || file.name?.toLowerCase().endsWith(".heic")) {
          try {
            const jpegBlob = await convertHeicToJpeg(file);
            if (jpegBlob) {
              const jpegFile = new File(
                [jpegBlob],
                file.name.replace(/\.heic$/i, ".jpg"),
                { type: "image/jpeg" }
              );
              converted.push(jpegFile);
            } else {
              console.warn("HEIC conversion returned no blob, using original.");
              converted.push(file);
            }
          } catch (err) {
            console.error("HEIC conversion failed:", err);
            converted.push(file);
          }
        } else {
          converted.push(file);
        }
      }

      // Generate fresh object URLs once for this batch
      const urls = converted.map((f) => URL.createObjectURL(f));

      // PREVIEW URLs — FIX for Chrome race condition + preload
      setTimeout(() => {
        urls.forEach((url) => {
          const img = new Image();
          const commit = () => {
            setPreviews((prev) =>
              prev.includes(url) ? prev : [...prev, url]
            );
          };
          img.onload = commit;
          img.onerror = commit;
          img.src = url;
        });
      }, 0);

      // STORE PHOTOS — always save fresh URLs
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
    const dtFiles = e.dataTransfer.files;
    if (dtFiles.length) await handleFiles(dtFiles);
  };

  const handleBrowse = () => fileInputRef.current?.click();

  /* ------------------------------------------------------ */
  /*  CONTINUE → SINGLE LISTING                             */
  /* ------------------------------------------------------ */
  const goNext = () => {
    if (!previews.length) return;
    setTimeout(() => navigate("/single-listing"), 150);
  };

  return (
    <div className="app-wrapper min-h-screen px-6 py-10 flex flex-col relative">

      {/* Emerald glow background layer */}
      <div className="rr-deep-emerald"></div>

      {/* --------------------------------------------- */}
      {/*   HEADER + LINES                              */}
      {/* --------------------------------------------- */}
      <h1 className="sparkly-header header-glitter text-center text-3xl mb-3">
        Start Your Magic Listing
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
        <p className="text-lg opacity-80 mb-2">Drop photos or click to upload</p>
        <p className="text-sm opacity-60">HEIC / JPEG / PNG supported</p>

        <input
          type="file"
          accept="image/*,image/heic,heic"
          multiple
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
