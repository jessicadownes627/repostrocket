import { useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useSportsBatchStore } from "../store/useSportsBatchStore";
import { buildCornerPreviewFromEntries } from "../utils/cardIntelClient";
import { convertHeicIfNeeded } from "../utils/imageTools";
import { deriveAltTextFromFilename } from "../utils/photoHelpers";

export default function SportsBatchPrep() {
  const fileInputRef = useRef(null);
  const navigate = useNavigate();
  const { batchItems, setBatch } = useSportsBatchStore();

  const prepareEntry = useCallback(async (file) => {
    const processed = await convertHeicIfNeeded(file);
    const usable = processed instanceof File ? processed : file;
    const url = URL.createObjectURL(usable);
    const altText = deriveAltTextFromFilename(usable?.name) || "card photo";
    return { url, altText, file: usable };
  }, []);

  const splitCornerEntries = useCallback((entries) => {
    const front = [];
    const back = [];
    entries.forEach((entry) => {
      if (entry.side === "Front") front.push(entry);
      if (entry.side === "Back") back.push(entry);
    });
    return { front, back };
  }, []);

  const handleFiles = useCallback(
    async (fileList) => {
      if (!fileList?.length) return;
      const entries = [];
      for (const file of Array.from(fileList)) {
        try {
          const frontPhoto = await prepareEntry(file);
          entries.push(frontPhoto);
        } catch (err) {
          console.error("Failed to prepare card photo", err);
        }
      }

      if (!entries.length) return;
      const incoming = [];
      for (let i = 0; i < entries.length; i += 2) {
        const frontPhoto = entries[i];
        const backPhoto = entries[i + 1] || null;
        let frontCorners = [];
        let backCorners = [];
        let cornerPhotos = [];
        let status = backPhoto ? "needs_attention" : "needs_back";

        if (frontPhoto && backPhoto) {
          try {
            const preview = await buildCornerPreviewFromEntries(frontPhoto, backPhoto);
            if (preview?.entries?.length) {
              const split = splitCornerEntries(preview.entries);
              frontCorners = split.front;
              backCorners = split.back;
              cornerPhotos = preview.entries;
              if (frontCorners.length >= 4 && backCorners.length >= 4) {
                status = "ready";
              }
            }
          } catch (err) {
            console.error("Failed to auto-crop corners", err);
          }
        }

        incoming.push({
          id: crypto.randomUUID
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
          frontImage: frontPhoto,
          backImage: backPhoto,
          photos: frontPhoto ? [frontPhoto] : [],
          secondaryPhotos: backPhoto ? [backPhoto] : [],
          frontCorners,
          backCorners,
          cornerPhotos,
          reviewIdentity: null,
          cardType: "raw",
          status,
        });
      }

      if (incoming.length) {
        setBatch([...batchItems, ...incoming]);
      }
    },
    [batchItems, prepareEntry, setBatch, splitCornerEntries]
  );

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleContinue = () => {
    navigate("/sports-batch-review");
  };

  const renderCard = (item) => {
    const preview = item.photos?.[0]?.url || "";
    const backPreview = item.secondaryPhotos?.[0]?.url || "";
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
            <div className="w-full h-40 rounded-xl border border-dashed border-white/25 flex items-center justify-center text-xs text-white/60">
              Back missing
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-black text-white px-6 py-10">
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
        <p className="text-center text-white/70 text-sm mb-2">
          Select multiple photos — we’ll automatically pair fronts and backs.
        </p>
        <p className="text-center text-white/55 text-sm mb-8">
          You can review everything before listings are created.
        </p>

        <div className="flex flex-col items-center gap-4 mb-10">
          <button
            type="button"
            onClick={handleUploadClick}
            className="lux-continue-btn"
          >
            Select photos
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
            Mobile-first upload
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
