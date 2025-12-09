export const trendingPairs = [
  {
    left: {
      title: "LaBUBU Dolls",
      reason: "Limited drops causing huge resale spikes.",
      category: "Collectibles",
    },
    right: {
      title: "Nike Tech Fleece",
      reason: "Seasonal surge — everyone has one in their closet.",
      category: "Athleisure",
    },
  },
  {
    left: {
      title: "NBA Rookie Cards",
      reason: "Trade rumors driving speculation.",
      category: "Sports Cards",
    },
    right: {
      title: "Vintage Hoodies",
      reason: "Winter outfits and streetwear trends pushing demand.",
      category: "Streetwear",
    },
  },
  {
    left: {
      title: "Ugg Tazz Slippers",
      reason: "Viral again after fall outfit videos.",
      category: "Footwear",
    },
    right: {
      title: "Coach Bags",
      reason: "Affordable luxury resurgence.",
      category: "Handbags",
    },
  },
];

// Flattened list used for the empty-state opportunities panel
export const trendingOpportunities = trendingPairs
  .flatMap((p) => [p.left, p.right])
  // de-duplicate by title
  .filter(
    (item, index, arr) =>
      arr.findIndex((other) => other.title === item.title) === index
  );
