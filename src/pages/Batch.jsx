// src/pages/Batch.jsx

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useListingStore } from "../store/useListingStore";
import { v4 as uuidv4 } from "uuid";
import { convertHeicToJpeg } from "../utils/heicConverter";
import { deriveAltTextFromFilename } from "../utils/photoHelpers";

function Batch() {
  const navigate = useNavigate();
  const { setBatchItems } = useListingStore();

  const [photos, setPhotos] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const hasPhotos = photos.length > 0;

  // ---------------------------------------
  // HANDLE FILE UPLOAD (HEIC SAFE + MOBILE SAFE)
  // ---------------------------------------
  const handleFiles = async (fileList) => {
    if (!fileList || fileList.length === 0) return;

    setIsUploading(true);

    const newPhotos = [];

    for (const file of fileList) {
      try {
        let previewUrl;
        let finalFile = file;
        let previewAlt = deriveAltTextFromFilename(file.name);

        // HEIC → JPEG conversion
        if (file.type === "image/heic" || file.name.toLowerCase().endsWith(".heic")) {
          const converted = await convertHeicToJpeg(file);
          if (converted instanceof File) {
            finalFile = converted;
            previewUrl = URL.createObjectURL(converted);
            previewAlt = deriveAltTextFromFilename(converted.name);
          } else if (converted && typeof converted === "object" && converted.url) {
            previewUrl = converted.url;
            previewAlt = converted.altText || previewAlt;
          } else {
            previewUrl = URL.createObjectURL(file);
          }
        } else {
          previewUrl = URL.createObjectURL(file);
        }

        newPhotos.push({
          id: uuidv4(),
          file: finalFile,
          preview: previewUrl,
          altText: previewAlt,
        });
      } catch (err) {
        console.error("Failed to load file:", file.name, err);
        // Skip bad files but continue loop
      }
    }

    setPhotos((prev) => [...prev, ...newPhotos]);
    setIsUploading(false);
  };

  const onUploadChange = (e) => {
    const files = Array.from(e.target.files || []);
    handleFiles(files);
  };

  const removePhoto = (id) => {
    setPhotos((prev) => prev.filter((p) => p.id !== id));
  };

  // ---------------------------------------
  // BUILD BATCH ITEMS → GO TO LAUNCH
  // ---------------------------------------
  const handleBuildBatch = () => {
    if (photos.length === 0) return;

    const items = photos.map((p, idx) => ({
      id: p.id,
      photos: [
        {
          url: p.preview,
          altText:
            p.altText ||
            deriveAltTextFromFilename(p.file?.name) ||
            `batch photo ${idx + 1}`,
        },
      ],   // LaunchDeckBatch-friendly shape
      secondaryPhotos: [],
      title: "",
      description: "",
      tags: [],
      price: "",
      condition: "",
      notes: "",
      category: "Sports Cards",
    }));

    setBatchItems(items);
    navigate("/batch-launch", { state: { items } });
  };

  return (
    <div className="min-h-screen bg-black text-white px-6 py-10">
      <button
        onClick={() => navigate(-1)}
        className="text-left text-sm text-[#E8DCC0] uppercase tracking-[0.2em] mb-4 w-fit hover:opacity-80 transition"
      >
        ← Back
      </button>
      <h1 className="text-4xl mb-6 font-cinzel text-center tracking-wide">
        Batch Mode
      </h1>

      {/* UPLOAD AREA */}
      <div className="text-xs uppercase tracking-[0.35em] text-center text-white/60 mb-4">
        Step 1 — Upload Photos
      </div>
      <div
        className="
          border border-[#E8DCC0]/70 border-dashed 
          rounded-2xl 
          p-10 
          text-center 
          max-w-3xl 
          mx-auto 
          cursor-pointer
          shadow-[0_0_30px_rgba(232,220,192,0.22)]
          hover:shadow-[0_0_40px_rgba(232,220,192,0.35)]
          transition
        "
        onClick={() => document.getElementById("batchUpload").click()}
      >
        <p className="text-lg opacity-90">
          <span className="font-semibold text-[#E8DCC0]">Upload Photos</span>
          <br />
          JPG · PNG · HEIC
        </p>

        <input
          id="batchUpload"
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={onUploadChange}
        />
      </div>

      {/* LOADING INDICATOR */}
      {isUploading && (
        <p className="text-center mt-4 text-[#E8DCC0] text-lg">
          Processing photos…
        </p>
      )}

      {!isUploading && hasPhotos && (
        <div className="flex justify-center mt-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/15 bg-black/30 text-[11px] uppercase tracking-[0.3em] text-white/70">
            <span className="w-2 h-2 rounded-full bg-[#4cc790] animate-pulse" />
            Batch ready · {photos.length} card{photos.length > 1 ? "s" : ""} queued
          </div>
        </div>
      )}

      {/* THUMBNAIL GRID */}
      {hasPhotos && (
        <>
          <div className="text-xs uppercase tracking-[0.35em] text-center text-white/60 mt-10 mb-4">
            Step 2 — Review Cards
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
          {photos.map((p) => (
            <div
              key={p.id}
              className="
                relative rounded-xl overflow-hidden 
                shadow-md shadow-emerald-800/40 
                border border-emerald-500/40
              "
            >
              <img
                src={p.preview}
                alt=""
                className="w-full h-40 object-cover"
              />

              <button
                onClick={() => removePhoto(p.id)}
                className="
                  absolute top-2 right-2 
                  bg-black/45 
                  text-white/80 
                  rounded-full px-3 py-1 text-xs
                  border border-white/30
                  hover:bg-black/65
                  transition
                "
              >
                Remove
              </button>
            </div>
          ))}
        </div>
        </>
      )}

      {/* ADD MORE PHOTOS */}
      {hasPhotos && (
        <div className="text-center mt-8">
          <button
            onClick={() => document.getElementById("batchUpload").click()}
            className="
              text-[#E8DCC0] 
              underline 
              text-sm
              tracking-[0.3em]
              hover:opacity-80 
              transition
            "
          >
            + Add More Photos
          </button>
        </div>
      )}

      {/* CONTINUE */}
      {hasPhotos && (
        <div className="text-center mt-10">
          <div className="text-xs uppercase tracking-[0.35em] text-white/60 mb-4">
            Step 3 — Launch Batch
          </div>
          <button
            onClick={handleBuildBatch}
            className="
              px-10 py-4 
              bg-[#E8DCC0] 
              text-black 
              rounded-2xl 
              text-xl 
              font-semibold
              tracking-wide
              shadow-[0_0_20px_rgba(76,199,144,0.35)]
              hover:shadow-[0_0_30px_rgba(76,199,144,0.55)]
              transition
            "
          >
            Continue to Batch Launch →
          </button>
        </div>
      )}
    </div>
  );
}

export default Batch;
