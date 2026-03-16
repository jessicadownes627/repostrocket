import "../styles/paywall.css";

export default function PaywallModal({ open, onClose }) {
  if (open) {
    onClose?.(false);
  }

  return null;
}
