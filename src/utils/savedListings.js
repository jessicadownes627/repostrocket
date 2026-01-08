export function saveListingToLibrary(item) {
  try {
    // Ensure sold fields exist
    if (typeof item.sold !== "boolean") {
      item.sold = false;
    }
    if (!Object.prototype.hasOwnProperty.call(item, "soldPrice")) {
      item.soldPrice = null;
    }
    if (!Object.prototype.hasOwnProperty.call(item, "soldDate")) {
      item.soldDate = null;
    }

    // Stamp the time saved/updated
    item.savedAt = Date.now();

    const raw = localStorage.getItem("rr_library");
    const library = raw ? JSON.parse(raw) : [];

    // Avoid duplicates based on item.id
    const existingIndex = library.findIndex((x) => x.id === item.id);
    if (existingIndex >= 0) {
      library[existingIndex] = item;
    } else {
      library.push(item);
    }

    localStorage.setItem("rr_library", JSON.stringify(library));
  } catch (e) {
    console.error("Error saving to library", e);
  }
}

export function loadListingLibrary() {
  try {
    const raw = localStorage.getItem("rr_library");
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export function deleteListingFromLibrary(id) {
  try {
    const raw = localStorage.getItem("rr_library");
    if (!raw) return;

    const library = JSON.parse(raw);
    const filtered = library.filter((item) => item.id !== id);

    localStorage.setItem("rr_library", JSON.stringify(filtered));
  } catch (e) {
    console.error("Error deleting listing", e);
  }
}

export function sortLibrary(library, method) {
  switch (method) {
    case "newest":
      return [...library].sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));
    case "oldest":
      return [...library].sort((a, b) => (a.savedAt || 0) - (b.savedAt || 0));
    case "high":
      return [...library].sort((a, b) => (b.price || 0) - (a.price || 0));
    case "low":
      return [...library].sort((a, b) => (a.price || 0) - (b.price || 0));
    case "az":
      return [...library].sort((a, b) =>
        (a.title || "").localeCompare(b.title || "")
      );
    default:
      return library;
  }
}

export function setListingTracked(id, tracked) {
  try {
    const raw = localStorage.getItem("rr_library");
    if (!raw) return;
    const library = JSON.parse(raw);
    const updated = library.map((item) =>
      item.id === id ? { ...item, isTracked: tracked } : item
    );
    localStorage.setItem("rr_library", JSON.stringify(updated));
  } catch (e) {
    console.error("Error updating tracking state", e);
  }
}
