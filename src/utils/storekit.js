import { useSyncExternalStore } from "react";

export const PRODUCT_ID = "repostrocket.pro.monthly";

const listeners = new Set();

let productState = {
  status: "idle",
  products: [],
  error: "",
  loadedAt: null,
};

function emit() {
  for (const listener of listeners) listener();
}

function updateProductState(next) {
  productState = {
    ...productState,
    ...next,
  };
  emit();
}

function getWindowObject() {
  return typeof window !== "undefined" ? window : undefined;
}

function getMessageHandlers() {
  const win = getWindowObject();
  return win?.webkit?.messageHandlers || null;
}

function getHandler(...names) {
  const handlers = getMessageHandlers();
  for (const name of names) {
    const handler = handlers?.[name];
    if (handler && typeof handler.postMessage === "function") {
      return { handler, name };
    }
  }
  return null;
}

function postMessage(names, payload) {
  const handlerConfig = getHandler(...names);
  if (!handlerConfig) {
    throw new Error(`Missing iOS handler: ${names.join(" or ")}`);
  }
  handlerConfig.handler.postMessage(payload);
  return handlerConfig.name;
}

function normalizeProducts(payload) {
  const rawProducts = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.products)
      ? payload.products
      : [];

  return rawProducts
    .filter(Boolean)
    .map((product) => ({
      productId:
        product.productId ||
        product.id ||
        product.identifier ||
        product.productIdentifier ||
        "",
      title: product.title || product.displayName || "",
      description: product.description || product.displayDescription || "",
      displayPrice:
        product.displayPrice ||
        product.localizedPrice ||
        product.priceString ||
        "",
      raw: product,
    }))
    .filter((product) => product.productId);
}

function installStoreKitCallbacks() {
  const win = getWindowObject();
  if (!win || win.__rr_storekit_callbacks_installed) return;

  const previousProductsLoaded = win.onStoreKitProductsLoaded;
  const previousProductsLoadedAlias = win.onProductsLoaded;
  const previousProductsFailed = win.onStoreKitProductsFailed;
  const previousProductsFailedAlias = win.onProductsFailed;
  const previousPurchaseSuccess = win.onStoreKitPurchaseSuccess;
  const previousPurchaseSuccessAlias = win.onPurchaseSuccess;
  const previousPurchaseFailed = win.onStoreKitPurchaseFailed;
  const previousPurchaseFailedAlias = win.onPurchaseFailed;

  const handleProductsLoaded = function onStoreKitProductsLoaded(payload) {
    const products = normalizeProducts(payload);
    console.info("[StoreKit] product fetch results", {
      requestedProductId: PRODUCT_ID,
      count: products.length,
      products,
    });

    const matchingProducts = products.filter(
      (product) => product.productId === PRODUCT_ID
    );

    if (matchingProducts.length === 0) {
      updateProductState({
        status: "error",
        products: [],
        error:
          "Premium is temporarily unavailable. Please try again in a moment.",
        loadedAt: Date.now(),
      });
    } else {
      updateProductState({
        status: "ready",
        products: matchingProducts,
        error: "",
        loadedAt: Date.now(),
      });
    }

    if (typeof previousProductsLoaded === "function") {
      previousProductsLoaded(payload);
    }
    if (typeof previousProductsLoadedAlias === "function") {
      previousProductsLoadedAlias(payload);
    }
  };

  const handleProductsFailed = function onStoreKitProductsFailed(error) {
    console.error("[StoreKit] product fetch failure", error);
    updateProductState({
      status: "error",
      products: [],
      error: "Premium is temporarily unavailable. Please try again later.",
      loadedAt: Date.now(),
    });
    if (typeof previousProductsFailed === "function") {
      previousProductsFailed(error);
    }
    if (typeof previousProductsFailedAlias === "function") {
      previousProductsFailedAlias(error);
    }
  };

  const handlePurchaseSuccess = function onStoreKitPurchaseSuccess(payload) {
    console.info("[StoreKit] purchase success", payload);
    if (typeof previousPurchaseSuccess === "function") {
      previousPurchaseSuccess(payload);
    }
    if (typeof previousPurchaseSuccessAlias === "function") {
      previousPurchaseSuccessAlias(payload);
    }
  };

  const handlePurchaseFailed = function onStoreKitPurchaseFailed(error) {
    console.error("[StoreKit] purchase failure", error);
    if (typeof previousPurchaseFailed === "function") {
      previousPurchaseFailed(error);
    }
    if (typeof previousPurchaseFailedAlias === "function") {
      previousPurchaseFailedAlias(error);
    }
  };

  win.onStoreKitProductsLoaded = handleProductsLoaded;
  win.onProductsLoaded = handleProductsLoaded;
  win.onStoreKitProductsFailed = handleProductsFailed;
  win.onProductsFailed = handleProductsFailed;
  win.onStoreKitPurchaseSuccess = handlePurchaseSuccess;
  win.onPurchaseSuccess = handlePurchaseSuccess;
  win.onStoreKitPurchaseFailed = handlePurchaseFailed;
  win.onPurchaseFailed = handlePurchaseFailed;

  win.__rr_storekit_callbacks_installed = true;
}

installStoreKitCallbacks();

export function subscribeStoreKitProducts(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getStoreKitProductState() {
  return productState;
}

export function useStoreKitProducts() {
  return useSyncExternalStore(
    subscribeStoreKitProducts,
    getStoreKitProductState,
    () => productState
  );
}

export function getLoadedSubscriptionProduct() {
  return productState.products.find((product) => product.productId === PRODUCT_ID) || null;
}

export function isStoreKitAvailable() {
  return Boolean(getHandler("purchasePro", "purchaseProduct"));
}

export async function requestProducts() {
  installStoreKitCallbacks();

  if (!isStoreKitAvailable()) {
    const message = "Premium purchases are only available in the iOS app.";
    console.warn("[StoreKit] product fetch skipped", {
      requestedProductId: PRODUCT_ID,
      reason: "missing_purchase_handler",
    });
    updateProductState({
      status: "error",
      products: [],
      error: message,
    });
    return { ok: false, message };
  }

  if (productState.status === "loading") {
    return { ok: true };
  }

  updateProductState({
    status: "loading",
    products: [],
    error: "",
  });

  try {
    const handlerName = postMessage(
      ["fetchProducts", "loadProducts", "requestProducts", "getProducts"],
      { productIds: [PRODUCT_ID] }
    );
    console.info("[StoreKit] requesting products", {
      requestedProductId: PRODUCT_ID,
      handler: handlerName,
    });
    return { ok: true };
  } catch (err) {
    console.error("[StoreKit] product fetch failure", err);
    updateProductState({
      status: "error",
      products: [],
      error: "Premium is temporarily unavailable. Please try again later.",
    });
    return { ok: false, message: productState.error };
  }
}

export async function purchaseProSubscription() {
  installStoreKitCallbacks();

  const product = getLoadedSubscriptionProduct();
  if (!product) {
    const message =
      productState.status === "loading"
        ? "Premium is still loading. Please wait a moment and try again."
        : "Premium is temporarily unavailable. Please try again later.";
    console.warn("[StoreKit] purchase blocked", {
      requestedProductId: PRODUCT_ID,
      status: productState.status,
    });
    return { ok: false, message };
  }

  try {
    console.info("[StoreKit] purchase start", {
      requestedProductId: PRODUCT_ID,
      product,
    });
    const handlerName = postMessage(
      ["purchasePro", "purchaseProduct"],
      {
        product,
        productId: product.productId,
      }
    );
    console.info("[StoreKit] purchase message posted", {
      handler: handlerName,
      productId: product.productId,
    });
    return { ok: true };
  } catch (err) {
    console.error("[StoreKit] purchase failure", err);
    return {
      ok: false,
      message: "Purchase could not be completed. Please try again.",
    };
  }
}

export async function restorePurchases() {
  try {
    const handlerName = postMessage(
      ["restorePurchases", "restoreProPurchases"],
      {}
    );
    console.info("[StoreKit] restore purchases", { handler: handlerName });
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
    const handlerName = postMessage(
      ["checkSubscriptionStatus", "checkProStatus"],
      {}
    );
    console.info("[StoreKit] status check requested", { handler: handlerName });
    return { ok: true };
  } catch (err) {
    console.error("StoreKit status check failed:", err);
    return { ok: false };
  }
}
