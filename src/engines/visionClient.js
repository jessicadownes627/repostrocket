export async function runVision(prompt, base64Image) {
  try {
    const response = await fetch("/.netlify/functions/cardVision", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt,
        imageBase64: base64Image,
      }),
    });

    const { result } = await response.json();
    return result;
  } catch (err) {
    console.error("Vision client error:", err);
    return "{}";
  }
}
