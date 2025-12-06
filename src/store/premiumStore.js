// -------------------------------------------------------
//  PERMANENT PREMIUM OVERRIDE (Jess + Husband + Devices)
// -------------------------------------------------------

export const PHONE_KEY = "rr_user_phone";
export const PREMIUM_KEY = "rr_is_premium";

// Jess & Husband – always VIP
const OVERRIDE_NUMBERS = [
  "15164104363", // Jess
  "17189082021", // Husband
];

// Device-specific permanent IDs (desktops, laptops, tablets)
const OVERRIDE_DEVICES = [
  "jessicas-mac-mini",
  "jessicas-macbook",
  "jessicas-desktop",
  "jess-ipad",
];

// Helper to read device “fingerprint”
const getDeviceId = () => {
  try {
    return (
      window?.navigator?.userAgentData?.platform?.toLowerCase() ||
      window?.navigator?.platform?.toLowerCase() ||
      ""
    );
  } catch {
    return "";
  }
};

// Main premium check
export const getPremiumStatus = () => {
  // 1. Dev override (never remove)
  if (localStorage.getItem("rr_dev_premium") === "true") return true;

  // 2. Device override (always premium)
  const device = getDeviceId();
  if (OVERRIDE_DEVICES.some((d) => device.includes(d))) return true;

  // 3. Phone override (always premium)
  const savedPhone = localStorage.getItem(PHONE_KEY);
  if (savedPhone && OVERRIDE_NUMBERS.includes(savedPhone)) {
    return true;
  }

  // 4. Normal premium check
  return localStorage.getItem(PREMIUM_KEY) === "premium";
};

// Keep setters for existing code (e.g., PaywallModal)
export const setPremiumStatus = (value) => {
  if (value) {
    localStorage.setItem(PREMIUM_KEY, "premium");
  } else {
    localStorage.removeItem(PREMIUM_KEY);
  }
};

export const setUserPhone = (phone) => {
  localStorage.setItem(PHONE_KEY, phone);
};
