import { useState } from "react";
import { useNavigate } from "react-router-dom";

const platforms = [
  "eBay",
  "Mercari",
  "Etsy",
  "Poshmark",
  "Depop",
  "Facebook Marketplace",
  "Kidizen",
  "Vinted",
  "Amazon",
  "Shopify",
];

function Welcome() {
  const [selected, setSelected] = useState(new Set());
  const navigate = useNavigate();

  const togglePlatform = (platform) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(platform) ? next.delete(platform) : next.add(platform);
      return next;
    });
  };

  const handleSelectAll = () => {
    setSelected(new Set(platforms));
  };

  const handleContinue = () => {
    navigate("/create");
  };

  const hasSelection = selected.size > 0;

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>Welcome to RepostRocket</h1>
        <p style={styles.subtitle}>Choose where you want to list your items.</p>
        <div style={styles.list}>
          {platforms.map((platform) => (
            <label key={platform} style={styles.item}>
              <input
                type="checkbox"
                checked={selected.has(platform)}
                onChange={() => togglePlatform(platform)}
                style={styles.checkbox}
              />
              <span style={styles.itemLabel}>{platform}</span>
            </label>
          ))}
        </div>
        <div style={styles.actions}>
          <button onClick={handleSelectAll} style={styles.selectAll}>
            Select All
          </button>
          <button
            onClick={handleContinue}
            style={{
              ...styles.continue,
              opacity: hasSelection ? 1 : 0.5,
              cursor: hasSelection ? "pointer" : "not-allowed",
            }}
            disabled={!hasSelection}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    backgroundColor: "#0b0f0c",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "24px",
  },
  card: {
    background: "#ffffff",
    color: "#0b0f0c",
    borderRadius: "16px",
    padding: "32px",
    maxWidth: "520px",
    width: "100%",
    boxShadow: "0 16px 40px rgba(0,0,0,0.12)",
  },
  title: {
    margin: 0,
    marginBottom: "8px",
    fontSize: "28px",
    fontWeight: 700,
  },
  subtitle: {
    margin: 0,
    marginBottom: "24px",
    color: "#3a3a3a",
  },
  list: {
    display: "grid",
    gap: "12px",
    marginBottom: "24px",
  },
  item: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "10px 12px",
    borderRadius: "10px",
    background: "#f6f7f6",
    border: "1px solid #e4e7e5",
  },
  checkbox: {
    width: "18px",
    height: "18px",
    accentColor: "#0f8a3f",
  },
  itemLabel: {
    fontSize: "16px",
    fontWeight: 600,
  },
  actions: {
    display: "flex",
    justifyContent: "space-between",
    gap: "12px",
  },
  selectAll: {
    flex: 1,
    padding: "12px 16px",
    borderRadius: "10px",
    border: "1px solid #0f8a3f",
    background: "#ffffff",
    color: "#0f8a3f",
    fontWeight: 700,
    cursor: "pointer",
  },
  continue: {
    flex: 1,
    padding: "12px 16px",
    borderRadius: "10px",
    border: "none",
    background: "#0f8a3f",
    color: "#ffffff",
    fontWeight: 700,
    cursor: "pointer",
  },
};

export default Welcome;
