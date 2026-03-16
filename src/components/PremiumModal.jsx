export default function PremiumModal({ open, reason, usage, limit, onClose }) {
  void reason;
  void usage;
  void limit;

  if (open) {
    onClose?.();
  }

  return null;
}
