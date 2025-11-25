import heic2any from "heic2any";

export async function convertHeicToJpeg(file) {
  try {
    if (!file.type.includes("heic") && !file.name.toLowerCase().endsWith(".heic")) {
      return file; // Not HEIC — return as-is
    }

    const blob = await heic2any({
      blob: file,
      toType: "image/jpeg",
      quality: 0.92,
    });

    // Turn back into a File object so the rest of your app treats it normally
    return new File([blob], file.name.replace(/\.heic$/i, ".jpg"), {
      type: "image/jpeg",
    });

  } catch (err) {
    console.error("HEIC conversion failed:", err);
    return file;
  }
}
