import React from "react";
import { motion, AnimatePresence } from "framer-motion";

const featureCopy = {
  magicFill: {
    title: "Daily Magic Listing Limit",
    subtitle: "You’ve used today’s free Magic listing.",
    description:
      "Free users get 1 premium Magic listing per day. Magic listings auto-extract brand, color, size, and write beautiful descriptions for you.",
    free: ["1 Magic listing per day"],
    premium: ["Unlimited Magic listings", "Full description suite", "Faster workflow"],
  },

  batchMode: {
    title: "Batch Mode is Premium",
    subtitle: "Prep multiple items at once.",
    description:
      "Batch Mode lets you prep entire collections in one flow — photos, titles, descriptions, tags, all in bulk. Serious sellers use Batch Mode to save hours every week.",
    free: ["Single listing flow only"],
    premium: ["Unlimited Batch Mode", "Bulk editing", "Multi-photo smart extraction"],
  },

  launches: {
    title: "Daily Launch Limit",
    subtitle: "You've reached today's launch quota.",
    description:
      "Premium unlocks unlimited launches across all platforms — Poshmark, Mercari, eBay, Depop, Etsy, and more.",
    free: ["2 launches per day"],
    premium: ["Unlimited launches", "Market-optimized price suggestions"],
  },

  // fallback for unknown keys
  default: {
    title: "Premium Feature",
    subtitle: "Unlock the full Repost Rocket experience.",
    description:
      "Premium gives you unlimited access to advanced tools, Magic listings, Batch Mode, and more.",
    free: ["Basic usage only"],
    premium: ["Unlimited access", "All premium features", "Batch Mode", "Premium updates"],
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
