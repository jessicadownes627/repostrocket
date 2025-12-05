import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDocs,
  getDoc,
  serverTimestamp,
} from "firebase/firestore";

let dbInstance = null;

function getFirebaseConfig() {
  return {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  };
}

function getDb() {
  if (dbInstance) return dbInstance;

  const config = getFirebaseConfig();

  if (!config.projectId) {
    console.warn("InventoryBrain: Firebase config missing (VITE_FIREBASE_PROJECT_ID). Skipping Firestore.");
    return null;
  }

  const apps = getApps();
  const app = apps.length ? getApp() : initializeApp(config);
  dbInstance = getFirestore(app);
  return dbInstance;
}

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
  const db = getDb();
  if (!db) return null;
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
  const db = getDb();
  if (!db || !userId) return [];

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
  const db = getDb();
  if (!db || !userId || !itemId) return null;

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

