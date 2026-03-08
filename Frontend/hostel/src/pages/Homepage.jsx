// src/pages/Homepage.jsx
import React from "react";
import { useNavigate } from "react-router-dom";

function Homepage() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.clear();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <h1 className="text-xl font-medium text-slate-400 mb-10 tracking-[0.2em] uppercase">
        Select Service
      </h1>

      <div className="flex flex-col md:flex-row gap-6 w-full max-w-4xl">
        {/* Room Allocation Button - Now linking to RoomBooking */}
        <button
          className="flex-1 group bg-white border-2 border-slate-100 p-10 rounded-[2rem] transition-all duration-300 hover:border-blue-500 hover:shadow-2xl hover:-translate-y-2"
          onClick={() => navigate("/room-booking")}
        >
          <div className="h-20 w-20 bg-blue-50 rounded-2xl flex items-center justify-center mb-6 mx-auto group-hover:bg-blue-600 transition-colors">
            <span className="text-3xl">🛏️</span>
          </div>

          <h2 className="text-2xl font-bold text-slate-800 mb-2">
            Room Allocation
          </h2>

          <p className="text-slate-500 text-sm">
            Book or manage your hostel room
          </p>
        </button>

        {/* Mess Payment Button */}
        <button
          className="flex-1 group bg-white border-2 border-slate-100 p-10 rounded-[2rem] transition-all duration-300 hover:border-orange-500 hover:shadow-2xl hover:-translate-y-2"
          onClick={() => navigate("/mess-payment")}
        >
          <div className="h-20 w-20 bg-orange-50 rounded-2xl flex items-center justify-center mb-6 mx-auto group-hover:bg-orange-600 transition-colors">
            <span className="text-3xl">🍽️</span>
          </div>

          <h2 className="text-2xl font-bold text-slate-800 mb-2">
            Mess Payment
          </h2>

          <p className="text-slate-500 text-sm">
            Pay bills and check food credits
          </p>
        </button>
      </div>

      <button 
        onClick={handleLogout}
        className="mt-12 text-slate-400 hover:text-slate-600 text-sm font-medium transition-colors"
      >
        Logout of account
      </button>
    </div>
  );
}

export default Homepage;