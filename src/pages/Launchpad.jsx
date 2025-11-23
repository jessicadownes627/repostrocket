import { useState } from "react";
import LaunchModal from "../components/LaunchModal";

const initialPlatforms = [
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

const platformUrls = {
  "eBay": "https://www.ebay.com/sl/sell",
  "Mercari": "https://www.mercari.com/sell",
  "Etsy": "https://www.etsy.com/your/shops/me/dashboard/listings/new",
  "Poshmark": "https://poshmark.com/create-listing",
  "Depop": "https://www.depop.com/sell/",
  "Facebook Marketplace": "https://www.facebook.com/marketplace/create/item",
  "Kidizen": "https://www.kidizen.com/sell",
  "Vinted": "https://www.vinted.com/items/new",
  "Amazon": "https://sellercentral.amazon.com/inventory",
  "Shopify": "https://shopify.com/login"
};

function Launchpad() {
  const [activePlatform, setActivePlatform] = useState(null);
  const [posted, setPosted] = useState({});

  const openModal = (platform) => {
    setActivePlatform(platform);
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>Launch Your Listing 🚀</h1>
        <p style={styles.subtitle}>
          Push your listing live to each platform when you are ready.
        </p>
        <div style={styles.list}>
          {initialPlatforms.map((platform) => {
            const status = posted[platform] ? "Posted" : "Ready";
            return (
              <div key={platform} style={styles.item}>
                <div>
                  <div style={styles.itemName}>{platform}</div>
                  <div
                    style={{
                      ...styles.badge,
                      background: status === "Posted" ? "#0f8a3f" : "#f6f7f6",
                      color: status === "Posted" ? "#ffffff" : "#3a3a3a",
                    border:
                      status === "Posted"
                        ? "1px solid #0f8a3f"
                        : "1px solid #e4e7e5",
                    }}
                  >
                    {status}
                  </div>
                </div>
                <button
                  className="btn-primary"
                  onClick={() => openModal(platform)}
                  disabled={posted[platform]}
                  style={{
                    ...styles.launchButton,
                    opacity: status === "Posted" ? 0.6 : 1,
                    cursor: status === "Posted" ? "not-allowed" : "pointer",
                  }}
                >
                  {posted[platform] ? "Posted" : "Launch 🚀"}
                </button>
              </div>
            );
          })}
        </div>
      </div>
      <LaunchModal
        platform={activePlatform}
        onClose={() => setActivePlatform(null)}
       onLaunch={() => {
  window.open(platformUrls[activePlatform], "_blank");
  setPosted((prev) => ({ ...prev, [activePlatform]: true }));
  setActivePlatform(null);
}}

      />
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
    maxWidth: "720px",
    width: "100%",
    boxShadow: "0 16px 40px rgba(0,0,0,0.12)",
  },
  title: {
    margin: 0,
    fontSize: "28px",
    fontWeight: 800,
    marginBottom: "8px",
  },
  subtitle: {
    margin: 0,
    color: "#3a3a3a",
    marginBottom: "20px",
  },
  list: {
    display: "grid",
    gap: "12px",
  },
  item: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "12px 14px",
    borderRadius: "12px",
    background: "#f6f7f6",
    border: "1px solid #e4e7e5",
  },
  itemName: {
    fontWeight: 700,
    marginBottom: "6px",
  },
  badge: {
    display: "inline-block",
    padding: "6px 10px",
    borderRadius: "10px",
    fontSize: "12px",
    fontWeight: 700,
  },
  launchButton: {
    padding: "10px 16px",
    borderRadius: "10px",
    border: "none",
    background: "#0f8a3f",
    color: "#ffffff",
    fontWeight: 700,
  },
};

export default Launchpad;
