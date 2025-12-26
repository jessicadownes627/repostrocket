import React from "react";
import { motion, AnimatePresence } from "framer-motion";

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
    title: "Batch Mode is Premium",
    subtitle: "Unlimited + pro prep lives here.",
    description:
      "Free keeps you accurate in single-item mode. Premium unlocks unlimited Batch Mode, bulk edits, and pro-grade time savings.",
    free: ["Accurate single listing flow"],
    premium: [
      "Unlimited Batch Mode",
      "Bulk photo + detail extraction",
      "Designed for pro workflows",
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
  if (!open) return null;

  const copy = featureCopy[reason] || featureCopy.default;

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
                       text-[#E8DCC0] hover:bg-[#CBB78A]/30 transition"
            onClick={() => {
              onClose();
              // send them to settings for upgrade
              window.location.href = "/settings";
            }}
          >
            Upgrade to Premium →
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
