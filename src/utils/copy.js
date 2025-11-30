export async function copyText(text) {
  try {
    if (!text) return false;
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error("Clipboard failed:", err);
    return false;
  }
}
