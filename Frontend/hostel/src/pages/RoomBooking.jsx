import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from 'react-toastify';
import { hostelApi as api } from "../services/api";

const RoomBooking = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [activeFloor, setActiveFloor] = useState(0);

  const [activeBooking, setActiveBooking] = useState(null);
  const [blockInfo, setBlockInfo] = useState(null);
  const [floors, setFloors] = useState([]);
  const [allowedFloors, setAllowedFloors] = useState([]);

  // Force room disable when user has confirmed booking
  const hasConfirmedBooking = activeBooking?._status === 'confirmed';

  useEffect(() => {
    checkInitialStatus();
  }, []);

const checkInitialStatus = async () => {
    try {
      console.log("Checking booking status...");
      const bookingRes = await api.get("/my-booking/");
      console.log("Booking response:", bookingRes.status, bookingRes.data);
      
      // Handle 404 as "no booking" - not an error
      if (bookingRes.status === 404) {
        console.log("No booking found - 404 is OK");
        // Continue to load room list
      } else if (bookingRes.data?.status === 'confirmed' && bookingRes.data?.booking) {
        console.log("Confirmed booking found:", bookingRes.data.booking);
        setActiveBooking({
          ...bookingRes.data.booking,
          _status: 'confirmed'
        });
        setLoading(false);
        setError("");
        return; // STOP - don't load room list
      } else if (bookingRes.data?.status === 'pending') {
        console.log("Pending booking found");
        setActiveBooking({
          id: bookingRes.data.booking_id,
          block_name: blockInfo?.display_name || "Reserved Block",
          room_number: "Room Locked for Payment",
          _status: 'pending'
        });
        setLoading(false);
        setError("");
        return; // STOP - don't load room list
      }
    } catch (err) {
      console.log("Error getting booking:", err.response?.status, err.response?.data);
      // If 404, that's OK - no booking exists
      if (err.response?.status === 404) {
        console.log("No booking - 404 error is fine");
      } else {
        console.warn("No active booking found or fetch failed:", err);
      }
    }

    // Only load room list if NO confirmed booking exists
    try {
      const blockRes = await api.get("/my-block/");
      const blockData = blockRes.data.block;
      setBlockInfo(blockData);
      setFloors(blockRes.data.floors || []);
      setAllowedFloors(blockRes.data.allowed_floors || []);
      if (blockRes.data.allowed_floors?.length > 0) {
        setActiveFloor(blockRes.data.allowed_floors[0]);
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
    // First check: if user already has confirmed booking, redirect or show strong error
    if (hasConfirmedBooking) {
      toast.error(`You already have Room ${activeBooking.room_number} booked! Cannot book another room.`);
      navigate('/homepage');
      return;
    }
    
    const roomNumber = room.room_number;
    setConfirmAction({
      message: `Are you sure you want to reserve Room ${roomNumber}?`,
      execute: async () => {
        setShowConfirmModal(false);
        setLoading(true);
        try {
          const res = await api.post("/book-room/", { room_id: room.id });
          if (res.data.booking_id) {
            setActiveBooking({
              id: res.data.booking_id,
              block_name: blockInfo?.display_name || "Hostel Block",
              room_number: roomNumber,
              _status: 'pending'
            });
          }
        } catch (err) {
          toast.error(err.response?.data?.error || "Failed to book the room. It might be full.");
          checkInitialStatus();
        } finally {
          setLoading(false);
        }
      }
    });
    setShowConfirmModal(true);
  };

  const handleCancelBooking = async () => {
    setConfirmAction({
      message: "Are you sure you want to cancel this reservation and choose another room?",
      execute: async () => {
        setShowConfirmModal(false);
        setLoading(true);
        try {
          await api.post(`/cancel-booking/${activeBooking.id}/`);
          setActiveBooking(null);
          await checkInitialStatus();
        } catch (err) {
          toast.error("Failed to cancel the reservation.");
        } finally {
          setLoading(false);
        }
      }
    });
    setShowConfirmModal(true);
  };

  const ConfirmModal = () => showConfirmModal && confirmAction ? (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-8 max-w-md mx-4 shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
          </div>
          <h3 className="text-2xl font-bold text-slate-800 mb-3">Confirm Reservation</h3>
          <p className="text-slate-600 mb-8 text-lg">{confirmAction.message}</p>
          <div className="flex gap-4">
            <button 
              onClick={() => setShowConfirmModal(false)}
              className="flex-1 px-6 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-all"
            >
              Cancel
            </button>
            <button 
              onClick={confirmAction.execute}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg"
            >
              Confirm
            </button>
          </div>
        </div>
      </div>
    </div>
  ) : null;

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <div className="relative">
          <div className="w-20 h-20 border-4 border-slate-200 rounded-full"></div>
          <div className="absolute top-0 left-0 w-20 h-20 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
        </div>
        <h2 className="mt-6 text-xl font-bold text-slate-700 uppercase tracking-widest">Loading Rooms...</h2>
        <ConfirmModal />
      </div>
    );
  }

  if (activeBooking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-8 py-12 text-center">
              <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur">
                <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-3xl font-black text-white uppercase tracking-tight">
                {activeBooking._status === 'confirmed' ? "Booking Confirmed!" : "Room Reserved"}
              </h2>
            </div>
            
            <div className="p-8">
              <p className="text-slate-600 mb-8 text-center text-lg">
                {activeBooking._status === 'confirmed' 
                  ? "Your hostel room has been successfully allocated." 
                  : "We have locked this bed for you! Please complete your payment to finalize the booking."}
              </p>
              
              <div className="grid grid-cols-2 gap-6 bg-gradient-to-br from-slate-50 to-slate-100 p-6 rounded-2xl mb-8">
                <div className="text-center p-4 bg-white rounded-xl shadow-sm">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Hostel Block</p>
                  <p className="text-xl font-black text-slate-800">{activeBooking.block_name}</p>
                </div>
                <div className="text-center p-4 bg-white rounded-xl shadow-sm">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Room Number</p>
                  <p className="text-xl font-black text-green-600">{activeBooking.room_number}</p>
                </div>
              </div>

              {activeBooking._status !== 'confirmed' ? (
                <div className="flex flex-col sm:flex-row justify-center gap-4">
                  <button 
                    onClick={() => navigate(`/payment/${activeBooking.id}`)}
                    className="flex-1 sm:flex-none px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold py-3 px-8 rounded-xl shadow-lg transition-all transform hover:scale-105"
                  >
                    <span className="flex items-center justify-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      Proceed to Payment
                    </span>
                  </button>
                  
                  <button 
                    onClick={handleCancelBooking}
                    className="flex-1 sm:flex-none px-6 py-3 border-2 border-red-400 text-red-500 hover:bg-red-50 font-bold rounded-xl transition-all"
                  >
                    Change Room
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => navigate('/homepage')}
                  className="w-full px-8 py-4 bg-gradient-to-r from-slate-800 to-slate-900 text-white font-bold rounded-xl shadow-lg transition-all transform hover:scale-105"
                >
                  Go to Homepage
                </button>
              )}
            </div>
          </div>
        </div>
        <ConfirmModal />
      </div>
    );
  }

  const currentFloor = floors.find(f => f.floor_number === activeFloor) || floors[0];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        
        {/* Header Block */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden mb-8">
          <div className="bg-gradient-to-r from-[#002147] to-slate-800 px-8 py-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <div>
                <h1 className="text-3xl font-black text-white uppercase tracking-tight flex items-center gap-3">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  Room Allocation
                </h1>
                <p className="text-slate-300 text-sm font-medium mt-1">Select an available room to reserve your hostel bed</p>
              </div>
              {blockInfo && (
                <div className="flex items-center gap-3 bg-white/10 backdrop-blur px-6 py-3 rounded-xl">
                  <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-white font-bold">{blockInfo.display_name}</span>
                  <span className="text-slate-300 text-sm">•</span>
                  <span className="text-slate-300 text-sm">Floors {allowedFloors.join(', ')}</span>
                  <button 
                    onClick={() => { setLoading(true); checkInitialStatus(); }}
                    className="ml-2 px-3 py-1 bg-white/20 hover:bg-white/30 text-white text-xs font-bold rounded-lg transition"
                  >
                    🔄 Refresh
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Floor Tabs */}
          <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
            <div className="flex gap-3 overflow-x-auto pb-2">
              {allowedFloors.map((floorNo) => (
                <button
                  key={floorNo}
                  onClick={() => setActiveFloor(floorNo)}
                  className={`px-6 py-3 rounded-xl font-bold transition-all whitespace-nowrap ${
                    activeFloor === floorNo
                      ? 'bg-[#002147] text-white shadow-lg'
                      : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
                  }`}
                >
                  Floor {floorNo}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 mb-8 text-center">
            <div className="flex items-center justify-center gap-3 text-red-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-bold text-lg">{error}</span>
            </div>
          </div>
        )}

        {/* Rooms Grid */}
        {currentFloor && (
          <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
            <div className="px-8 py-6 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <span className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center text-white text-sm font-black">
                  {currentFloor.floor_number}
                </span>
                Floor {currentFloor.floor_number}
              </h2>
              <p className="text-slate-500 text-sm mt-1">{currentFloor.rooms?.length || 0} rooms available</p>
            </div>

            <div className="p-8">
              {!currentFloor.rooms || currentFloor.rooms.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                    </svg>
                  </div>
                  <p className="text-slate-400 font-bold text-lg uppercase tracking-wider">No rooms on this floor</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-4">
                  {currentFloor.rooms.map((room) => (
                    <button
                      key={room.id}
                      disabled={room.is_full || hasConfirmedBooking}
                      onClick={() => handleBookRoom(room)}
                      className={`
                        group relative p-4 rounded-2xl text-center transition-all duration-300 border-2
                        ${hasConfirmedBooking || room.is_full 
                          ? 'bg-slate-50 border-slate-100 cursor-not-allowed opacity-60' 
                          : 'bg-white border-slate-200 hover:border-green-400 hover:shadow-xl hover:-translate-y-2 cursor-pointer'
                        }
                      `}
                    >
                      <div className={`absolute top-3 right-3 w-4 h-4 rounded-full ${
                        hasConfirmedBooking ? 'bg-yellow-400' : room.is_full ? 'bg-red-400' : 'bg-green-400'
                      }`}></div>
                      
                      <div className={`text-2xl font-black mb-2 ${room.is_full || hasConfirmedBooking ? 'text-slate-300' : 'text-slate-800 group-hover:text-[#002147]'}`}>
                        {room.room_number}
                      </div>
                      
                      <div className={`text-xs font-bold uppercase tracking-wider ${
                        hasConfirmedBooking ? 'text-yellow-600' : room.is_full ? 'text-red-400' : 'text-green-600'
                      }`}>
                        {hasConfirmedBooking ? 'Booked' : room.is_full ? 'Full' : `${room.available_beds} Bed${room.available_beds > 1 ? 's' : ''}`}
                      </div>

                      {!room.is_full && !hasConfirmedBooking && (
                        <div className="mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                          <span className="inline-block px-3 py-1 bg-green-500 text-white text-xs font-bold rounded-full">
                            Book Now
                          </span>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {floors.length === 0 && !error && !loading && (
          <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-16 text-center">
            <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-12 h-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-slate-700 mb-2">No Rooms Available</h3>
            <p className="text-slate-500">No rooms available for your allocated block at this time.</p>
          </div>
        )}

        {/* Legend */}
        <div className="mt-8 flex justify-center gap-8">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-400 rounded-full"></div>
            <span className="text-slate-600 font-medium text-sm">Available</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-400 rounded-full"></div>
            <span className="text-slate-600 font-medium text-sm">Full</span>
          </div>
        </div>

        <ConfirmModal />
      </div>
    </div>
  );
};

export default RoomBooking;