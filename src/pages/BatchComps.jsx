import { useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { BatchProvider, useBatchStore } from "../store/useBatchStore";
import { useListingStore } from "../store/useListingStore";
import { convertHeicIfNeeded } from "../utils/imageTools";
import { deriveAltTextFromFilename } from "../utils/photoHelpers";

function BatchCompsInner() {
  const fileInputRef = useRef(null);
  const navigate = useNavigate();
  const { batchItems, setBatch, updateBatchItem } = useBatchStore();
  const { setBatchMode } = useListingStore();

  useEffect(() => {
    setBatchMode("sports_cards");
  }, [setBatchMode]);

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
            title: "",
            category: "Sports Cards",
            photos: [frontPhoto],
            secondaryPhotos: [],
            frontImage: frontPhoto,
            backImage: null,
            cornerPhotos: [],
            cardIntel: null,
            cardAttributes: null,
            pricing: null,
            prepComplete: false,
            approvedForAnalysis: false,
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


  const handlePrepCard = (item) => {
    if (!item?.id) return;
    navigate(`/batch-card-prep?cardId=${item.id}`);
  };

  const renderCard = (item) => {
    const preview = item.photos?.[0]?.url || "";
    const backPreview = item.secondaryPhotos?.[0]?.url || "";
    const status = item.prepComplete ? "Prep complete" : "Ready to review";
    const backInputId = `back-upload-${item.id}`;
    const backCandidates = batchItems.filter(
      (candidate) =>
        candidate.id !== item.id &&
        !candidate.isMerged &&
        !candidate.usedAsBack &&
        candidate.photos?.[0]?.url
    );
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
        <div className="text-xs uppercase tracking-[0.3em] text-white/60 mb-1">
          {item.title || "Batch Card"}
        </div>
        <div className="text-sm text-white/80 mb-4">{status}</div>
        {backCandidates.length > 0 && !backPreview && (
          <div className="mb-4">
            <div className="text-[10px] uppercase tracking-[0.3em] text-white/50 mb-2">
              Possible backs
            </div>
            <div className="grid grid-cols-4 gap-2">
              {backCandidates.map((candidate) => (
                <button
                  key={candidate.id}
                  type="button"
                  className="rounded-lg overflow-hidden border border-white/15 hover:border-white/40 transition"
                  onClick={() => {
                    const backPhoto = candidate.photos?.[0];
                    if (!backPhoto) return;
                    updateBatchItem(item.id, {
                      secondaryPhotos: [backPhoto],
                      backImage: backPhoto,
                    });
                    updateBatchItem(candidate.id, {
                      usedAsBack: true,
                      isMerged: true,
                      mergedInto: item.id,
                    });
                  }}
                >
                  <img
                    src={candidate.photos?.[0]?.url}
                    alt={candidate.photos?.[0]?.altText || "Back candidate"}
                    className="w-full h-16 object-cover"
                  />
                </button>
              ))}
            </div>
            <button
              type="button"
              className="mt-3 text-xs uppercase tracking-[0.3em] text-white/60 hover:text-white transition"
              onClick={() => updateBatchItem(item.id, { backImage: null })}
            >
              No back / Skip for now
            </button>
          </div>
        )}
        <button
          type="button"
          className="lux-continue-btn"
          onClick={() => handlePrepCard(item)}
        >
          Prep Card →
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
        <p className="text-center text-white/65 text-sm mb-8">
          Upload photos, then pair backs if available.
        </p>

        <div
          className="lux-upload-zone flex flex-col items-center justify-center cursor-pointer"
          onClick={handleUploadClick}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
        >
          <p className="text-lg opacity-80 mb-2">Upload card photos</p>
          <p className="text-sm opacity-60">JPEG / PNG / HEIC — multiple files supported</p>
          <input
            type="file"
            accept="image/*"
            multiple
            ref={fileInputRef}
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>

        {batchItems.length > 0 ? (
          <>
            <div className="text-xs uppercase tracking-[0.35em] text-white/60 text-center mt-10 mb-4">
              Step 2 — Pair backs (optional)
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {batchItems
                .filter((item) => !item.isMerged && !item.usedAsBack)
                .map((item) => renderCard(item))}
            </div>
          </>
        ) : (
          <div className="py-6 text-center text-sm text-[#d6c7a1]/70">
            No cards loaded yet. Drop photos above to start the batch flow.
          </div>
        )}
      </div>
    </div>
  );
}

export default function BatchComps() {
  return (
    <BatchProvider>
      <BatchCompsInner />
    </BatchProvider>
  );
}
