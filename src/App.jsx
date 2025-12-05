import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

import Welcome from "./pages/Welcome";
import CreateListing from "./pages/CreateListing";
import SingleListing from "./pages/SingleListing";
import BatchUpload from "./pages/Batch";
import LaunchDeck from "./pages/LaunchDeck";
import Inventory from "./pages/Inventory";

export default function App() {
  return (
    <Router>
      <Routes>
        {/* Home */}
        <Route path="/" element={<Welcome />} />
        <Route path="/welcome" element={<Welcome />} />

        {/* NEW MAGIC FLOW */}
        <Route path="/create" element={<CreateListing />} />
        <Route path="/create-listing" element={<CreateListing />} />
        <Route path="/single-listing" element={<SingleListing />} />
        <Route path="/batch-mode" element={<BatchUpload />} />
        <Route path="/launch" element={<LaunchDeck />} />
        <Route path="/inventory" element={<Inventory />} />

        {/* OPTIONAL OLD ROUTE FALLBACKS */}
        <Route path="/batch" element={<Navigate to="/batch-mode" replace />} />
      </Routes>
    </Router>
  );
}
