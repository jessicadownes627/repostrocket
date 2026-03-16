import { useNavigate } from "react-router-dom";
import "../styles/createListing.css";

export default function Premium() {
  const navigate = useNavigate();

  return (
    <div className="app-wrapper min-h-screen px-6 py-10 flex flex-col relative">
      <div className="rr-deep-emerald"></div>

      <button
        onClick={() => navigate(-1)}
        className="text-left text-sm text-[#E8DCC0] uppercase tracking-[0.2em] mb-4 w-fit hover:opacity-80 transition"
      >
        ← Back
      </button>

      <h1 className="sparkly-header header-glitter text-center text-3xl mb-3">
        Premium Unavailable
      </h1>
      <div className="magic-cta-bar mb-6" />
      <div className="mt-6 space-y-6">
        <p className="text-center text-sm opacity-70">
          Premium subscriptions are temporarily hidden while the app is under review.
        </p>
        <button
          type="button"
          className="w-full py-4 text-lg font-semibold rounded-xl lux-continue-btn"
          onClick={() => navigate("/dashboard")}
        >
          Return to Dashboard
        </button>
      </div>
    </div>
  );
}
