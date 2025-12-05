import { db } from "./firebase";
import {
  collection,
  doc,
  setDoc,
  getDocs,
  getDoc,
  serverTimestamp,
} from "firebase/firestore";

/**
 * saveInventoryItem
 *
 * Creates/updates an inventory item for a given user.
 *
 * @param {string} userId
 * @param {Object} magicFillData - Full object returned from MagicFillEngine
 * @param {string[]} imageUrls - Array of image URLs / data URLs
 * @param {string} rawTitle - Original user title (if any)
 * @param {string} [rawNotes] - Optional notes
 */
export async function saveInventoryItem(userId, magicFillData, imageUrls = [], rawTitle = "", rawNotes = "") {
  if (!userId) {
    console.warn("InventoryBrain: saveInventoryItem called without userId. Skipping save.");
    return null;
  }

  try {
    const itemsCol = collection(db, "inventory", userId, "items");
    const itemRef = doc(itemsCol);
    const now = serverTimestamp();

    const payload = {
      userId,
      createdAt: now,
      updatedAt: now,
      images: Array.isArray(imageUrls) ? imageUrls : [],
      magicFillData: magicFillData || null,
      rawTitle: rawTitle || "",
      rawNotes: rawNotes || "",
    };

    await setDoc(itemRef, payload);

    return { id: itemRef.id, ...payload };
  } catch (err) {
    console.error("InventoryBrain: saveInventoryItem failed", err);
    return null;
  }
}

/**
 * getInventory
 *
 * Returns all inventory items for a given user.
 *
 * @param {string} userId
 * @returns {Promise<Array<{id: string} & Object>>}
 */
export async function getInventory(userId) {
  if (!userId) return [];

  try {
    const itemsCol = collection(db, "inventory", userId, "items");
    const snapshot = await getDocs(itemsCol);
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.error("InventoryBrain: getInventory failed", err);
    return [];
  }
}

/**
 * getItem
 *
 * Returns a single inventory item.
 *
 * @param {string} userId
 * @param {string} itemId
 * @returns {Promise<({id: string} & Object) | null>}
 */
export async function getItem(userId, itemId) {
  if (!userId || !itemId) return null;

  try {
    const itemRef = doc(db, "inventory", userId, "items", itemId);
    const snap = await getDoc(itemRef);
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() };
  } catch (err) {
    console.error("InventoryBrain: getItem failed", err);
    return null;
  }
}
