import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/createListing.css";
import { useListingStore } from "../store/useListingStore";
import { generateResizedVariants } from "../utils/imageTools";
import { mockAnalyzePhotos } from "../utils/aiSmartFill";

const shippingOptions = ["buyer pays", "seller pays", "skip"];
const categoryOptions = ["Outerwear", "Tops", "Bottoms", "Dresses", "Shoes", "Accessories", "Home Goods"];
const conditionOptions = ["New", "Like new", "Gently used", "Good", "Fair"];

function CreateListing() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const {
    listingData,
    setListingField,
    addPhotos,
    removePhoto,
    selectedPlatforms,
    resetListing,
    addDraft,
  } = useListingStore();
  const photos = listingData.photos || [];
  const [isDragging, setIsDragging] = useState(false);
  const [showVariants, setShowVariants] = useState(false);
  const [showAIPrompt, setShowAIPrompt] = useState(false);
  const [aiPref, setAiPref] = useState(sessionStorage.getItem("rr_aiPref") || "");
  const [aiSuggestions, setAiSuggestions] = useState(null);
  const [showAiModal, setShowAiModal] = useState(false);

  useEffect(() => {
    if (photos.length > 0 && !sessionStorage.getItem("rr_aiPromptShown")) {
      setShowAIPrompt(true);
    }
  }, [photos.length]);

  const handleFieldChange = (field) => (event) => {
    setListingField(field, event.target.value);
  };

  const readFilesAsDataUrls = async (files) => {
    const incoming = Array.from(files || []);
    const conversions = incoming.map(
      (file) =>
        new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        })
    );
    return Promise.all(conversions);
  };

  const addPhotosWithVariants = async (dataUrls) => {
    const available = Math.max(0, 4 - photos.length);
    const limited = dataUrls.slice(0, available);
    const variantBuckets = { poshmark: [], depop: [], ebay: [], facebook: [], etsy: [] };
    for (const dataUrl of limited) {
      const resized = await generateResizedVariants(dataUrl);
      Object.entries(resized).forEach(([key, val]) => {
        if (variantBuckets[key]) {
          variantBuckets[key].push(val);
        }
      });
    }
    addPhotos(limited, variantBuckets);
  };

  const handleFileChange = async (event) => {
    const dataUrls = await readFilesAsDataUrls(event.target.files);
    await addPhotosWithVariants(dataUrls);
    event.target.value = "";
  };

  const handleDrop = async (event) => {
    event.preventDefault();
    setIsDragging(false);
    const dataUrls = await readFilesAsDataUrls(event.dataTransfer.files);
    await addPhotosWithVariants(dataUrls);
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = () => setIsDragging(false);

  const discardDraft = () => {
    resetListing();
    navigate("/welcome");
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const requiredFilled =
      listingData.title.trim() &&
      listingData.description.trim() &&
      listingData.price !== "" &&
      photos.length > 0;
    if (!requiredFilled) {
      alert("Please add a title, description, price, and at least one photo.");
      return;
    }
    if (!selectedPlatforms.length) {
      alert("Select at least one platform first.");
      navigate("/welcome");
      return;
    }
    const draftPayload = {
      ...listingData,
      selectedPlatforms,
      id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`,
      lastEdited: Date.now(),
    };
    addDraft(draftPayload);
    navigate("/launch");
  };

  const saveDraftOnly = async () => {
    if (!listingData.title.trim()) {
      alert("Add a title before saving a draft.");
      return;
    }
    const draftPayload = {
      ...listingData,
      selectedPlatforms,
      id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`,
      lastEdited: Date.now(),
    };
    addDraft(draftPayload);
    alert("Draft saved.");
  };

  const chooseAiPref = (pref) => {
    sessionStorage.setItem("rr_aiPromptShown", "true");
    sessionStorage.setItem("rr_aiPref", pref);
    setAiPref(pref);
    setShowAIPrompt(false);
  };

  const runSmartFill = async () => {
    if (!photos.length) return;
    const suggestions = await mockAnalyzePhotos(photos);
    setAiSuggestions(suggestions);
    setShowAiModal(true);
  };

  const applyAiSuggestions = () => {
    if (!aiSuggestions) return;
    const { category, condition, description } = aiSuggestions;
    if (category) setListingField("category", category);
    if (condition) setListingField("condition", condition);
    if (description) setListingField("description", description);
    setShowAiModal(false);
  };

  return (
    <div className="create-page">
      <div className="create-shell">
        <div className="create-card">
          <div className="create-header">
            <div>
              <p className="create-eyebrow">Step 2</p>
              <h1>Create Listing</h1>
              <p className="create-subtitle">
                Your listing will be optimized for every marketplace.
              </p>
            </div>
            <span className="create-pill">Step 2</span>
          </div>

          <form className="create-form" onSubmit={handleSubmit}>
            <div className="field">
              <label>Photos (1–4)</label>
              <div
                className={`uploader ${isDragging ? "uploader--dragging" : ""}`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileChange}
                  className="uploader-input"
                />
                <div className="uploader-content">
                  <div className="uploader-icon">⬆️</div>
                  <p>Upload Photos (1–4)</p>
                  <span>Drag & drop or tap to upload</span>
                </div>
              </div>
              {photos.length > 0 && (
                <div className="photo-grid">
                  {photos.map((photo, index) => (
                    <div key={`${index}-${photo?.length || "photo"}`} className="photo-thumb">
                      <img src={photo} alt={`Upload ${index + 1}`} />
                      <button
                        type="button"
                        className="photo-remove"
                        onClick={() => removePhoto(index)}
                        aria-label="Remove photo"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {photos.length > 0 && (
                <div className="variant-toggle">
                  <button type="button" className="ghost-link" onClick={() => setShowVariants(!showVariants)}>
                    {showVariants ? "Hide resized versions" : "Show resized versions"}
                  </button>
                </div>
              )}
              {showVariants && listingData.resizedPhotos && (
                <div className="variant-grid">
                  {Object.entries(listingData.resizedPhotos).map(([variantKey, arr]) =>
                    arr.map((imgSrc, idx) => (
                      <div key={`${variantKey}-${idx}`} className="variant-thumb">
                        <span className="variant-label">
                          {variantKey === "poshmark"
                            ? "Square"
                            : variantKey === "depop"
                            ? "Vertical"
                            : variantKey === "ebay"
                            ? "HD"
                            : "Landscape"}
                        </span>
                        <img src={imgSrc} alt={`${variantKey} ${idx + 1}`} />
                      </div>
                    ))
                  )}
                </div>
              )}
              {showAIPrompt && (
                <div className="ai-prompt">
                  <div>
                    <strong>Use Smart Fill?</strong>
                    <p>I can suggest a category, condition, and description based on your photos.</p>
                  </div>
                  <div className="ai-prompt-actions">
                    <button type="button" className="btn-primary" onClick={() => chooseAiPref("yes")}>
                      Use Smart Fill
                    </button>
                    <button type="button" className="discard-button" onClick={() => chooseAiPref("no")}>
                      Fill Manually
                    </button>
                  </div>
                </div>
              )}
              {!showAIPrompt && photos.length > 0 && (
                <div className="ai-link">
                  <button type="button" className="ghost-link" onClick={runSmartFill}>
                    Run Smart Fill
                  </button>
                </div>
              )}
            </div>

            <div className="field">
              <label>Title</label>
              <input
                type="text"
                value={listingData.title}
                onChange={handleFieldChange("title")}
                placeholder="Vintage denim jacket"
                required
              />
            </div>

            <div className="field">
              <label>Category</label>
              <select value={listingData.category} onChange={handleFieldChange("category")}>
                <option value="">Select category</option>
                {categoryOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label>Condition</label>
              <select value={listingData.condition} onChange={handleFieldChange("condition")}>
                <option value="">Select condition</option>
                {conditionOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label>Price</label>
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                placeholder="0.00"
                className="price-input"
                value={listingData.price}
                onChange={handleFieldChange("price")}
                required
              />
              <p className="helper">You can set different platform-specific prices later.</p>
            </div>

            <div className="field helper-note">Your listing auto-saves as you type.</div>

            <div className="field">
              <label>Shipping</label>
              <div className="radio-group">
                {shippingOptions.map((option) => (
                  <label key={option} className="radio-pill">
                    <input
                      type="radio"
                      name="shipping"
                      value={option}
                      checked={listingData.shipping === option}
                      onChange={handleFieldChange("shipping")}
                    />
                    <span className="cap">{option}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="field">
              <label>Description</label>
              <textarea
                value={listingData.description}
                onChange={handleFieldChange("description")}
                placeholder="Add key details, measurements, and fit."
                required
              />
            </div>

            <div className="actions">
              <button type="button" className="ghost-link discard" onClick={discardDraft}>
                Discard Draft
              </button>
              <button type="button" className="btn-secondary create-cta" onClick={saveDraftOnly}>
                Save Draft
              </button>
              <button type="submit" className="btn-primary create-cta">
                Continue to Launch →
              </button>
              <p className="microcopy">Your listing auto-saves as you type. Next: Launch your listing to all platforms.</p>
            </div>
          </form>
        </div>
      </div>

      {showAiModal && aiSuggestions && (
        <div className="ai-modal">
          <div className="ai-modal-card">
            <h3>Use Smart Fill?</h3>
            <p><strong>Category:</strong> {aiSuggestions.category}</p>
            <p><strong>Condition:</strong> {aiSuggestions.condition}</p>
            <p><strong>Description:</strong> {aiSuggestions.description}</p>
            <div className="ai-modal-actions">
              <button className="btn-primary" type="button" onClick={applyAiSuggestions}>
                Use Smart Fill
              </button>
              <button className="discard-button" type="button" onClick={() => setShowAiModal(false)}>
                Fill Manually
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CreateListing;
