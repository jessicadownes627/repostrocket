import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { ListingProvider } from "./store/useListingStore";

// Force-refresh after deploy: clear any old service workers/PWA cache
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistrations().then((regs) => {
    for (const reg of regs) reg.unregister();
  });
}

createRoot(document.getElementById("root")).render(
  <ListingProvider>
    <App />
  </ListingProvider>
);
