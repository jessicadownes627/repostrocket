/**
 * Preflight validation engine
 * Used by Preflight.jsx before starting the launch sequence.
 * Generates a list of warnings + errors for the user to confirm.
 */

export const runPreflightChecks = (listing) => {
  const issues = [];

  const l = listing || {};

  // --------------------------------------------------
  // REQUIRED FIELD CHECKS
  // --------------------------------------------------
  const required = ["title", "description", "price", "photos"];

  required.forEach((field) => {
    if (!l[field] || (Array.isArray(l[field]) && l[field].length === 0)) {
      issues.push({
        type: "error",
        field,
        message: `${formatField(field)} is required before launching.`
      });
    }
  });

  // --------------------------------------------------
  // TITLE QUALITY CHECK
  // --------------------------------------------------
  if (l.title && l.title.trim().length < 6) {
    issues.push({
      type: "warning",
      field: "title",
      message: "Your title looks a little short — longer titles rank higher."
    });
  }

  // --------------------------------------------------
  // DESCRIPTION QUALITY CHECK
  // --------------------------------------------------
  if (l.description && l.description.trim().length < 20) {
    issues.push({
      type: "warning",
      field: "description",
      message:
        "Your description seems very short — consider adding more details."
    });
  }

  // --------------------------------------------------
  // PRICE CHECK
  // --------------------------------------------------
  if (l.price && parseFloat(l.price) <= 0) {
    issues.push({
      type: "error",
      field: "price",
      message: "Price must be greater than $0."
    });
  }

  if (l.price && parseFloat(l.price) < 5) {
    issues.push({
      type: "warning",
      field: "price",
      message: "Very low prices can get buried or flagged on some platforms."
    });
  }

  // --------------------------------------------------
  // SHIPPING CHECK
  // --------------------------------------------------
  if (!l.shipping || l.shipping === "unknown") {
    issues.push({
      type: "warning",
      field: "shipping",
      message: "Shipping option not selected — platforms may hide your listing."
    });
  }

  // --------------------------------------------------
  // PHOTO CHECKS
  // --------------------------------------------------
  if (!Array.isArray(l.photos) || l.photos.length < 1) {
    issues.push({
      type: "error",
      field: "photos",
      message: "At least one photo is required before launching."
    });
  } else {
    if (l.photos.length < 3) {
      issues.push({
        type: "warning",
        field: "photos",
        message:
          "Listings with 3+ photos typically get more views and faster sales."
      });
    }
  }

  // --------------------------------------------------
  // TAG QUALITY
  // --------------------------------------------------
  if (!l.tags || clean(l.tags).length === 0) {
    issues.push({
      type: "warning",
      field: "tags",
      message: "Adding keywords can improve discovery on eBay and Etsy."
    });
  }

  return issues;
};

// -----------------------------------------
// Helper to clean values
// -----------------------------------------
const clean = (v) => {
  if (!v) return "";
  if (Array.isArray(v)) return v.join(", ");
  return String(v).trim();
};

// -----------------------------------------
// Convert field name to readable label
// -----------------------------------------
const formatField = (key) => {
  return (
    {
      title: "Title",
      description: "Description",
      price: "Price",
      photos: "Photos",
      tags: "Tags",
      shipping: "Shipping",
    }[key] || key.charAt(0).toUpperCase() + key.slice(1)
  );
};
