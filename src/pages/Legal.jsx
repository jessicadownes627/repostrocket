import { Link, useLocation, useNavigate } from "react-router-dom";

const PRIVACY_SECTIONS = [
  {
    title: "What Repost Rocket Collects",
    body:
      "We collect the content you provide in the app, including listing details, uploaded photos, usage events, and purchase status needed to operate premium access.",
  },
  {
    title: "How Images Are Used",
    body:
      "Listing images may be uploaded to our servers and processed by third-party AI providers, including OpenAI, to generate OCR, item analysis, titles, descriptions, and listing suggestions.",
  },
  {
    title: "Storage And Retention",
    body:
      "We store only the data needed to run the product, support your workflow, and debug failures. If you need deletion help, contact us and include the phone number or device details used in the app.",
  },
  {
    title: "Contact And Deletion Requests",
    body:
      "For privacy questions or deletion requests, email support through the contact listed in App Store Connect or the support channel provided with your release.",
  },
];

const TERMS_SECTIONS = [
  {
    title: "Subscription",
    body:
      "Repost Rocket Premium is an auto-renewable monthly subscription that unlocks premium workflows and higher usage limits.",
  },
  {
    title: "Billing",
    body:
      "Payment is charged to your Apple ID when the purchase is confirmed. The subscription renews automatically unless canceled at least 24 hours before the current billing period ends.",
  },
  {
    title: "Managing Or Canceling",
    body:
      "You can manage or cancel your subscription at any time in your App Store account settings after purchase.",
  },
  {
    title: "Use Of Service",
    body:
      "You are responsible for the content you upload and the marketplace listings you publish using the app. Do not upload content you do not have the right to use.",
  },
];

export default function Legal() {
  const navigate = useNavigate();
  const location = useLocation();
  const isPrivacy = location.pathname === "/privacy";
  const title = isPrivacy ? "Privacy Policy" : "Terms of Use";
  const sections = isPrivacy ? PRIVACY_SECTIONS : TERMS_SECTIONS;

  return (
    <div className="min-h-screen bg-[#050807] text-[#E8E1D0] px-6 py-10 relative">
      <div className="rr-deep-emerald"></div>

      <button
        type="button"
        onClick={() => navigate(-1)}
        className="text-left text-sm text-[#E8DCC0] uppercase tracking-[0.2em] mb-6 w-fit hover:opacity-80 transition"
      >
        ← Back
      </button>

      <div className="max-w-2xl mx-auto">
        <p className="text-xs uppercase tracking-[0.3em] opacity-60 mb-3">
          Repost Rocket
        </p>
        <h1 className="text-3xl font-semibold text-[#E8DCC0] mb-4">{title}</h1>
        <p className="text-sm opacity-75 mb-8">
          Effective date: March 10, 2026
        </p>

        <div className="space-y-6 text-sm leading-7 opacity-85">
          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="text-base font-semibold text-[#E8DCC0] mb-2">
                {section.title}
              </h2>
              <p>{section.body}</p>
            </section>
          ))}
        </div>

        <div className="mt-10 text-sm opacity-75">
          <Link className="underline underline-offset-4" to="/privacy">
            Privacy Policy
          </Link>{" "}
          <span className="mx-2">•</span>
          <Link className="underline underline-offset-4" to="/terms">
            Terms of Use
          </Link>
        </div>
      </div>
    </div>
  );
}
