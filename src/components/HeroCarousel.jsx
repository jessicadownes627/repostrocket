import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { mapPhotosToUrls } from "../utils/photoHelpers";

const heroMessages = [
  "Your photo is already doing the heavy lifting.",
  "Buyers click photos first — and yours is gorgeous.",
  "This is the shot that sells it.",
  "One clean angle = instant trust. You're doing great.",
];

export default function HeroCarousel({ photos }) {
  const normalizedPhotos = mapPhotosToUrls(photos).filter(Boolean);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showMessage, setShowMessage] = useState(true);
  const messageRef = useRef(null);

  // Rotate motivational messages
  useEffect(() => {
    const interval = setInterval(() => {
      setShowMessage(false);
      setTimeout(() => {
        setShowMessage(true);
      }, 300);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const nextPhoto = () => {
    if (!normalizedPhotos.length) return;
    setCurrentIndex((prev) => (prev + 1) % normalizedPhotos.length);
  };

  const prevPhoto = () => {
    if (!normalizedPhotos.length) return;
    setCurrentIndex((prev) => (prev - 1 + normalizedPhotos.length) % normalizedPhotos.length);
  };

  // Hide the message when user scrolls
  useEffect(() => {
    const handleScroll = () => setShowMessage(false);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (!normalizedPhotos.length) return null;

  return (
    <div
      className="relative w-full overflow-hidden rounded-b-2xl"
      style={{
        height: "340px",
        borderBottom: "1px solid rgba(255, 235, 205, 0.12)",
        boxShadow: "0 15px 60px rgba(0, 150, 100, 0.15)",
      }}
    >
      {/* PHOTO */}
      <img
        src={normalizedPhotos[currentIndex]}
        alt="Listing"
        className="w-full h-full object-cover transition-all duration-500"
      />

      {/* LEFT & RIGHT NAV */}
      {normalizedPhotos.length > 1 && (
        <>
          <button
            type="button"
            onClick={prevPhoto}
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 text-white px-3 py-2 rounded-full backdrop-blur-md hover:bg-black/60"
          >
            ‹
          </button>

          <button
            type="button"
            onClick={nextPhoto}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 text-white px-3 py-2 rounded-full backdrop-blur-md hover:bg-black/60"
          >
            ›
          </button>
        </>
      )}

      {/* MOTIVATION OVERLAY */}
      <AnimatePresence mode="wait">
        {showMessage && (
          <motion.div
            ref={messageRef}
            key={currentIndex}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.45 }}
            className="absolute bottom-4 left-1/2 -translate-x-1/2
                       text-center text-[16px] text-[rgba(255,240,220,0.95)]
                       px-4 py-2 rounded-xl bg-black/35 backdrop-blur-lg"
            style={{
              boxShadow: "0 0 25px rgba(255,235,205,0.25)",
              border: "1px solid rgba(255,235,205,0.35)",
            }}
          >
            {heroMessages[currentIndex % heroMessages.length]}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
