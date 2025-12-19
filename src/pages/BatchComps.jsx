import { useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { BatchProvider, useBatchStore } from "../store/useBatchStore";
import { useListingStore } from "../store/useListingStore";
import { convertHeicIfNeeded } from "../utils/imageTools";
import { deriveAltTextFromFilename } from "../utils/photoHelpers";

function BatchCompsInner() {
  const fileInputRef = useRef(null);
  const navigate = useNavigate();
  const { batchItems, setBatch } = useBatchStore();
  const { setBatchMode, resetListing, setListing } = useListingStore();

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
            cornerPhotos: [],
            cardIntel: null,
            cardAttributes: null,
            pricing: null,
            prepComplete: false,
            approvedForAnalysis: false,
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
    if (!item) return;
    resetListing("sports_cards");
    setListing({
      category: "Sports Cards",
      photos: item.photos || [],
      secondaryPhotos: item.secondaryPhotos || [],
      cornerPhotos: item.cornerPhotos || [],
      cardIntel: item.cardIntel || null,
      cardAttributes: item.cardAttributes || null,
      pricing: item.pricing || null,
      title: item.title || "",
    });
    navigate("/card-prep");
  };

  const renderCard = (item) => {
    const preview = item.photos?.[0]?.url || "";
    const status = item.prepComplete ? "Prep complete" : "Needs prep";
    return (
      <div key={item.id} className="lux-card border border-white/10 p-4 flex flex-col">
        {preview && (
          <img
            src={preview}
            alt={item.photos?.[0]?.altText || "Card preview"}
            className="w-full h-56 object-cover rounded-xl mb-3 border border-white/10"
          />
        )}
        <div className="text-xs uppercase tracking-[0.3em] text-white/60 mb-1">
          {item.title || "Batch Card"}
        </div>
        <div className="text-sm text-white/80 mb-4">{status}</div>
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
          Upload front photos for each card. Then prep them one-by-one using the Magic
          Card Studio.
        </p>

        <div
          className="lux-upload-zone flex flex-col items-center justify-center cursor-pointer"
          onClick={handleUploadClick}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
        >
          <p className="text-lg opacity-80 mb-2">Drop card photos or tap to upload</p>
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-8">
            {batchItems.map((item) => renderCard(item))}
          </div>
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
