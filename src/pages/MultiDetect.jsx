// src/pages/MultiDetect.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { detectCardsFromImage, cropCards } from "../engines/multiCardDetector";
import { useListingStore } from "../store/useListingStore";

export default function MultiDetect() {
  const [preview, setPreview] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [count, setCount] = useState(0);

  const navigate = useNavigate();
  const { setBatchItems } = useListingStore();

  async function handleUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    const base64 = await fileToBase64(file);
    setPreview(base64);

    setProcessing(true);

    try {
      const rects = await detectCardsFromImage(base64);
      const crops = await cropCards(base64, rects);

      setCount(crops.length);

      const batchItems = crops.map((src, idx) => ({
        id:
          typeof crypto !== "undefined" && crypto.randomUUID
            ? crypto.randomUUID()
            : `card-${Date.now()}-${Math.random()}`,
        photos: [
          {
            url: src,
            altText: `detected card ${idx + 1}`,
          },
        ],
        title: "",
        description: "",
        tags: [],
        price: "",
        condition: "",
        notes: "",
      }));

      setBatchItems(batchItems);
      setProcessing(false);

      navigate("/batch-launch", { state: { items: batchItems } });
    } catch (err) {
      console.error("MultiDetect failed:", err);
      setProcessing(false);
    }
  }

  function fileToBase64(file) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(file);
    });
  }

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <h1 className="text-3xl font-cinzel mb-4 text-[#E8DCC0]">
        Multi-Card Auto Detection
      </h1>

      <input type="file" accept="image/*" onChange={handleUpload} />

      {processing && (
        <div className="mt-4">Detecting cards… please wait…</div>
      )}

      {preview && !processing && (
        <div className="mt-4 opacity-70">
          {count} cards detected. Launching Batch Mode…
        </div>
      )}
    </div>
  );
}
