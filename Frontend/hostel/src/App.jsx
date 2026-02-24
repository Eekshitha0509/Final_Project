import React from "react";
import Header from "./components/Header";
import LandingPage from "./pages/LandingPage";
import Profile from "./pages/Profile";
import Homepage from "./pages/Homepage";
import StudentLog from "./components/StudentLog";
import MessPayment from "./pages/MessPayment";

import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

function App() {
  return (
    <Router>

      <Header />

      <Routes>

        <Route path="/" element={<LandingPage />} />
        <Route path="/admin" element={<LandingPage />} />

        <Route path="/profile" element={<Profile />} />
        <Route path="/homepage" element={<Homepage />} />

        {/* ⭐ Fix login route */}
        <Route path="/login" element={<StudentLog />} />

        <Route path="/mess-payment" element={<MessPayment />} />

      </Routes>

    </Router>
  );
}

export default App;