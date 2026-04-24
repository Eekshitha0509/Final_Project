// App.jsx - Cleaned & Updated Version
import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

// Layout Components
import Header from "./components/Header";

// Auth Components
import StudentLog from "./components/StudentLog";
import AdminLog from "./components/AdminLog";
import WardenLog from "./components/WardenLog";
import Register from "./components/Register";
import ForgotPassword from './components/ForgotPassword';

// Certificate Components
import NoDuesCertificate from "./components/NoDuesCertificate";
import ResidenceCertificate from "./components/ResidenceCertificate";
import EstimationCertificate from "./components/EstimationCertificate";

// Page Components
import Homepage from "./pages/Homepage";
import LandingPage from "./pages/LandingPage";
import Profile from "./pages/Profile";
import RoomBooking from "./pages/RoomBooking"; // ✅ Added this import
import AdminHomepage from "./pages/Adminhomepage";
import MessPayment from "./pages/MessPayment";
import Payment from './pages/Payment';

// Role-specific Protected Routes based on new LocalStorage setup
const StudentRoute = ({ children }) => {
  // Check for the JWT access token we established during our login cleanup
  const token = localStorage.getItem('access');
  
  if (!token) {
    return <Navigate to="/" replace />;
  }
  return children;
};

const AdminRoute = ({ children }) => {
  // Admins might have a different token structure depending on your AdminLog.jsx
  const adminToken = localStorage.getItem('admin') || localStorage.getItem('access');
  
  if (!adminToken) {
    return <Navigate to="/" replace />;
  }
  return children;
};

function App() {
  return (
    <Router>
      {/* Header appears on all pages */}
      <Header />

      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        
        {/* Auth Routes */}
        <Route path="/login/student" element={<StudentLog />} />
        <Route path="/login/admin" element={<AdminLog />} />
        <Route path="/login/warden" element={<WardenLog />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        
        {/* Payment Route (Protected by StudentRoute) */}
        <Route path="/payment/:bookingId" element={
          <StudentRoute>
            <Payment />
          </StudentRoute>
        } />
        
        {/* Certificate Routes - Student Access */}
        <Route path="/nodues" element={
          <StudentRoute>
            <NoDuesCertificate />
          </StudentRoute>
        } />
        
        <Route path="/residentcertificate" element={
          <StudentRoute>
            <ResidenceCertificate />
          </StudentRoute>
        } />
        
        <Route path="/estimationslip" element={
          <StudentRoute>
            <EstimationCertificate />
          </StudentRoute>
        } />
        
        {/* Student Protected Routes */}
        <Route path="/profile" element={
          <StudentRoute>
            <Profile />
          </StudentRoute>
        } />
        
        <Route path="/home" element={
          <StudentRoute>
            <Homepage />
          </StudentRoute>
        } />
        
        {/* ✅ Room Booking Route */}
        <Route path="/room-booking" element={
          <StudentRoute>
            <RoomBooking />
          </StudentRoute>
        } />
        
        <Route path="/mess-payment" element={
          <StudentRoute>
            <MessPayment />
          </StudentRoute>
        } />
        
        {/* Admin Protected Routes */}
        <Route path="/adminpanel" element={
          <AdminRoute>
            <AdminHomepage />
          </AdminRoute>
        } />
        
        {/* Catch all route - 404 redirects to Landing Page */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;