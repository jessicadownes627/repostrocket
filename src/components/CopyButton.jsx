import { useState } from "react";

export default function CopyButton({ text, label = "Copy" }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text || "");
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch (err) {
      console.error("Copy failed", err);
    }
  };

  return (
    <div className="copy-wrapper">
      <button type="button" className="copy-btn" onClick={handleCopy}>
        {label}
      </button>
      {copied && <span className="copy-toast">Copied!</span>}
    </div>
  );
}
