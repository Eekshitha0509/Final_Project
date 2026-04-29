// src/pages/Homepage.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

function Homepage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(null);

  useEffect(() => {
    fetchBooking();
  }, []);

  const fetchBooking = async () => {
    try {
      const token = localStorage.getItem('access');
      if (!token) {
        setLoading(false);
        return;
      }
      
      const res = await fetch('http://127.0.0.1:8000/api/app/my-booking/', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!res.ok) {
        console.log("API error:", res.status);
        setLoading(false);
        return;
      }
      
      const data = await res.json();
      console.log("Booking data:", data);
      if (data?.booking) {
        setBooking(data.booking);
      }
    } catch (err) {
      console.log("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    localStorage.removeItem("user");
    localStorage.removeItem("role");
    localStorage.clear();
    window.dispatchEvent(new Event("logout"));
    navigate("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      
      {/* --- MAIN CONTENT AREA --- */}
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <h1 className="text-xl font-bold text-slate-400 mb-10 tracking-[0.2em] uppercase">
          Select Service
        </h1>

        <div className="flex flex-col md:flex-row gap-6 w-full max-w-4xl">
          {/* Room Allocation Button */}
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
              {booking?.room_number ? `Room ${booking.room_number}` : "Book your hostel room"}
            </p>
          </button>

          {/* Mess Payment Button */}
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