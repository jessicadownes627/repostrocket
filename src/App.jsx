import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Welcome from "./pages/Welcome";
import CreateListing from "./pages/CreateListing";
import Launchpad from "./pages/Launchpad";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Welcome />} />
        <Route path="/create" element={<CreateListing />} />
        <Route path="/launch" element={<Launchpad />} />
      </Routes>
    </Router>
  );
}

export default App;
