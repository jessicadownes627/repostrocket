import { Link } from "react-router-dom";

export default function SubscriptionDisclosure({ className = "" }) {
  return (
    <div className={`text-xs leading-relaxed opacity-70 ${className}`.trim()}>
      <p>
        Auto-renewable monthly subscription. Payment will be charged to your
        Apple ID at confirmation of purchase. Subscription renews automatically
        unless canceled at least 24 hours before the end of the current period.
        Manage or cancel your subscription in your App Store account settings.
      </p>
      <p className="mt-3">
        By continuing, you agree to the{" "}
        <Link className="underline underline-offset-4" to="/terms">
          Terms of Use
        </Link>{" "}
        and{" "}
        <Link className="underline underline-offset-4" to="/privacy">
          Privacy Policy
        </Link>
        .
      </p>
    </div>
  );
}
