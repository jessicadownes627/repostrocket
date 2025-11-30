// Master export hub for marketplace formatters.
// Each platform formatter will follow the same pattern:
// function(listing) => string

export { default as formatEbay } from "./formatForEbay";
export { default as formatMercari } from "./formatForMercari";
export { default as formatPoshmark } from "./formatForPoshmark";
export { default as formatDepop } from "./formatForDepop";
export { default as formatEtsy } from "./formatForEtsy";
export { default as formatFacebook } from "./formatForFacebook";
export { default as formatGrailed } from "./formatForGrailed";
export { default as formatVinted } from "./formatForVinted";
export { default as formatKidizen } from "./formatForKidizen";
