export const deepLinkMap = {
  poshmark: {
    create: "https://poshmark.com/single-listing",
    edit: (id) => `https://poshmark.com/edit-listing/${id}`,
  },
  mercari: {
    create: "https://www.mercari.com/sell",
    edit: (id) => `https://www.mercari.com/sell/edit/${id}`,
  },
  ebay: {
    create: "https://www.ebay.com/sl/sell",
    edit: (id) => `https://www.ebay.com/sl/sell/item/${id}`,
  },
  depop: {
    create: "https://www.depop.com/sell",
    edit: () => "https://www.depop.com/sell",
  },
};

export function openDeepLink(platform, mode = "create", id) {
  const key = platform?.toLowerCase();
  const map = deepLinkMap[key];
  if (!map) return;
  const url = mode === "edit" && id && typeof map.edit === "function" ? map.edit(id) : map.create;
  if (url) window.open(url, "_blank");
}
