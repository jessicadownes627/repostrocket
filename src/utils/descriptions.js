export function getPlatformDescriptions(listingData = {}, selectedPlatforms = []) {
  const {
    title = "",
    description = "",
    condition = "",
    category = "",
    price = "",
    shipping = "",
  } = listingData;

  const effectivePrice = price || "";
  const effectiveCondition = condition || "";
  const effectiveCategory = category || "";

  const templates = {
    poshmark: {
      title,
      description: `${title}
Size: 
Condition: ${effectiveCondition}
${description}

Bundle to save. Fast shipping!`,
    },
    mercari: {
      title,
      description: `${title}
${description}
Condition: ${effectiveCondition}
Ships ${shipping === "buyer pays" ? "to your door" : "from seller"} promptly.`,
    },
    depop: {
      title,
      description: `${title}
${description}

Tagged: vintage, streetwear, trending, resale`,
    },
    ebay: {
      title,
      description: `${title}
${description}

Item specifics:
• Category: ${effectiveCategory}
• Condition: ${effectiveCondition}
• Price: $${effectivePrice}
Please review all photos. Ships fast.`,
    },
    "facebook marketplace": {
      title,
      description: `${title} – $${effectivePrice}
${description}
Condition: ${effectiveCondition}
Local pickup or shipping available.`,
    },
    vinted: {
      title,
      description: `${title}
${description}
Condition: ${effectiveCondition}
Ships quickly.`,
    },
    etsy: {
      title,
      description: `${title}
${description}

Authentic vintage item.
Condition: ${effectiveCondition}
Ships securely.`,
    },
    kidizen: {
      title,
      description: `${title}
${description}
Condition: ${effectiveCondition}
From a clean, smoke-free home.
Ships fast.`,
    },
    shopify: {
      title,
      description: `${title}
${description}
Condition: ${effectiveCondition}
Price: $${effectivePrice}`,
    },
    grailed: {
      title,
      description: `${title}
${description}

Streetwear marketplace ready. Condition: ${effectiveCondition}
Ships fast.`,
    },
  };

  const normalized = selectedPlatforms.map((p) => p.toLowerCase());
  return normalized.reduce((acc, platform) => {
    if (templates[platform]) {
      acc[platform] = templates[platform];
    }
    return acc;
  }, {});
}
