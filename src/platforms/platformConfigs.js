export const platformConfigs = {
  mercari: {
    id: "mercari",
    name: "Mercari",
    icon: "/assets/platforms/mercari.svg",
    url: "https://www.mercari.com/sell/",
    tips: [
      "Copy your listing fields first — Repost Rocket formats them for this platform.",
      "Photos upload best one at a time (platform quirk).",
      "Price rounding may vary — adjust manually if needed.",
      "Paste description into the main text box, then add extra tags if required."
    ],
    fields: [
      "title",
      "description",
      "category",
      "condition",
      "brand",
      "color",
      "size",
      "price",
      "shipping",
      "sku",
      "tags",
      "photos"
    ]
  },

  poshmark: {
    id: "poshmark",
    name: "Poshmark",
    icon: "/assets/platforms/poshmark.svg",
    url: "https://poshmark.com/create-listing",
    tips: [
      "Copy your listing fields first — Repost Rocket formats them for this platform.",
      "Photos upload best one at a time (platform quirk).",
      "Price rounding may vary — adjust manually if needed.",
      "Paste description into the main text box, then add extra tags if required."
    ],
    fields: [
      "title",
      "description",
      "category",
      "brand",
      "color",
      "size",
      "price",
      "originalPrice",
      "condition",
      "photos"
    ]
  },

  ebay: {
    id: "ebay",
    name: "eBay",
    icon: "/assets/platforms/ebay.svg",
    url: "https://www.ebay.com/sl/sell",
    tips: [
      "Copy your listing fields first — Repost Rocket formats them for this platform.",
      "Photos upload best one at a time (platform quirk).",
      "Price rounding may vary — adjust manually if needed.",
      "Paste description into the main text box, then add extra tags if required."
    ],
    fields: [
      "title",
      "description",
      "category",
      "condition",
      "brand",
      "price",
      "shipping",
      "photos",
      "sku"
    ]
  },

  etsy: {
    id: "etsy",
    name: "Etsy",
    icon: "/assets/platforms/etsy.svg",
    url: "https://www.etsy.com/your/shops/me/tools/listings/create",
    tips: [
      "Copy your listing fields first — Repost Rocket formats them for this platform.",
      "Photos upload best one at a time (platform quirk).",
      "Price rounding may vary — adjust manually if needed.",
      "Paste description into the main text box, then add extra tags if required."
    ],
    fields: [
      "title",
      "description",
      "category",
      "tags",
      "price",
      "photos",
      "sku"
    ]
  },

  depop: {
    id: "depop",
    name: "Depop",
    icon: "/assets/platforms/depop.svg",
    url: "https://www.depop.com/sell/",
    tips: [
      "Copy your listing fields first — Repost Rocket formats them for this platform.",
      "Photos upload best one at a time (platform quirk).",
      "Price rounding may vary — adjust manually if needed.",
      "Paste description into the main text box, then add extra tags if required."
    ],
    fields: [
      "title",
      "description",
      "category",
      "brand",
      "color",
      "size",
      "price",
      "condition",
      "photos"
    ]
  },

  facebook: {
    id: "facebook",
    name: "Facebook Marketplace",
    icon: "/assets/platforms/facebook.svg",
    url: "https://www.facebook.com/marketplace/create/item",
    tips: [
      "Copy your listing fields first — Repost Rocket formats them for this platform.",
      "Photos upload best one at a time (platform quirk).",
      "Price rounding may vary — adjust manually if needed.",
      "Paste description into the main text box, then add extra tags if required."
    ],
    fields: [
      "title",
      "description",
      "category",
      "condition",
      "price",
      "photos"
    ]
  }
};
