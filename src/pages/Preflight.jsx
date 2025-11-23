export default function Preflight() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0b0f0c",
        color: "#ffffff",
        textAlign: "center",
        padding: "24px",
      }}
    >
      <div
        style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "16px",
          padding: "28px 32px",
          maxWidth: "560px",
          boxShadow: "0 12px 36px rgba(0,0,0,0.3)",
        }}
      >
        <h1 style={{ margin: "0 0 12px" }}>Preflight Checklist</h1>
        <p style={{ margin: "0 0 10px", color: "#c8d2cc" }}>
          You’re almost there. Review your launch steps and open each marketplace when ready.
        </p>
        <p style={{ margin: 0, color: "#8adfb2" }}>Coming soon.</p>
      </div>
    </div>
  );
}
