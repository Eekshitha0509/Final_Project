// App.jsx - Fixed Version
import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

// Layout Components
import Header from "./components/Header";

// Auth Components
import StudentLog from "./components/StudentLog";
import AdminLog from "./components/AdminLog";
import WardenLog from "./components/WardenLog";
import Register from "./components/Register";

// Certificate Components
import NoDuesCertificate from "./components/NoDuesCertificate";
import ResidenceCertificate from "./components/ResidenceCertificate";
import EstimationCertificate from "./components/EstimationCertificate";
import ForgotPassword from './components/ForgotPassword';

// Page Components
import Homepage from "./pages/Homepage";
import LandingPage from "./pages/LandingPage";
import Profile from "./pages/Profile";
import RoomAllocation from "./pages/RoomAllocation";
import AdminHomepage from "./pages/Adminhomepage";
import MessPayment from "./pages/MessPayment";
import RoomBooking from "./pages/RoomBooking";
import Payment from './pages/Payment';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('access');
  const studentToken = localStorage.getItem('student');
  const adminToken = localStorage.getItem('admin');
  const wardenToken = localStorage.getItem('warden');
  
  const isAuthenticated = token || studentToken || adminToken || wardenToken;
  
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  return children;
};

// Role-specific Protected Routes
const StudentRoute = ({ children }) => {
  const studentToken = localStorage.getItem('student');
  const token = localStorage.getItem('access');
  
  if (!studentToken && !token) {
    return <Navigate to="/" replace />;
  }
  return children;
};

const AdminRoute = ({ children }) => {
  const adminToken = localStorage.getItem('admin');
  
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
        <Route path="/payment/:bookingId" element={<Payment />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        
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
        
        <Route path="/homepage" element={
          <StudentRoute>
            <Homepage />
          </StudentRoute>
        } />
        
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
        
        <Route path="/room-allocation" element={
          <AdminRoute>
            <RoomAllocation />
          </AdminRoute>
        } />
        
        {/* Catch all route - 404 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;