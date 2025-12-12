export async function runMagicFill(listing) {
  try {
    const res = await fetch("/.netlify/functions/magicFill", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(listing),
    });

    if (!res.ok) {
      console.error("Magic Fill error:", await res.text());
      return null;
    }

    const data = await res.json();
    console.log("MAGIC FILL RAW RESPONSE:", data);
    return data;
  } catch (err) {
    console.error("Magic Fill call failed:", err);
    return null;
  }
}
