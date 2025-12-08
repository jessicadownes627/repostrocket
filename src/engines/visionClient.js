// Placeholder vision client.
// In production, this should call a secured serverless function (e.g. Netlify)
// that talks to OpenAI Vision and returns JSON text.

export async function runVision(prompt, base64Image) {
  console.warn(
    "runVision is using a placeholder implementation. Wire this to your serverless vision function when ready."
  );

  // Return a safe, empty card payload so UI does not break before backend is wired.
  return JSON.stringify({
    player: "",
    team: "",
    sport: "",
    year: "",
    set: "",
    subset: "",
    parallel: "",
    cardNumber: "",
    jerseyNumber: "",
    rarity: "",
  });
}

