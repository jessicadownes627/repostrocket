// Lightweight helpers for editor-level AI improvements

export async function improveTitle(original) {
  try {
    const res = await fetch("/.netlify/functions/editorAI", {
      method: "POST",
      body: JSON.stringify({
        task: "improve-title",
        text: original,
      }),
    });

    const data = await res.json();
    return data.output || original;
  } catch (err) {
    console.error("AI improveTitle failed:", err);
    return original;
  }
}

export async function improveDescription(original, mode = "expand") {
  try {
    const res = await fetch("/.netlify/functions/editorAI", {
      method: "POST",
      body: JSON.stringify({
        task: `description-${mode}`,
        text: original,
      }),
    });

    const data = await res.json();
    return data.output || original;
  } catch (err) {
    console.error("AI improveDescription failed:", err);
    return original;
  }
}

