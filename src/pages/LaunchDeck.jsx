import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useListingStore } from "../store/useListingStore";
import PreviewCard from "../components/PreviewCard";
import { buildPlatformPreview } from "../utils/platformPreview";
import { formatDescriptionByPlatform } from "../utils/formatDescriptionByPlatform";
import { generateResizedVariants } from "../utils/imageTools";
import { photoEntryToDataUrl } from "../utils/photoHelpers";
import "../styles/overrides.css";

export default function LaunchDeck() {
  const location = useLocation();
  const navigate = useNavigate();
  const { listingData } = useListingStore();
  const [platformImages, setPlatformImages] = useState({});

  const locationItems = location.state?.items;
  const listings =
    locationItems && locationItems.length
      ? locationItems
      : listingData?.photos?.length
      ? [{ ...listingData }]
      : [];

  const activeListing = listings.length ? listings[0] : null;
  const platformPreview = activeListing
    ? buildPlatformPreview(activeListing, platformImages)
    : null;

  const platformDescriptions =
    activeListing && platformPreview
      ? formatDescriptionByPlatform({
          ...activeListing,
          description:
            platformPreview.summaryDescription || activeListing.description,
        })
      : null;

  const [launchToast, setLaunchToast] = useState("");
  const [showReturnBanner, setShowReturnBanner] = useState(false);
  const awaitingReturnRef = useRef(false);

  useEffect(() => {
    const handleFocus = () => {
      if (awaitingReturnRef.current) {
        setShowReturnBanner(true);
        awaitingReturnRef.current = false;
      }
    };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, []);

  useEffect(() => {
    if (!activeListing) {
      setPlatformImages({});
      return;
    }

    let cancelled = false;

    const resolvePrimaryPhotoEntry = () => {
      if (!activeListing) return null;
      const photos = Array.isArray(activeListing.photos)
        ? activeListing.photos
        : [];
      if (photos.length) return photos[0];
      if (activeListing.editedPhoto) {
        return { url: activeListing.editedPhoto };
      }
      if (activeListing.photo) {
        return { url: activeListing.photo };
      }
      return null;
    };

    const prepareImages = async () => {
      const entry = resolvePrimaryPhotoEntry();
      if (!entry) {
        setPlatformImages({});
        return;
      }
      try {
        const dataUrl = await photoEntryToDataUrl(entry);
        if (!dataUrl || cancelled) {
          return;
        }
        const variants = await generateResizedVariants(dataUrl);
        if (cancelled) return;
        setPlatformImages(variants || {});
      } catch (err) {
        console.error("Platform image preparation failed:", err);
        if (!cancelled) {
          setPlatformImages({});
        }
      }
    };

    prepareImages();

    return () => {
      cancelled = true;
    };
  }, [activeListing]);

  useEffect(() => {
    if (!launchToast) return;
    const timer = setTimeout(() => setLaunchToast(""), 3200);
    return () => clearTimeout(timer);
  }, [launchToast]);

  const copyListingForLaunch = async ({ title, description, price }) => {
    const pieces = [];
    if (title) pieces.push(title);
    if (price) {
      const formatted =
        typeof price === "number" ? `$${price}` : String(price);
      pieces.push(`Price: ${formatted}`);
    }
    if (description) {
      if (pieces.length) pieces.push("");
      pieces.push(description);
    }
    const payload = pieces.join("\n");
    if (!payload.trim()) return;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(payload);
      }
    } catch (err) {
      console.warn("Copy failed:", err);
    }
  };

  const handleLaunch = async ({
    label,
    launchUrl,
    title,
    description,
    price,
  }) => {
    if (title || description || price) {
      await copyListingForLaunch({ title, description, price });
      setLaunchToast(`Listing copied — paste it into ${label}.`);
    }
    awaitingReturnRef.current = true;
    setShowReturnBanner(false);
    if (launchUrl) {
      window.open(launchUrl, "_blank", "noopener");
    }
  };

  const goBackToEditor = () =>
    navigate("/single-listing", { state: { mode: "casual" } });

  return (
    <div className="min-h-screen bg-[#050807] text-[#E8E1D0] px-6 py-10">

      <button
        onClick={() => navigate(-1)}
        className="text-left text-sm text-[#E8DCC0] uppercase tracking-[0.2em] mb-4 w-fit hover:opacity-80 transition"
      >
        ← Back
      </button>

      {/* HEADER */}
      <div className="mb-6">
        <h1 className="text-[30px] font-semibold tracking-tight sparkly-header header-glitter">
          Launch Your Listing
        </h1>
        <p className="text-sm opacity-70 mt-1 mb-2">
          Send this listing to any marketplace below. You can launch to one, several, or come back later.
        </p>
        <p className="text-xs opacity-60 mb-4">
          Repost Rocket is not competing with eBay, Mercari, or Poshmark — we simply help each platform receive a clean, ready-to-post listing faster.
        </p>
        <p className="text-xs opacity-50">
          Each marketplace card is opt-in. Choose where to open next; every action runs independently and opens the marketplace in a new tab.
        </p>
      </div>

      {/* PREVIEW CARDS */}
      {listings.length === 0 ? (
        <div className="text-sm opacity-60">
          No listing found to preview. Go back and create a listing first.
        </div>
      ) : (
        <>
          <div className="space-y-8">
            {["ebay", "poshmark", "mercari"].map((platformKey, idx) => (
              <div key={platformKey} className="space-y-8">
                <PreviewCard
                  platform={platformKey}
                  item={activeListing}
                  platformTitle={
                    platformPreview?.titles
                      ? platformPreview.titles[platformKey]
                      : undefined
                  }
                  platformDescription={
                    platformDescriptions
                      ? platformDescriptions[platformKey]
                      : undefined
                  }
                  onEdit={goBackToEditor}
                  isPrimary={idx === 0}
                  platformImage={platformPreview?.preparedImages?.[platformKey]}
                  onLaunch={({ label, launchUrl, title, description, price }) =>
                    handleLaunch({ label, launchUrl, title, description, price })
                  }
                />
                {idx < 2 && <div className="shimmer-divider w-3/4 mx-auto opacity-80" />}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Launch feedback */}
      {launchToast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 bg-black/80 border border-[rgba(232,213,168,0.45)] text-[rgba(248,233,207,0.95)] px-5 py-3 rounded-full shadow-lg text-sm tracking-wide">
          {launchToast}
        </div>
      )}

      {showReturnBanner && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-black/85 border border-[rgba(232,213,168,0.45)] text-[rgba(248,233,207,0.95)] px-6 py-4 rounded-2xl shadow-2xl w-[min(420px,90vw)]">
          <div className="text-sm tracking-wide mb-3">
            Listing copied — finish it in the marketplace and jump back in.
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              className="flex-1 lux-continue-btn text-xs tracking-[0.25em] py-3"
              onClick={() => {
                setShowReturnBanner(false);
                goBackToEditor();
              }}
            >
              Finish Listing
            </button>
            <button
              className="flex-1 lux-quiet-btn text-xs tracking-[0.25em] py-3"
              onClick={() => {
                setShowReturnBanner(false);
                navigate("/prep");
              }}
            >
              Launch Another
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
