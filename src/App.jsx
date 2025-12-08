console.log("🔥 Dashboard.jsx is ACTIVE and LOADED");

import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

// Pages
import Welcome from "./pages/Welcome";
import Dashboard from "./pages/Dashboard.jsx";
import MagicPhotoPrep from "./pages/MagicPhotoPrep"; // Magic Upload
import MagicCardPrep from "./pages/MagicCardPrep";
import SingleListing from "./pages/SingleListing"; // AI Editor
import LaunchDeck from "./pages/LaunchDeck"; // Final Launch
import Inventory from "./pages/Inventory";
import Batch from "./pages/Batch"; // Batch Mode
import LaunchDeckBatch from "./pages/LaunchDeckBatch"; // Batch → Launch
import SportsCardSuite from "./pages/SportsCardSuite";
import MultiDetect from "./pages/MultiDetect";
import BatchComps from "./pages/BatchComps";
import LaunchListing from "./pages/LaunchListing";

function App() {
  return (
    <Router>
      <div className="app-wrapper relative z-10">
        <Routes>
          <Route path="/" element={<Welcome />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/prep" element={<MagicPhotoPrep />} />
          <Route path="/card-prep" element={<MagicCardPrep />} />
          <Route path="/single-listing" element={<SingleListing />} />
          <Route path="/launch" element={<LaunchDeck />} />
          <Route path="/batch" element={<Batch />} />
          <Route path="/batch-launch" element={<LaunchDeckBatch />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/sports-cards" element={<SportsCardSuite />} />
          <Route path="/multi-detect" element={<MultiDetect />} />
          <Route path="/batch-comps" element={<BatchComps />} />
          <Route path="/launch-listing" element={<LaunchListing />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
