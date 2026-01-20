import { useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useSportsBatchStore } from "../store/useSportsBatchStore";
import { convertHeicIfNeeded } from "../utils/imageTools";
import { deriveAltTextFromFilename } from "../utils/photoHelpers";

export default function SportsBatchPrep() {
  const fileInputRef = useRef(null);
  const navigate = useNavigate();
  const { batchItems, setBatch, updateBatchItem } = useSportsBatchStore();

  const prepareEntry = useCallback(async (file) => {
    const processed = await convertHeicIfNeeded(file);
    const usable = processed instanceof File ? processed : file;
    const url = URL.createObjectURL(usable);
    const altText = deriveAltTextFromFilename(usable?.name) || "card photo";
    return { url, altText, file: usable };
  }, []);

  const handleFiles = useCallback(
    async (fileList) => {
      if (!fileList?.length) return;
      const incoming = [];
      for (const file of Array.from(fileList)) {
        try {
          const frontPhoto = await prepareEntry(file);
          incoming.push({
            id: crypto.randomUUID
              ? crypto.randomUUID()
              : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
            frontImage: frontPhoto,
            backImage: null,
            photos: [frontPhoto],
            secondaryPhotos: [],
            frontCorners: [],
            backCorners: [],
            cornerPhotos: [],
            reviewIdentity: null,
            cardType: "raw",
            status: "needs_back",
          });
        } catch (err) {
          console.error("Failed to prepare card photo", err);
        }
      }

      if (incoming.length) {
        setBatch([...batchItems, ...incoming]);
      }
    },
    [batchItems, prepareEntry, setBatch]
  );

  const handleBackForCard = useCallback(
    async (item, fileList) => {
      if (!item?.id || !fileList?.length) return;
      const file = Array.from(fileList)[0];
      try {
        const backPhoto = await prepareEntry(file);
        updateBatchItem(item.id, {
          secondaryPhotos: [backPhoto],
          backImage: backPhoto,
          status: "ready",
        });
      } catch (err) {
        console.error("Failed to prepare back photo", err);
      }
    },
    [prepareEntry, updateBatchItem]
  );

  const handleDrop = async (event) => {
    event.preventDefault();
    if (event.dataTransfer?.files?.length) {
      await handleFiles(event.dataTransfer.files);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleContinue = () => {
    navigate("/sports-batch-review");
  };

  useEffect(() => {
    const handler = (event) => event.preventDefault();
    window.addEventListener("dragover", handler);
    window.addEventListener("drop", handler);
    return () => {
      window.removeEventListener("dragover", handler);
      window.removeEventListener("drop", handler);
    };
  }, []);

  const renderCard = (item) => {
    const preview = item.photos?.[0]?.url || "";
    const backPreview = item.secondaryPhotos?.[0]?.url || "";
    const backInputId = `back-upload-${item.id}`;
    return (
      <div key={item.id} className="lux-card border border-white/10 p-4 flex flex-col">
        <div className="flex flex-col gap-3 mb-3">
          {preview ? (
            <img
              src={preview}
              alt={item.photos?.[0]?.altText || "Front of card"}
              className="w-full h-40 object-cover rounded-xl border border-white/10"
            />
          ) : (
            <div className="w-full h-40 rounded-xl border border-dashed border-white/15 flex items-center justify-center text-xs text-white/50">
              Front needed
            </div>
          )}
          {backPreview ? (
            <img
              src={backPreview}
              alt={item.secondaryPhotos?.[0]?.altText || "Back of card"}
              className="w-full h-40 object-cover rounded-xl border border-white/10"
            />
          ) : (
            <label
              htmlFor={backInputId}
              className="w-full h-40 rounded-xl border border-dashed border-white/25 flex items-center justify-center text-xs text-[#E8DCC0] cursor-pointer hover:border-white/50 transition"
            >
              Add back of card
            </label>
          )}
          <input
            id={backInputId}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleBackForCard(item, e.target.files)}
          />
        </div>
      </div>
    );
  };

  return (
    <div
      className="min-h-screen bg-black text-white px-6 py-10"
      onDragOver={(event) => event.preventDefault()}
      onDrop={handleDrop}
    >
      <div className="max-w-4xl mx-auto">
        <button
          type="button"
          onClick={() => navigate("/sports-cards")}
          className="text-left text-xs uppercase tracking-[0.3em] text-[#E8DCC0] mb-4 hover:text-white transition"
        >
          ← Back
        </button>
        <h1 className="sparkly-header text-3xl mb-2 text-center">
          Batch Sports Cards
        </h1>
        <p className="text-center text-white/65 text-sm mb-8">
          Upload fronts, then pair backs.
        </p>

        <div className="flex flex-col items-center gap-4 mb-10">
          <button
            type="button"
            onClick={handleUploadClick}
            className="lux-continue-btn"
          >
            Add front photos
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(event) => handleFiles(event.target.files)}
          />
          <div className="text-xs uppercase tracking-[0.3em] text-white/50 text-center">
            Drag & drop works too
          </div>
        </div>

        {batchItems.length > 0 ? (
          <div className="grid gap-6">
            {batchItems.map(renderCard)}
          </div>
        ) : (
          <div className="lux-card border border-white/10 p-8 text-center text-white/60">
            Add your front photos to begin.
          </div>
        )}

        {batchItems.length > 0 && (
          <div className="mt-8">
            <button
              type="button"
              className="lux-continue-btn w-full"
              onClick={handleContinue}
            >
              Continue →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
