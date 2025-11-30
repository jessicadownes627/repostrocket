// PREMIUM STORE WITH DEVELOPER OVERRIDE (phone-based)

export const PREMIUM_KEY = "rr_premium_status";
export const PHONE_KEY = "rr_user_phone";

// Jess + Husband override numbers
const OVERRIDE_NUMBERS = [
  "15164104363",
  "17189082021"
];

export const getPremiumStatus = () => {
  // Check override numbers FIRST (God Mode)
  const savedPhone = localStorage.getItem(PHONE_KEY);
  if (savedPhone && OVERRIDE_NUMBERS.includes(savedPhone)) {
    return true; // Always premium for Jess + husband
  }

  // Otherwise fall back to stored premium flag
  return localStorage.getItem(PREMIUM_KEY) === "premium";
};

export const setPremiumStatus = (value) => {
  if (value) {
    localStorage.setItem(PREMIUM_KEY, "premium");
  } else {
    localStorage.removeItem(PREMIUM_KEY);
  }
};

// Optional helper for setting user phone number
export const setUserPhone = (phone) => {
  localStorage.setItem(PHONE_KEY, phone);
};
