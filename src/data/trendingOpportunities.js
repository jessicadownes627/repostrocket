export const trendingPairs = [
  {
    left: {
      title: "LaBUBU Dolls",
      reason: "Limited drops causing huge resale spikes.",
      category: "Collectibles",
      headlines: [
        {
          source: "Hypebeast",
          title: "POP MART's LaBUBU drops sell out in minutes worldwide",
          publishedAt: "2025-01-08T10:00:00Z",
          link: "https://hypebeast.com",
          isHistorical: false,
        },
        {
          source: "Toy Chronicle",
          title: "Collectors line up overnight for latest LaBUBU release",
          publishedAt: "2025-01-06T13:30:00Z",
          link: "https://www.thetoychronicle.com",
          isHistorical: false,
        },
      ],
    },
    right: {
      title: "Nike Tech Fleece",
      reason: "Seasonal surge — everyone has one in their closet.",
      category: "Athleisure",
      headlines: [
        {
          source: "CNBC",
          title: "Nike Tech Fleece tops holiday apparel searches",
          publishedAt: "2025-01-05T09:00:00Z",
          link: "https://www.cnbc.com",
          isHistorical: false,
        },
        {
          source: "GQ",
          title: "Why Tech Fleece is the must-have winter layer",
          publishedAt: "2025-01-04T11:45:00Z",
          link: "https://www.gq.com",
          isHistorical: false,
        },
      ],
    },
  },
  {
    left: {
      title: "NBA Rookie Cards",
      reason: "Trade rumors driving speculation.",
      category: "Sports Cards",
      headlines: [
        {
          source: "ESPN",
          title: "Rookie of the Year chatter heats up before All-Star break",
          publishedAt: "2025-01-09T14:00:00Z",
          link: "https://www.espn.com",
          isHistorical: false,
        },
        {
          source: "The Athletic",
          title: "Scouts say rising rookies could be moved at deadline",
          publishedAt: "2025-01-07T16:20:00Z",
          link: "https://theathletic.com",
          isHistorical: false,
        },
      ],
    },
    right: {
      title: "Vintage Hoodies",
      reason: "Winter outfits and streetwear trends pushing demand.",
      category: "Streetwear",
      headlines: [
        {
          source: "Vogue",
          title: "Retro collegiate hoodies dominate winter street style",
          publishedAt: "2025-01-03T07:15:00Z",
          link: "https://www.vogue.com",
          isHistorical: false,
        },
      ],
    },
  },
  {
    left: {
      title: "Ugg Tazz Slippers",
      reason: "Viral again after fall outfit videos.",
      category: "Footwear",
      headlines: [
        {
          source: "Refinery29",
          title: "TikTok revives the Ugg Tazz craze",
          publishedAt: "2025-01-02T12:05:00Z",
          link: "https://www.refinery29.com",
          isHistorical: false,
        },
      ],
    },
    right: {
      title: "Coach Bags",
      reason: "Affordable luxury resurgence.",
      category: "Handbags",
      headlines: [
        {
          source: "WWD",
          title: "Coach reissues iconic silhouettes for 2025",
          publishedAt: "2025-01-01T08:30:00Z",
          link: "https://wwd.com",
          isHistorical: false,
        },
        {
          source: "Business of Fashion",
          title: "Accessible luxury keeps outperforming",
          publishedAt: "2024-12-30T10:10:00Z",
          link: "https://www.businessoffashion.com",
          isHistorical: false,
        },
      ],
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
