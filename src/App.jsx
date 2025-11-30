import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Welcome from "./pages/Welcome";
import CreateListing from "./pages/CreateListing";
import LaunchLoading from "./pages/LaunchLoading";
import Preflight from "./pages/Preflight";
import Splash from "./pages/Splash";
import Drafts from "./pages/Drafts";
import PlatformPrep from "./pages/PlatformPrep";
import LaunchCenter from "./pages/LaunchCenter";
import PlatformLaunch from "./pages/PlatformLaunch";
import LaunchDeck from "./pages/LaunchDeck";

function App() {
  const testListing = {
    title: "Vintage Nike Hoodie",
    description: "Soft oversized fleece-lined hoodie in charcoal gray.",
    tags: ["nike", "hoodie", "vintage", "oversized"],
    brand: "Nike",
    color: "Charcoal",
    size: "M",
    condition: "Good",
    photos: [
      "https://images.unsplash.com/photo-1556905055-8f358a7a47b2",
      "https://images.unsplash.com/photo-1523381210426-6c232ac26a41",
    ],
    price: "45",
    category: "Clothing",
  };

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Splash />} />
        <Route path="/welcome" element={<Welcome />} />
        <Route path="/create" element={<CreateListing />} />
        <Route path="/preflight" element={<Preflight />} />

        {/* New clean flow */}
        <Route path="/loading" element={<LaunchLoading />} />
        <Route path="/launch" element={<LaunchCenter />} />
        <Route path="/launch/:platform" element={<PlatformLaunch />} />
        <Route path="/launch-deck" element={<LaunchDeck />} />

        {/* Utilities */}
        <Route path="/preflight" element={<Preflight />} />
        <Route path="/drafts" element={<Drafts />} />
        <Route path="/platform-prep" element={<PlatformPrep />} />
      </Routes>
    </Router>
  );
}

export default App;
