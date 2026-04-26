import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

// Layout Components
import Header from "./components/Header";
import Footer from "./components/Footer";

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
import RoomBooking from "./pages/RoomBooking"; 
import AdminHomepage from "./pages/Adminhomepage";
import MessPayment from "./pages/MessPayment";
import Payment from './pages/Payment';
import AboutHostels from "./pages/AboutHostels";

// Protected Route wrapper - checks localStorage for auth and redirects to landing if not logged in
const ProtectedRoute = ({ children, requireAdmin = false }) => {
  const token = localStorage.getItem('access');
  const adminToken = localStorage.getItem('admin');
  
  if (requireAdmin) {
    if (!adminToken && !token) {
      return <Navigate to="/" replace />;
    }
    return children;
  }
  
  if (!token) {
    return <Navigate to="/" replace />;
  }
  return children;
};

function App() {
  return (
    <Router>
      {/* 🔥 ADDED: This wrapper forces the screen to be full height and stacks everything */}
      <div className="flex flex-col min-h-screen bg-slate-50">
        
        {/* Header appears on all pages */}
        <Header />
        
        {/* 🔥 FIXED: Changed flex-grow:1 to flex-grow. This pushes the footer down. */}
        <main className="flex-grow">
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/about" element={<AboutHostels />} />
            <Route path="/login/student" element={<StudentLog />} />
            <Route path="/login/admin" element={<AdminLog />} />
            <Route path="/login/warden" element={<WardenLog />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            
            {/* Payment Route */}
            <Route path="/payment/:bookingId" element={
              <ProtectedRoute>
                <Payment />
              </ProtectedRoute>
            } />
            
            {/* Certificate Routes */}
            <Route path="/nodues" element={
              <ProtectedRoute>
                <NoDuesCertificate />
              </ProtectedRoute>
            } />
            <Route path="/residentcertificate" element={
              <ProtectedRoute>
                <ResidenceCertificate />
              </ProtectedRoute>
            } />
            <Route path="/estimationslip" element={
              <ProtectedRoute>
                <EstimationCertificate />
              </ProtectedRoute>
            } />
            
            {/* Student Protected Routes */}
            <Route path="/profile" element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            } />
            <Route path="/homepage" element={
              <ProtectedRoute>
                <Homepage />
              </ProtectedRoute>
            } />
            <Route path="/home" element={
              <ProtectedRoute>
                <Homepage />
              </ProtectedRoute>
            } />
            <Route path="/Homepage" element={
              <ProtectedRoute>
                <Homepage />
              </ProtectedRoute>
            } />
            <Route path="/room-booking" element={
              <ProtectedRoute>
                <RoomBooking />
              </ProtectedRoute>
            } />
            <Route path="/mess-payment" element={
              <ProtectedRoute>
                <MessPayment />
              </ProtectedRoute>
            } />
            
            {/* Admin Protected Routes */}
            <Route path="/adminpanel" element={
              <ProtectedRoute requireAdmin={true}>
                <AdminHomepage />
              </ProtectedRoute>
            } />
            
            {/* Catch all route */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        
        {/* Footer stays perfectly at the bottom */}
        <Footer />

      </div>
    </Router>
  );
}

export default App;