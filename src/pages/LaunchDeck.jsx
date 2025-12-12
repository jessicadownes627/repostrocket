import { useLocation, useNavigate } from "react-router-dom";
import { useListingStore } from "../store/useListingStore";
import PreviewCard from "../components/PreviewCard";
import { buildPlatformPreview } from "../utils/platformPreview";
import { formatDescriptionByPlatform } from "../utils/formatDescriptionByPlatform";
import "../styles/overrides.css";

export default function LaunchDeck() {
  const location = useLocation();
  const navigate = useNavigate();
  const { listingData } = useListingStore();

  const locationItems = location.state?.items;
  const listings =
    locationItems && locationItems.length
      ? locationItems
      : listingData?.photos?.length
      ? [{ ...listingData }]
      : [];

  const activeListing = listings.length ? listings[0] : null;
  const platformPreview = activeListing
    ? buildPlatformPreview(activeListing)
    : null;

  const platformDescriptions =
    activeListing && platformPreview
      ? formatDescriptionByPlatform({
          ...activeListing,
          description:
            platformPreview.summaryDescription || activeListing.description,
        })
      : null;

  const goBackToEditor = () => navigate("/single-listing");

  return (
    <div className="min-h-screen bg-[#050807] text-[#E8E1D0] px-6 py-10">

      <button
        onClick={() => navigate(-1)}
        className="text-left text-sm text-[#E8DCC0] uppercase tracking-[0.2em] mb-4 w-fit hover:opacity-80 transition"
      >
        ← Back
      </button>

      {/* HEADER */}
      <div className="mb-8">
        <h1 className="text-[30px] font-semibold tracking-tight sparkly-header header-glitter">
          Listing Preview
        </h1>
        <p className="text-sm opacity-70 mt-1 mb-3">
          Preview your listing for each marketplace, copy details, and launch.
        </p>
      </div>

      {/* PREVIEW CARDS */}
      {listings.length === 0 ? (
        <div className="text-sm opacity-60">
          No listing found to preview. Go back and create a listing first.
        </div>
      ) : (
        <div className="space-y-4">
          {["ebay", "poshmark", "mercari"].map((platformKey) => (
            <PreviewCard
              key={platformKey}
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
            />
          ))}
        </div>
      )}
    </div>
  );
}
