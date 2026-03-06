const PRODUCT_ID = "com.repostrocket.pro.monthly";

function getMessageHandlers() {
  const webkit = typeof window !== "undefined" ? window.webkit : undefined;
  return webkit?.messageHandlers || null;
}

function postMessage(handlerName, payload) {
  const handlers = getMessageHandlers();
  const handler = handlers?.[handlerName];
  if (!handler || typeof handler.postMessage !== "function") {
    throw new Error(`Missing iOS handler: ${handlerName}`);
  }
  handler.postMessage(payload);
}

export async function purchaseProSubscription() {
  try {
    postMessage("purchasePro", { productId: PRODUCT_ID });
    return { ok: true };
  } catch (err) {
    console.error("StoreKit purchase failed:", err);
    return {
      ok: false,
      message: "Purchase could not be completed. Please try again.",
    };
  }
}

export async function restorePurchases() {
  try {
    postMessage("restorePurchases", {});
    return { ok: true };
  } catch (err) {
    console.error("StoreKit restore failed:", err);
    return {
      ok: false,
      message: "Restore could not be completed. Please try again.",
    };
  }
}

export async function checkSubscriptionStatus() {
  try {
    const handlers = getMessageHandlers();
    const handler = handlers?.checkSubscriptionStatus || handlers?.checkProStatus;
    if (handler && typeof handler.postMessage === "function") {
      handler.postMessage({});
    }
    return { ok: true };
  } catch (err) {
    console.error("StoreKit status check failed:", err);
    return { ok: false };
  }
}

export function isStoreKitAvailable() {
  const handlers = getMessageHandlers();
  return Boolean(
    handlers &&
      handlers.purchasePro &&
      typeof handlers.purchasePro.postMessage === "function"
  );
}

