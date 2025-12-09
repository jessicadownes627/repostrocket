import React, { useState } from "react";

export default function MarkAsSoldModal({ item, onClose }) {
  const [price, setPrice] = useState(
    item?.soldPrice != null ? String(item.soldPrice) : ""
  );

  const handleSubmit = () => {
    const numeric = Number(price);
    const updated = {
      ...item,
      sold: true,
      soldPrice: Number.isNaN(numeric) ? null : numeric,
      soldDate: Date.now(),
    };
    onClose(updated);
  };

  return (
    <div className="inventory-modal-backdrop" onClick={() => onClose(null)}>
      <div
        className="inventory-modal-card"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="inventory-modal-title">Mark as Sold</h2>

        <div className="inventory-modal-body">
          <div className="inventory-modal-label">Sold Price</div>
          <input
            type="number"
            className="inventory-modal-input"
            placeholder="e.g., 24.99"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
        </div>

        <div className="inventory-modal-actions">
          <button
            type="button"
            className="inventory-modal-btn secondary"
            onClick={() => onClose(null)}
          >
            Cancel
          </button>
          <button
            type="button"
            className="inventory-modal-btn primary"
            onClick={handleSubmit}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

