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
      const incoming = entries.map((photo) => ({
        id: crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        photo,
      }));

      setBatch([...batchItems, ...incoming]);
    },
    [batchItems, prepareEntry, setBatch]
  );

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleContinue = async () => {
    if (!batchItems.length) return;
    const paired = [];
    for (let i = 0; i < batchItems.length; i += 2) {
      const frontPhoto = batchItems[i]?.photo || null;
      const backPhoto = batchItems[i + 1]?.photo || null;
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
            if (frontCorners.length >= 4) {
              status = "ready";
            }
          }
        } catch (err) {
          console.error("Failed to auto-crop corners", err);
        }
      }

      paired.push({
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
    setBatch(paired);
    navigate("/sports-batch-review");
  };

  const renderPhoto = (item) => {
    const preview = item.photo?.url || "";
    if (!preview) return null;
    return (
      <div key={item.id} className="relative">
        <img
          src={preview}
          alt={item.photo?.altText || "Card photo"}
          className="w-full aspect-[3/4] object-cover rounded-xl border border-white/10"
        />
        <button
          type="button"
          className="absolute top-2 right-2 h-6 w-6 rounded-full bg-black/70 border border-white/20 text-white/70 hover:text-white flex items-center justify-center text-xs"
          aria-label="Remove photo"
          onClick={() => {
            setBatch(batchItems.filter((entry) => entry.id !== item.id));
          }}
        >
          ✕
        </button>
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
          <div className="grid grid-cols-2 gap-4">
            {batchItems.map(renderPhoto)}
          </div>
        ) : (
          <div className="lux-card border border-white/10 p-8 text-center text-white/60">
            Add your photos to begin.
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
