import React from "react";
import "../styles/paywall.css";
import {
  purchaseProSubscription,
  requestProducts,
  restorePurchases,
  useStoreKitProducts,
} from "../utils/storekit";
import SubscriptionDisclosure from "./SubscriptionDisclosure";

export default function PaywallModal({ open, onClose }) {
  const { status: productStatus, error: productError, products } =
    useStoreKitProducts();
  const primaryProduct = products[0] || null;
  const isUpgradeReady = productStatus === "ready" && Boolean(primaryProduct);

  React.useEffect(() => {
    if (!open) return;
    if (productStatus === "idle") {
      requestProducts();
    }
  }, [open, productStatus]);

  if (!open) return null;

  return (
    <div className="paywall-backdrop">
      <div className="paywall-card">
        <h2 className="paywall-title">Unlock Repost Rocket Premium</h2>
        <p className="paywall-sub">
          Get unlimited Smart Fill, unlimited Launches, and advanced review access.
        </p>

        <ul className="paywall-features">
          <li>Unlimited Launch Deck access</li>
          <li>Unlimited Smart Fill</li>
          <li>Full listing review &amp; scoring</li>
          <li>Unlimited photo badges</li>
        </ul>

        <button
          className="paywall-upgrade-btn"
          onClick={async () => {
            const result = await purchaseProSubscription();
            if (!result?.ok) {
              alert(result?.message || "Purchase could not be completed. Please try again.");
              return;
            }
            onClose(true);
          }}
          disabled={!isUpgradeReady}
        >
          {productStatus === "loading" ? "Loading Subscription…" : "Upgrade Now"}
        </button>

        {productStatus === "ready" && primaryProduct?.displayPrice && (
          <div className="mt-2 text-xs opacity-70 text-center">
            {primaryProduct.displayPrice}
          </div>
        )}

        {productStatus === "error" && (
          <div className="mt-2 text-xs opacity-75 text-center">
            {productError || "Premium is temporarily unavailable. Please try again later."}
          </div>
        )}

        <button
          className="paywall-cancel-btn"
          onClick={async () => {
            const result = await restorePurchases();
            if (!result?.ok) {
              alert(result?.message || "Restore could not be completed. Please try again.");
              return;
            }
          }}
        >
          Restore Purchases
        </button>

        <button className="paywall-cancel-btn" onClick={() => onClose(false)}>
          Not now
        </button>

        {productStatus === "error" && (
          <button className="paywall-cancel-btn" onClick={() => requestProducts()}>
            Retry Loading Subscription
          </button>
        )}

        <SubscriptionDisclosure className="mt-4" />
      </div>
    </div>
  );
}
