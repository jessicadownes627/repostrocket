import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Welcome from "./pages/Welcome";
import CreateListing from "./pages/CreateListing";
import Launchpad from "./pages/Launchpad";
import LaunchLoading from "./pages/LaunchLoading";
import Preflight from "./pages/Preflight";
import Splash from "./pages/Splash";
import Drafts from "./pages/Drafts";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Splash />} />
        <Route path="/welcome" element={<Welcome />} />
        <Route path="/create" element={<CreateListing />} />
        <Route path="/launch" element={<Launchpad />} />
        <Route path="/loading" element={<LaunchLoading />} />
        <Route path="/preflight" element={<Preflight />} />
        <Route path="/drafts" element={<Drafts />} />
      </Routes>
    </Router>
  );
}

export default App;
