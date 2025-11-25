import { useListingStore } from "../store/useListingStore";
import { platformTransforms } from "../utils/transforms";
import "../styles/platformPrep.css";

export default function PlatformPrep() {
  const { selectedPlatforms, listingData } = useListingStore();

  return (
    <div className="platform-prep-page">
      <h1 className="prep-title">Your Listing Is Ready</h1>
      <p className="prep-sub">Pick a platform to view its formatted version.</p>

      <div className="prep-grid">
        {selectedPlatforms.map((p) => {
          const key = p.toLowerCase();
          const tx = platformTransforms[key];
          if (!tx) return null;

          const formatted = {
            title: tx.formatTitle(listingData),
            description: tx.formatDescription(listingData),
            category: tx.mapCategory(listingData.category),
            condition: tx.mapCondition(listingData.condition),
            tags: tx.transformTags(listingData),
            shipping: tx.transformShipping(listingData),
          };

          const photoKey = tx.photoKey || key;
          const photos = listingData.resizedPhotos?.[photoKey] || [];

          return (
            <div key={p} className="prep-card">
              <h2>{p.toUpperCase()}</h2>

              {photos.length > 0 && (
                <div className="prep-photo">
                  <img src={photos[0]} alt={`${p} preview`} />
                </div>
              )}

              <div className="prep-field">
                <label>Title</label>
                <textarea readOnly value={formatted.title || ""} />
                <button onClick={() => navigator.clipboard.writeText(formatted.title || "")}>Copy</button>
              </div>

              <div className="prep-field">
                <label>Category</label>
                <input readOnly value={formatted.category || ""} />
              </div>

              <div className="prep-field">
                <label>Condition</label>
                <input readOnly value={formatted.condition || ""} />
              </div>

              <div className="prep-field">
                <label>Description</label>
                <textarea readOnly value={formatted.description || ""} />
                <button onClick={() => navigator.clipboard.writeText(formatted.description || "")}>Copy</button>
              </div>

              <div className="prep-field">
                <label>Tags</label>
                <input readOnly value={(formatted.tags || []).join(", ")} />
                <button onClick={() => navigator.clipboard.writeText((formatted.tags || []).join(", "))}>Copy</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
