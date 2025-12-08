// src/pages/Batch.jsx

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useListingStore } from "../store/useListingStore";
import { v4 as uuidv4 } from "uuid";
import { convertHeicToJpeg } from "../utils/heicConverter";

function Batch() {
  const navigate = useNavigate();
  const { setBatchItems } = useListingStore();

  const [photos, setPhotos] = useState([]);
  const [isUploading, setIsUploading] = useState(false);

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

        // HEIC → JPEG conversion
        if (file.type === "image/heic" || file.name.toLowerCase().endsWith(".heic")) {
          const jpegBlob = await convertHeicToJpeg(file);
          previewUrl = URL.createObjectURL(jpegBlob);
        } else {
          previewUrl = URL.createObjectURL(file);
        }

        newPhotos.push({
          id: uuidv4(),
          file,
          preview: previewUrl,
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

    const items = photos.map((p) => ({
      id: p.id,
      photos: [p.preview],   // LaunchDeckBatch-friendly shape
      title: "",
      description: "",
      tags: [],
      price: "",
      condition: "",
      notes: "",
    }));

    setBatchItems(items);
    navigate("/batch-launch", { state: { items } });
  };

  return (
    <div className="min-h-screen bg-black text-white px-6 py-10">
      <h1 className="text-4xl mb-6 font-cinzel text-center tracking-wide">
        Batch Mode
      </h1>

      {/* UPLOAD AREA */}
      <div
        className="
          border border-[#4cc790] border-dashed 
          rounded-2xl 
          p-10 
          text-center 
          max-w-3xl 
          mx-auto 
          cursor-pointer
          shadow-[0_0_25px_rgba(76,199,144,0.25)]
          hover:shadow-[0_0_35px_rgba(76,199,144,0.45)]
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

      {/* THUMBNAIL GRID */}
      {photos.length > 0 && (
        <div className="mt-10 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
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
                  bg-black/60 
                  text-white 
                  rounded-full 
                  w-8 h-8 
                  flex items-center justify-center 
                  border border-[#4cc790]
                  hover:bg-black/80
                  transition
                "
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ADD MORE PHOTOS */}
      {photos.length > 0 && (
        <div className="text-center mt-8">
          <button
            onClick={() => document.getElementById("batchUpload").click()}
            className="
              text-[#E8DCC0] 
              underline 
              text-lg 
              tracking-wide 
              hover:opacity-80 
              transition
            "
          >
            + Add More Photos
          </button>
        </div>
      )}

      {/* CONTINUE */}
      {photos.length > 0 && (
        <div className="text-center mt-10">
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
