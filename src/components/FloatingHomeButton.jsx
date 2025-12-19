import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";

export default function FloatingHomeButton() {
  const navigate = useNavigate();

  return createPortal(
    <button
      onClick={() => navigate("/")}
      style={{
        position: "fixed",
        bottom: "max(env(safe-area-inset-bottom, 16px), 20px)",
        right: "max(env(safe-area-inset-right, 16px), 20px)",
        zIndex: 2147483647,
        padding: "14px 18px",
        borderRadius: "999px",
        background: "#000",
        color: "#fff",
        fontWeight: 600,
        border: "1px solid rgba(255,255,255,0.25)",
        boxShadow: "0 12px 30px rgba(0,0,0,0.4)",
      }}
    >
      ← Home
    </button>,
    document.body
  );
}
