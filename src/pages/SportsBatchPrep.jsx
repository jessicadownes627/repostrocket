import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSportsBatchStore } from "../store/useSportsBatchStore";
import { convertHeicIfNeeded } from "../utils/imageTools";
import { deriveAltTextFromFilename } from "../utils/photoHelpers";
import { db } from "../db/firebase";
import { auth, storage } from "../lib/firebase";
import { doc, setDoc, updateDoc, serverTimestamp, increment } from "firebase/firestore";
import { ref, uploadBytes } from "firebase/storage";
import { v4 as uuidv4 } from "uuid";
import { onAuthStateChanged, signInAnonymously } from "firebase/auth";

export default function SportsBatchPrep() {
  const fileInputRef = useRef(null);
  const navigate = useNavigate();
  const { batchItems, draftPhotos, batchMeta, setDraftPhotos, setBatchMeta } =
    useSportsBatchStore();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  useEffect(() => {
    if (!auth.currentUser) {
      signInAnonymously(auth).catch(console.error);
    }
  }, []);

  const waitForAuth = () =>
    new Promise((resolve, reject) => {
      if (auth.currentUser) return resolve(auth.currentUser);
      const unsub = onAuthStateChanged(auth, (user) => {
        if (user) {
          unsub();
          resolve(user);
        }
      });
    });

  const prepareEntry = useCallback(async (file) => {
    const processed = await convertHeicIfNeeded(file);
    const usable = processed instanceof File ? processed : file;
    const url = URL.createObjectURL(usable);
    const altText = deriveAltTextFromFilename(usable?.name) || "card photo";
    return { url, altText, file: usable };
  }, []);

  const handleFiles = useCallback(
    async (fileList) => {
      if (!fileList?.length || isUploading) return;
      const selected = Array.from(fileList);
      if (selected.length > 50) {
        alert("Please select 50 photos or fewer.");
        return;
      }
      const entries = [];
      for (const file of selected) {
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
        removable: true,
      }));

      setDraftPhotos([...(draftPhotos || []), ...incoming]);
      setUploadError("");
      setIsUploading(true);
      const user = await waitForAuth();
      console.log("Signed in as:", user.uid);

      const currentBatchId = batchMeta?.id || uuidv4();
      const batchRef = doc(db, "batches", currentBatchId);
      if (!batchMeta?.id) {
        await setDoc(batchRef, {
          userId: "anonymous",
          createdAt: serverTimestamp(),
          maxUploads: 50,
          totalUploads: 0,
          processedUploads: 0,
          pairedCards: 0,
          status: "uploading",
        });
        setBatchMeta({ id: currentBatchId, status: "uploading" });
      }

      try {
        for (const entry of incoming) {
          const uploadId = uuidv4();
          const storagePath = `batch/${currentBatchId}/uploads/${uploadId}.jpg`;
          const storageRef = ref(storage, storagePath);
          await uploadBytes(storageRef, entry.photo.file, {
            contentType: entry.photo.file?.type || "image/jpeg",
          });
          await setDoc(doc(db, "batches", currentBatchId, "uploads", uploadId), {
            storagePath,
            createdAt: serverTimestamp(),
            status: "pending",
          });
          await updateDoc(batchRef, {
            totalUploads: increment(1),
          });
        }
      } catch (err) {
        console.error("Batch upload failed:", err);
        setUploadError("We couldn’t upload your photos. Please try again.");
      } finally {
        setIsUploading(false);
      }
    },
    [
      batchMeta?.id,
      db,
      draftPhotos,
      isUploading,
      prepareEntry,
      setBatchMeta,
      setDraftPhotos,
      storage,
    ]
  );

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleContinue = () => {
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
        {item.removable && (
          <button
            type="button"
            className="absolute top-2 right-2 h-6 w-6 rounded-full bg-black/70 border border-white/20 text-white/70 hover:text-white flex items-center justify-center text-xs"
            aria-label="Remove photo"
            onClick={() => {
              setDraftPhotos(draftPhotos.filter((entry) => entry.id !== item.id));
            }}
          >
            ✕
          </button>
        )}
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

        {draftPhotos.length > 0 ? (
          <div className="grid grid-cols-2 gap-4">
            {draftPhotos.map(renderPhoto)}
          </div>
        ) : (
          <div className="lux-card border border-white/10 p-8 text-center text-white/60">
            {batchItems.length ? "Cards preserved. Add more photos to continue." : "Add your photos to begin."}
          </div>
        )}
        {isUploading && (
          <div className="mt-6 text-center text-sm text-white/70">
            Uploading photos…
          </div>
        )}
        {uploadError && (
          <div className="mt-4 text-center text-sm text-red-300">
            {uploadError}
          </div>
        )}

        {(draftPhotos.length > 0 || batchItems.length > 0) && (
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
