import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { v4 as uuidv4 } from "uuid";

export async function uploadBatchFile({
  db,
  storage,
  batchId,
  file,
  side,
  cardId = null,
}) {
  if (!batchId || !file) {
    throw new Error("Missing batchId or file");
  }

  const uploadId = uuidv4();
  const storagePath = `batch/${batchId}/uploads/${uploadId}.jpg`;
  const storageRef = ref(storage, storagePath);

  await uploadBytes(storageRef, file, {
    contentType: file.type || "image/jpeg",
  });
  const downloadUrl = await getDownloadURL(storageRef);

  await setDoc(doc(db, "batches", batchId, "uploads", uploadId), {
    storagePath,
    createdAt: serverTimestamp(),
    status: "pending",
    side,
    batchId,
    cardId,
  });

  return { uploadId, storagePath, downloadUrl };
}
