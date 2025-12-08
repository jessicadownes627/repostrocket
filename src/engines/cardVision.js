import { runVision } from "./visionClient";

export async function analyzeImageForCardData(image) {
  const prompt = `
You are an expert sports card grader and identifier.
Extract ONLY this info as JSON:
{
  "player": "",
  "team": "",
  "sport": "",
  "year": "",
  "set": "",
  "subset": "",
  "parallel": "",
  "cardNumber": "",
  "jerseyNumber": "",
  "rarity": ""
}
Keep answers short. Infer if needed. If unknown, use "".
`;

  const base64 = await toBase64Payload(image);

  const result = await runVision(prompt, base64);

  let json;
  try {
    json = JSON.parse(result);
  } catch (e) {
    try {
      json = JSON.parse(
        result.replace(/```json/gi, "").replace(/```/g, "")
      );
    } catch (err) {
      console.error("Card vision JSON parse failed:", err);
      json = {
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
      };
    }
  }

  return json;
}

async function toBase64Payload(image) {
  // If we already have a data URL string, strip the prefix.
  if (typeof image === "string") {
    if (image.startsWith("data:image")) {
      return image.split(",")[1];
    }
    // Fallback: fetch the URL and convert to base64
    try {
      const res = await fetch(image);
      const blob = await res.blob();
      return blobToBase64(blob);
    } catch (err) {
      console.error("Failed to fetch image for cardVision:", err);
      return "";
    }
  }

  // Blob/File case
  if (image instanceof Blob) {
    return blobToBase64(image);
  }

  return "";
}

function blobToBase64(blob) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result || "";
      const [, payload] = String(result).split(",");
      resolve(payload || "");
    };
    reader.readAsDataURL(blob);
  });
}

