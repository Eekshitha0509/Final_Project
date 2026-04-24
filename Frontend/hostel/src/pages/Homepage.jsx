// src/pages/Homepage.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

function Homepage() {
  const navigate = useNavigate();
  
  // ✅ FIX: Lazy initialization replaces useEffect to prevent cascading re-renders
  const [userName] = useState(() => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      try {
        const userObj = JSON.parse(userStr);
        if (userObj.first_name) {
          return userObj.first_name;
        } else if (userObj.full_name) {
          return userObj.full_name.split(" ")[0];
        }
      } catch (err) {
        // ✅ FIX: Actually logging the caught error to handle the exception
        console.error("Error parsing user data from localStorage:", err);
      }
    }
    return "Student"; // Fallback
  });

  const handleLogout = () => {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    localStorage.removeItem("user");
    localStorage.removeItem("role");
    localStorage.clear(); 
    
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      
      {/* --- TOP NAVIGATION BAR --- */}
      <div className="w-full bg-white shadow-sm border-b border-slate-200 px-6 py-4 flex justify-between items-center">
        <div className="font-black text-[#002147] text-lg uppercase tracking-tight">
          Welcome, {userName}
        </div>
        <div className="flex gap-4">
          <button 
            onClick={() => navigate('/profile')}
            className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg font-bold transition-colors uppercase text-xs tracking-wider"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Profile
          </button>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 px-4 py-2 rounded-lg font-bold transition-colors uppercase text-xs tracking-wider border border-red-100 hover:border-red-200"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Logout
          </button>
        </div>
      </div>

      {/* --- MAIN CONTENT AREA --- */}
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <h1 className="text-xl font-bold text-slate-400 mb-10 tracking-[0.2em] uppercase">
          Select Service
        </h1>

        <div className="flex flex-col md:flex-row gap-6 w-full max-w-4xl">
          {/* Room Allocation Button */}
          {/* ✅ FIX: Replaced rounded-[2rem] with canonical rounded-4xl */}
          <button
            className="flex-1 group bg-white border-2 border-slate-100 p-10 rounded-4xl transition-all duration-300 hover:border-[#002147] hover:shadow-2xl hover:-translate-y-2"
            onClick={() => navigate("/room-booking")}
          >
            <div className="h-20 w-20 bg-blue-50 rounded-2xl flex items-center justify-center mb-6 mx-auto group-hover:bg-[#002147] transition-colors">
              <span className="text-3xl group-hover:scale-110 transition-transform">🛏️</span>
            </div>

            <h2 className="text-2xl font-bold text-slate-800 mb-2">
              Room Booking
            </h2>

            <p className="text-slate-500 text-sm">
              Book or manage your hostel room
            </p>
          </button>

          {/* Mess Payment Button */}
          {/* ✅ FIX: Replaced rounded-[2rem] with canonical rounded-4xl */}
          <button
            className="flex-1 group bg-white border-2 border-slate-100 p-10 rounded-4xl transition-all duration-300 hover:border-orange-500 hover:shadow-2xl hover:-translate-y-2"
            onClick={() => navigate("/mess-payment")}
          >
            <div className="h-20 w-20 bg-orange-50 rounded-2xl flex items-center justify-center mb-6 mx-auto group-hover:bg-orange-600 transition-colors">
              <span className="text-3xl group-hover:scale-110 transition-transform">🍽️</span>
            </div>

            <h2 className="text-2xl font-bold text-slate-800 mb-2">
              Mess Payment
            </h2>

            <p className="text-slate-500 text-sm">
              Pay bills and check food credits
            </p>
          </button>
        </div>
      </div>

    </div>
  );
}

export default Homepage;