import React from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  purchaseProSubscription,
  requestProducts,
  restorePurchases,
  useStoreKitProducts,
} from "../utils/storekit";
import SubscriptionDisclosure from "./SubscriptionDisclosure";

const featureCopy = {
  magicFill: {
    title: "Magic Listing Limit",
    subtitle: "Free tier is accurate but single-use.",
    description:
      "Magic listings still run on the free tier, but you only get one precise pass a day. Premium unlocks unlimited Magic runs plus batch-ready workflows.",
    free: ["1 accurate Magic listing per day"],
    premium: [
      "Unlimited Magic listings",
      "Batch + pro workflows",
      "Faster listing flow",
    ],
  },

  batchMode: {
    title: "Batch Mode",
    subtitle: "Limited free access available.",
    description:
      "Free includes limited Batch Mode. Premium unlocks unlimited Batch Mode and faster batch workflows.",
    free: ["Limited Batch Mode access"],
    premium: [
      "Unlimited Batch Mode",
      "Batch workflow speedups",
    ],
  },

  launches: {
    title: "Daily Launch Limit",
    subtitle: "Free tier caps out quickly.",
    description:
      "Free accounts get two precise launches per day. Premium opens unlimited launches, batch routing, and pro marketplace workflows.",
    free: ["2 accurate launches per day"],
    premium: [
      "Unlimited launches everywhere",
      "Batch routing + price assists",
      "Pro workflow priority",
    ],
  },

  // fallback for unknown keys
  default: {
    title: "Premium Feature",
    subtitle: "Unlimited + Batch + Pro workflows.",
    description:
      "Free stays accurate but limited. Premium unlocks unlimited usage, Batch Mode, and every pro workflow we build.",
    free: ["Precise single-use access"],
    premium: [
      "Unlimited everything",
      "Batch + automation tools",
      "Pro workflow updates",
    ],
  },
};

export default function PremiumModal({ open, reason, usage, limit, onClose }) {
  const navigate = useNavigate();
  const { status: productStatus, error: productError, products } =
    useStoreKitProducts();
  const primaryProduct = products[0] || null;
  const isUpgradeReady = productStatus === "ready" && Boolean(primaryProduct);

  const copy = featureCopy[reason] || featureCopy.default;

  React.useEffect(() => {
    if (!open) return;
    if (productStatus === "idle") {
      requestProducts();
    }
  }, [open, productStatus]);

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="bg-[#0A0F0E] border border-[#CBB78A]/30 rounded-2xl p-8 mx-4 max-w-md w-full text-[#E8E1D0] relative"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Title */}
          <h2 className="text-[22px] font-semibold text-[#E8DCC0]">
            {copy.title}
          </h2>
          <p className="mt-1 text-sm opacity-80">{copy.subtitle}</p>

          {/* Description */}
          <p className="mt-4 text-sm opacity-70 leading-relaxed">
            {copy.description}
          </p>

          {/* Usage block */}
          {typeof usage === "number" && typeof limit === "number" && (
            <div className="mt-6 bg-[#0D1311]/70 border border-[#CBB78A]/20 rounded-xl p-3 text-sm">
              <div className="opacity-80">
                Daily usage: {usage}/{limit}
              </div>
            </div>
          )}

          {/* Comparison Table */}
          <div className="mt-6 grid grid-cols-2 text-sm gap-4">
            <div>
              <div className="text-xs uppercase opacity-60 mb-1">Free</div>
              <ul className="space-y-1 opacity-80">
                {copy.free.map((item, i) => (
                  <li key={i}>• {item}</li>
                ))}
              </ul>
            </div>

            <div>
              <div className="text-xs uppercase opacity-60 mb-1">Premium</div>
              <ul className="space-y-1 text-[#E8DCC0]">
                {copy.premium.map((item, i) => (
                  <li key={i}>• {item}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Upgrade button */}
          <button
            className="w-full mt-8 py-3 rounded-xl bg-[#CBB78A]/20 border border-[#CBB78A]/40 
                       text-[#E8DCC0] hover:bg-[#CBB78A]/30 transition disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={async () => {
              const result = await purchaseProSubscription();
              if (!result?.ok) {
                alert(result?.message || "Purchase could not be completed. Please try again.");
                return;
              }
              onClose();
              navigate("/dashboard");
            }}
            disabled={!isUpgradeReady}
          >
            {productStatus === "loading" ? "Loading Subscription…" : "Upgrade to Pro →"}
          </button>

          {productStatus === "ready" && primaryProduct?.displayPrice && (
            <div className="mt-3 text-xs opacity-70 text-center">
              {primaryProduct.displayPrice}
            </div>
          )}

          {productStatus === "error" && (
            <div className="mt-3 text-xs opacity-75 text-center">
              {productError || "Premium is temporarily unavailable. Please try again later."}
            </div>
          )}

          <button
            type="button"
            className="w-full mt-3 text-xs opacity-70 hover:opacity-100 transition underline underline-offset-4"
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

          {productStatus === "error" && (
            <button
              type="button"
              className="w-full mt-2 text-xs opacity-70 hover:opacity-100 transition underline underline-offset-4"
              onClick={() => requestProducts()}
            >
              Retry Loading Subscription
            </button>
          )}

          <SubscriptionDisclosure className="mt-4" />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
