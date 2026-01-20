import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import { BatchProvider } from "./store/useBatchStore";
import { SportsBatchProvider } from "./store/useSportsBatchStore";

// Pages
import Welcome from "./pages/Welcome";
import Dashboard from "./pages/Dashboard.jsx";
import MagicPhotoPrep from "./pages/MagicPhotoPrep"; // Magic Upload
import MagicCardPrep from "./pages/MagicCardPrep";
import BatchCardPrep from "./pages/BatchCardPrep";
import SingleListing from "./pages/SingleListing"; // AI Editor
import LaunchDeck from "./pages/LaunchDeck"; // Final Launch
import Inventory from "./pages/Inventory";
import Batch from "./pages/Batch"; // Batch Mode
import LaunchDeckBatch from "./pages/LaunchDeckBatch"; // Batch → Launch
import SportsBatchPrep from "./pages/SportsBatchPrep";
import SportsBatchReview from "./pages/SportsBatchReview";
import SportsBatchLaunch from "./pages/SportsBatchLaunch";
import SportsCardSuite from "./pages/SportsCardSuite";
import MultiDetect from "./pages/MultiDetect";
import BatchComps from "./pages/BatchComps";
import LaunchListing from "./pages/LaunchListing";
import TrendSenseDashboard from "./pages/TrendSenseDashboard";
import FloatingHomeButton from "./components/FloatingHomeButton";

const HOME_BUTTON_PATHS = new Set([
  "/single-listing",
  "/launch",
  "/batch",
  "/launch-listing",
  "/sports-cards",
  "/batch-launch",
  "/batch-card-prep",
  "/trendsense",
  "/sports-batch-launch",
  "/sports-batch",
  "/sports-batch-review",
]);


function AppShell() {
  const location = useLocation();
  const showHomeButton = HOME_BUTTON_PATHS.has(location.pathname);

  return (
    <div className="app-wrapper relative z-10">
      <Routes>
        <Route path="/" element={<Welcome />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/prep" element={<MagicPhotoPrep />} />
        <Route path="/card-prep" element={<MagicCardPrep />} />
        <Route path="/batch-card-prep" element={<BatchCardPrep />} />
        <Route path="/single-listing" element={<SingleListing />} />
        <Route path="/launch" element={<LaunchDeck />} />
        <Route path="/batch" element={<Batch />} />
        <Route path="/sports-batch" element={<SportsBatchPrep />} />
        <Route path="/batch-launch" element={<LaunchDeckBatch />} />
        <Route path="/sports-batch-review" element={<SportsBatchReview />} />
        <Route path="/sports-batch-launch" element={<SportsBatchLaunch />} />
        <Route path="/inventory" element={<Inventory />} />
        <Route path="/sports-cards" element={<SportsCardSuite />} />
        <Route path="/multi-detect" element={<MultiDetect />} />
        <Route path="/batch-comps" element={<BatchComps />} />
        <Route path="/launch-listing" element={<LaunchListing />} />
        <Route path="/trendsense" element={<TrendSenseDashboard />} />
      </Routes>
      {showHomeButton && <FloatingHomeButton />}
    </div>
  );
}

function App() {
  return (
    <Router basename="/">
      <BatchProvider>
        <SportsBatchProvider>
          <AppShell />
        </SportsBatchProvider>
      </BatchProvider>
    </Router>
  );
}


export default App;
