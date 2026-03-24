// App.jsx - Update this
import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import StudentLog from "./components/StudentLog";
import AdminLog from "./components/AdminLog";
import WardenLog from "./components/WardenLog";
import Register from "./components/Register";
import Homepage from "./pages/Homepage";
import LandingPage from "./pages/LandingPage";
import Profile from "./pages/Profile";
import RoomAllocation from "./pages/RoomAllocation";
import MessPayment from "./pages/MessPayment";
import RoomBooking from "./pages/RoomBooking"; // New component
import Payment from './pages/Payment';
// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('access');
  if (!token) {
    return <Navigate to="/" />;
  }
  return children;
};

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        
        {/* Auth Routes */}
        <Route path="/login/student" element={<StudentLog />} />
        <Route path="/login/admin" element={<AdminLog />} />
        <Route path="/login/warden" element={<WardenLog />} />
        <Route path="/register" element={<Register />} />
        <Route path="/payment/:bookingId" element={<Payment />} />
        
        {/* Protected Routes */}
        <Route path="/profile" element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        } />
        
        <Route path="/home" element={
          <ProtectedRoute>
            <Homepage />
          </ProtectedRoute>
        } />
        
        <Route path="/room-booking" element={
          <ProtectedRoute>
            <RoomBooking />
          </ProtectedRoute>
        } />
        
        <Route path="/room-allocation" element={
          <ProtectedRoute>
            <RoomAllocation />
          </ProtectedRoute>
        } />
        
        <Route path="/mess-payment" element={
          <ProtectedRoute>
            <MessPayment />
          </ProtectedRoute>
        } />
        
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;