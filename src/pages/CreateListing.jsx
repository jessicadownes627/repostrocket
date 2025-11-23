import { useState } from "react";
import { useNavigate } from "react-router-dom";

const styles = {
  page: {
    minHeight: "100vh",
    backgroundColor: "#0b0f0c",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "24px",
  },
  card: {
    background: "#ffffff",
    color: "#0b0f0c",
    borderRadius: "16px",
    padding: "32px",
    maxWidth: "720px",
    width: "100%",
    boxShadow: "0 16px 40px rgba(0,0,0,0.12)",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "16px",
  },
  title: {
    margin: 0,
    fontSize: "26px",
    fontWeight: 700,
  },
  badge: {
    background: "#0f8a3f",
    color: "#ffffff",
    borderRadius: "999px",
    padding: "6px 12px",
    fontSize: "13px",
    fontWeight: 700,
  },
  subtitle: {
    margin: 0,
    marginBottom: "20px",
    color: "#3a3a3a",
  },
  form: {
    display: "grid",
    gap: "16px",
  },
  label: {
    fontWeight: 700,
    marginBottom: "6px",
  },
  input: {
    width: "100%",
    padding: "12px",
    borderRadius: "10px",
    border: "1px solid #e4e7e5",
    background: "#f6f7f6",
  },
  textarea: {
    width: "100%",
    padding: "12px",
    borderRadius: "10px",
    border: "1px solid #e4e7e5",
    background: "#f6f7f6",
    minHeight: "120px",
    resize: "vertical",
  },
  radioGroup: {
    display: "flex",
    gap: "12px",
    flexWrap: "wrap",
  },
  radioOption: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "10px 12px",
    borderRadius: "10px",
    border: "1px solid #e4e7e5",
    background: "#f6f7f6",
  },
  actions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "12px",
    marginTop: "8px",
  },
  primary: {
    padding: "12px 20px",
    borderRadius: "10px",
    border: "none",
    background: "#0f8a3f",
    color: "#ffffff",
    fontWeight: 700,
    cursor: "pointer",
  },
};

function CreateListing() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: "",
    description: "",
    price: "",
    category: "",
    condition: "",
    shipping: "buyer pays",
    photos: [],
  });

  const handleChange = (field) => (event) => {
    const value =
      field === "photos"
        ? Array.from(event.target.files || [])
        : event.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    navigate("/launch");
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.header}>
          <h1 style={styles.title}>Create Listing</h1>
          <span style={styles.badge}>Step 2</span>
        </div>
        <p style={styles.subtitle}>
          Fill in the details you want to sync across your platforms.
        </p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div>
            <div style={styles.label}>Title</div>
            <input
              style={styles.input}
              type="text"
              value={form.title}
              onChange={handleChange("title")}
              placeholder="Vintage denim jacket"
              required
            />
          </div>

          <div>
            <div style={styles.label}>Description</div>
            <textarea
              style={styles.textarea}
              value={form.description}
              onChange={handleChange("description")}
              placeholder="Add key details, measurements, and fit."
              required
            />
          </div>

          <div>
            <div style={styles.label}>Price</div>
            <input
              style={styles.input}
              type="number"
              min="0"
              step="0.01"
              value={form.price}
              onChange={handleChange("price")}
              placeholder="65.00"
              required
            />
          </div>

          <div>
            <div style={styles.label}>Category</div>
            <input
              style={styles.input}
              type="text"
              value={form.category}
              onChange={handleChange("category")}
              placeholder="Outerwear"
            />
          </div>

          <div>
            <div style={styles.label}>Condition</div>
            <input
              style={styles.input}
              type="text"
              value={form.condition}
              onChange={handleChange("condition")}
              placeholder="Gently used"
            />
          </div>

          <div>
            <div style={styles.label}>Shipping</div>
            <div style={styles.radioGroup}>
              {["buyer pays", "seller pays", "skip"].map((option) => (
                <label key={option} style={styles.radioOption}>
                  <input
                    type="radio"
                    name="shipping"
                    value={option}
                    checked={form.shipping === option}
                    onChange={handleChange("shipping")}
                    style={{ accentColor: "#0f8a3f" }}
                  />
                  <span style={{ textTransform: "capitalize" }}>{option}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <div style={styles.label}>Photos</div>
            <input
              type="file"
              multiple
              onChange={handleChange("photos")}
              style={styles.input}
            />
          </div>

          <div style={styles.actions}>
            <button type="submit" style={styles.primary}>
              Continue to Launch
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateListing;
