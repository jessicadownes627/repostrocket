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
import { Toaster } from "react-hot-toast";

function App() {
  return (
    <>
      <Toaster position="top-center" />
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
    </>
  );
}

export default App;
