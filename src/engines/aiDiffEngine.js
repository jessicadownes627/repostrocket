export function generateAIDiffReport(original = {}, aiSuggested = {}) {
  const report = [];

  const fields = [
    { key: "title", label: "Title" },
    { key: "description", label: "Description" },
    { key: "category", label: "Category" },
    { key: "condition", label: "Condition" },
    { key: "color", label: "Color" },
    { key: "size", label: "Size" },
    { key: "tags", label: "Tags" },
  ];

  fields.forEach(({ key, label }) => {
    const before = original[key] || "";
    const after = aiSuggested[key] || "";

    if ((before || "").toString().trim() !== (after || "").toString().trim()) {
      report.push({
        field: key,
        label,
        before: before || "—",
        after: after || "—",
        reason: generateReasonForField(key),
      });
    }
  });

  return report;
}

function generateReasonForField(key) {
  switch (key) {
    case "title":
      return "AI refined your title for clarity, searchability, and buyer interest.";
    case "description":
      return "AI expanded or cleaned up your description for readability and trust.";
    case "category":
      return "AI matched your item with the most accurate selling category.";
    case "condition":
      return "AI inferred the condition from the photos and your description.";
    case "color":
      return "AI identified the most accurate color based on your title/photos.";
    case "size":
      return "AI selected the clearest size format for buyer expectations.";
    case "tags":
      return "AI added tags commonly used for similar items to boost visibility.";
    default:
      return "AI improved this field based on marketplace best practices.";
  }
}
