import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

const RoomBooking = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [activeBooking, setActiveBooking] = useState(null);
  const [blockInfo, setBlockInfo] = useState(null);
  const [floors, setFloors] = useState([]);

  useEffect(() => {
    checkInitialStatus();
  }, []);

  const checkInitialStatus = async () => {
    try {
      // 1. Check if the student already has an active booking
      // ✅ FIX: Used optional chaining to satisfy SonarLint
      const bookingRes = await api.get("/my-booking/");
      if (bookingRes.data?.id) {
        setActiveBooking(bookingRes.data);
        setLoading(false);
        return;
      }
    } catch (err) {
      // ✅ FIX: Logged error to satisfy no-unused-vars and handle exception
      console.warn("No active booking found or fetch failed:", err);
    }

    try {
      // 2. Fetch the specific block assigned to this student's year
      const blockRes = await api.get("/my-block/");
      const blockData = blockRes.data.block;
      setBlockInfo(blockData);

      // 3. Fetch all floors and rooms inside that block
      // ✅ FIX: Used optional chaining
      if (blockData?.id) {
        const floorsRes = await api.get(`/blocks/${blockData.id}/floors/`);
        setFloors(floorsRes.data.floors || []);
      }
    } catch (err) {
      setError(
        err.response?.data?.error || 
        "Failed to load room data. Please ensure your profile is fully complete first."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleBookRoom = async (room) => {
    const confirmMessage = `Are you sure you want to book Room ${room.room_number}?`;
    // ✅ FIX: Prefer globalThis over window
    if (!globalThis.confirm(confirmMessage)) return;

    setLoading(true);
    try {
      const res = await api.post("/book-room/", { room_id: room.id });
      alert("Room booked successfully!");
      setActiveBooking(res.data.booking);
    } catch (err) {
      alert(err.response?.data?.error || "Failed to book the room. It might be full.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <h2 className="text-2xl font-black text-[#002147] animate-pulse uppercase tracking-widest">
          Loading...
        </h2>
      </div>
    );
  }

  if (activeBooking) {
    return (
      <div className="min-h-screen bg-slate-50 py-12 px-4">
        <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-xl border-t-8 border-green-600 p-8 text-center">
          <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-3xl font-black text-[#002147] uppercase tracking-tighter mb-2">
            Booking Confirmed
          </h2>
          <p className="text-slate-500 mb-8 font-medium">Your hostel room has been successfully allocated.</p>
          
          <div className="grid grid-cols-2 gap-4 text-left bg-slate-50 p-6 rounded-lg border border-slate-200 mb-8">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase">Hostel Block</p>
              <p className="text-lg font-bold text-slate-800">{activeBooking.block_name}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase">Room Number</p>
              <p className="text-lg font-bold text-[#002147]">{activeBooking.room_number}</p>
            </div>
          </div>

          <button 
            onClick={() => navigate(`/payment/${activeBooking.id}`)}
            className="w-full md:w-auto bg-[#002147] hover:bg-[#003366] text-white font-bold py-3 px-10 rounded shadow-lg uppercase tracking-widest transition"
          >
            Proceed to Payment
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="max-w-6xl mx-auto">
        
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8 flex flex-col md:flex-row justify-between items-center">
          <div>
            <h1 className="text-2xl font-black text-[#002147] uppercase tracking-tight">Room Allocation</h1>
            <p className="text-slate-500 text-sm font-medium">Select an available room to confirm your booking.</p>
          </div>
          {blockInfo && (
            <div className="mt-4 md:mt-0 bg-[#002147] text-white px-6 py-2 rounded-full font-bold shadow-md">
              {blockInfo.display_name}
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-8 text-center font-bold border border-red-200">
            {error}
          </div>
        )}

        <div className="space-y-10">
          {floors.map((floor) => (
            <div key={floor.floor_id} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <h3 className="text-lg font-black text-slate-800 border-b border-slate-100 pb-3 mb-6 uppercase tracking-wider">
                Floor {floor.floor_number}
              </h3>
              
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
                {floor.rooms.map((room) => (
                  <button
                    key={room.id}
                    disabled={room.is_full}
                    onClick={() => handleBookRoom(room)}
                    className={`
                      relative p-4 rounded-lg text-center transition-all duration-200 border-2
                      ${room.is_full 
                        ? "bg-red-50 border-red-100 cursor-not-allowed opacity-75" 
                        : "bg-white border-green-200 hover:border-green-500 hover:shadow-md cursor-pointer hover:-translate-y-1"
                      }
                    `}
                  >
                    <span className={`block text-xl font-black ${room.is_full ? 'text-red-400' : 'text-slate-800'}`}>
                      {room.room_number}
                    </span>
                    
                    <span className={`block text-[10px] font-bold uppercase mt-1 ${room.is_full ? 'text-red-400' : 'text-green-600'}`}>
                      {room.is_full ? "Full" : `${room.available_beds} Beds Left`}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))}

          {floors.length === 0 && !error && !loading && (
            <div className="text-center py-20 text-slate-400 font-bold uppercase tracking-widest">
              No rooms available for your allocated block at this time.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RoomBooking;