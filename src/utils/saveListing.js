export function saveLaunchProgress(listingId, data) {
  try {
    localStorage.setItem(`launch_${listingId}`, JSON.stringify(data));
  } catch (e) {
    console.error("Failed to save launch progress", e);
  }
}

export function loadLaunchProgress(listingId) {
  try {
    const raw = localStorage.getItem(`launch_${listingId}`);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

