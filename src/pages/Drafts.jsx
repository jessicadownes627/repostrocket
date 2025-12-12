import { useNavigate } from "react-router-dom";
import { useListingStore } from "../store/useListingStore";
import { getPhotoUrl } from "../utils/photoHelpers";
import "../styles/drafts.css";

function formatDate(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function DraftCard({ draft, onEdit, onDelete }) {
  const thumb = getPhotoUrl(draft.photos?.[0]);
  return (
    <div className="draft-card">
      <div className="draft-thumb">
        {thumb ? <img src={thumb} alt={draft.title || "Draft"} /> : <div className="draft-placeholder">No photo</div>}
      </div>
      <div className="draft-meta">
        <div className="draft-title">{draft.title || "Untitled draft"}</div>
        <div className="draft-info">
          <span>{draft.category || "No category"}</span>
          {draft.price && <span>${draft.price}</span>}
        </div>
        <div className="draft-date">Last edited: {formatDate(draft.lastEdited)}</div>
      </div>
      <div className="draft-actions">
        <button type="button" className="btn-primary" onClick={() => onEdit(draft.id)}>
          Edit
        </button>
        <button type="button" className="delete-btn" onClick={() => onDelete(draft.id)}>
          Delete
        </button>
      </div>
    </div>
  );
}

export default function Drafts() {
  const navigate = useNavigate();
  const { savedDrafts, loadDraft, deleteDraft } = useListingStore();

  const handleEdit = (id) => {
    const draft = loadDraft(id);
    if (draft) {
      navigate("/prep");
    }
  };

  const handleDelete = (id) => {
    deleteDraft(id);
  };

  return (
    <div className="drafts-page">
      <div className="drafts-shell">
        <div className="drafts-header">
          <h1>Saved Drafts</h1>
          <p>Pick up where you left off.</p>
        </div>
        {savedDrafts.length === 0 ? (
          <div className="drafts-empty">You have no saved drafts yet.</div>
        ) : (
          <div className="drafts-grid">
            {savedDrafts.map((draft) => (
              <DraftCard key={draft.id} draft={draft} onEdit={handleEdit} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
