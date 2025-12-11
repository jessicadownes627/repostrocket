export async function runMagicFill(listing) {
  try {
    const res = await fetch("/.netlify/functions/magicFill", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(listing),
    });

    if (!res.ok) {
      console.error("Magic Fill function error:", await res.text());
      return null;
    }

    return await res.json();
  } catch (err) {
    console.error("Magic Fill function call failed:", err);
    return null;
  }
}
