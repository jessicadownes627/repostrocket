import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { v4 as uuidv4 } from "uuid";
import { storage } from "@/lib/firebase";

export async function uploadCardImage(file, type = "front") {
  if (!file) throw new Error("No file provided");

  const id = uuidv4();
  const path = `card-intel/tmp/${id}-${type}.jpg`;
  const storageRef = ref(storage, path);

  await uploadBytes(storageRef, file, {
    contentType: file.type || "image/jpeg",
  });

  return getDownloadURL(storageRef);
}
