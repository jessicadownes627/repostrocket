export const platformTransforms = {
  mercari: (data) => ({
    title: data.title ? data.title.slice(0, 40) : "",
    description: data.description
      ? `${data.description}\n\nCondition: ${data.condition || ""}`
      : "",
    tags: data.tags || [],
    price: data.price || "",
  }),

  ebay: (data) => ({
    title: data.title || "",
    description: data.description
      ? `${data.description}\n\nItem specifics:\n- Condition: ${
          data.condition || ""
        }`
      : "",
    tags: data.tags || [],
    price: data.price || "",
  }),

  poshmark: (data) => ({
    title: data.title || "",
    description: data.description
      ? `${data.description}\n\n#poshstyle`
      : "",
    tags: data.tags || [],
    price: data.price || "",
  }),
};
