import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSportsBatchStore } from "../store/useSportsBatchStore";
import { convertHeicIfNeeded } from "../utils/imageTools";
import { deriveAltTextFromFilename } from "../utils/photoHelpers";
import { db } from "../db/firebase";
import { auth, storage } from "../lib/firebase";
import {
  collection,
  doc,
  increment,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { v4 as uuidv4 } from "uuid";
import { uploadBatchFile } from "../utils/batchUpload";
import { onAuthStateChanged, signInAnonymously } from "firebase/auth";

console.log(
  "🔥 FIREBASE PROJECT ID:",
  import.meta.env.VITE_FIREBASE_PROJECT_ID
);

export default function SportsBatchPrep() {
  const fileInputRef = useRef(null);
  const navigate = useNavigate();
  const { batchItems, batchMeta, setBatchMeta, addCard, updateCard } =
    useSportsBatchStore();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadedPhotos, setUploadedPhotos] = useState([]);
  const currentCardIdRef = useRef(null);
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
        const baseIndex = uploadedPhotos.length;
        for (let i = 0; i < incoming.length; i += 1) {
          const entry = incoming[i];
          const overallIndex = baseIndex + i;
          const cardIndex = Math.floor(overallIndex / 2);
          const side = overallIndex % 2 === 0 ? "front" : "back";
          if (side === "front") {
            const generatedId =
              typeof crypto !== "undefined" && crypto.randomUUID
                ? crypto.randomUUID()
                : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
            currentCardIdRef.current = generatedId;
          }
          if (!(entry.photo.file instanceof File)) {
            console.error("Upload file is not a File", entry.photo.file);
          }
          const { uploadId, downloadUrl } = await uploadBatchFile({
            db,
            storage,
            batchId: currentBatchId,
            file: entry.photo.file,
            side,
            cardId: null,
          });
          await setDoc(doc(db, "batchPhotos", uploadId), {
            batchId: currentBatchId,
            downloadUrl,
            side,
            index: overallIndex,
            cardIndex,
            createdAt: serverTimestamp(),
          });
          const cardId = currentCardIdRef.current;
          if (!cardId) {
            console.error("Missing currentCardIdRef for batch photo", { side });
            continue;
          }
          const imagePayload = { id: uploadId, url: downloadUrl };
          if (side === "front") {
            addCard({
              cardId,
              frontImage: imagePayload,
              backImage: null,
              identity: {},
            });
          } else {
            updateCard(cardId, { backImage: imagePayload });
          }
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
      isUploading,
      prepareEntry,
      setBatchMeta,
      storage,
      uploadedPhotos.length,
    ]
  );

  useEffect(() => {
    const batchId = batchMeta?.id;
    if (!batchId) return;
    console.log("QUERY batchId =", batchId);
    const uploadsQuery = query(
      collection(db, "batchPhotos"),
      where("batchId", "==", batchId),
      orderBy("index")
    );
    const unsubscribe = onSnapshot(
      uploadsQuery,
      (snap) => {
        const resolved = snap.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            url: data.downloadUrl || "",
            side: data.side || "unknown",
          };
        });
        setUploadedPhotos(resolved);
      },
      (err) => {
        console.error("Failed to load batch photos", err);
      }
    );
    return () => unsubscribe();
  }, [batchMeta?.id, db]);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleContinue = async () => {
    try {
      const batchId = batchMeta?.id;
      if (!batchId) {
        alert("No batch ID available.");
        return;
      }
      navigate("/sports-batch-review");
    } catch (err) {
      console.error(err);
      alert("Analysis failed. Please try again.");
    }
  };

  const renderPhoto = (item) => {
    const preview = item.url || "";
    if (!preview) return null;
    return (
      <div key={item.id} className="relative">
        <img
          src={preview}
          alt="Card photo"
          className="w-full aspect-[3/4] object-cover rounded-xl border border-white/10"
        />
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
          Upload multiple photos — we’ll organize them into cards automatically.
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
        </div>

        {uploadedPhotos.length > 0 ? (
          <div className="grid grid-cols-2 gap-4">
            {uploadedPhotos.map(renderPhoto)}
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

        {(uploadedPhotos.length > 0 || batchItems.length > 0) && (
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
