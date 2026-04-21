// Frontend/hostel/src/pages/RoomAllocation.jsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';
import jsPDF from 'jspdf';
import './RoomAllocation.css';

function RoomAllocation() {
  const [user, setUser] = useState(null);
  const [block, setBlock] = useState(null);
  const [floors, setFloors] = useState([]);
  const [selectedFloor, setSelectedFloor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  // Room type icons and colors
  const roomTypeConfig = {
    regular: { icon: '🛏️', color: 'bg-green-100', label: 'Available Room' },
    office: { icon: '📋', color: 'bg-blue-100', label: 'Office' },
    washroom: { icon: '🚻', color: 'bg-gray-100', label: 'Washroom' },
    common: { icon: '📺', color: 'bg-purple-100', label: 'Common Room' }
  };

  // Refresh rooms function - THIS IS KEY FOR UPDATING CAPACITY
  const refreshRooms = async () => {
    if (block) {
      console.log('🔄 Refreshing rooms data...');
      await fetchFloorsWithRooms(block.id);
    }
  };

  // Check for payment completion on return
  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const paymentCompleted = queryParams.get('payment_completed');
    const paymentSuccess = queryParams.get('payment_success');
    
    if (paymentCompleted === 'true' || paymentSuccess === 'true') {
      console.log('✅ Payment completed, refreshing room data...');
      refreshRooms();
      // Refresh booking data as well
      fetchUserBooking();
      // Clean URL
      navigate('/room-allocation', { replace: true });
    }
  }, [location.search]);

  // Back to Dashboard Function
  const handleBackToDashboard = () => {
    navigate('/homepage');
  };

  // PDF Download Function
  const downloadBookingPDF = () => {
    if (!booking) {
      alert("No booking details available");
      return;
    }

    try {
      const doc = new jsPDF();
      let yPos = 20;
      
      doc.setFontSize(20);
      doc.setTextColor(0, 51, 102);
      doc.text("HOSTEL BOOKING RECEIPT", 105, yPos, { align: "center" });
      
      yPos += 10;
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Generated on: ${new Date().toLocaleString()}`, 105, yPos, { align: "center" });
      
      yPos += 10;
      doc.line(20, yPos, 190, yPos);
      
      yPos += 15;
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      
      doc.setFont("helvetica", "bold");
      doc.text("STUDENT DETAILS", 20, yPos);
      yPos += 10;
      
      doc.setFont("helvetica", "normal");
      doc.text(`Name: ${user?.name || user?.full_name || user?.username || "N/A"}`, 25, yPos);
      yPos += 8;
      doc.text(`Year: ${user?.year || "N/A"} Year • ${user?.branch || "CSE"}`, 25, yPos);
      yPos += 8;
      doc.text(`Admission No: ${user?.admission || "N/A"}`, 25, yPos);
      
      yPos += 15;
      doc.setFont("helvetica", "bold");
      doc.text("BOOKING DETAILS", 20, yPos);
      yPos += 10;
      
      doc.setFont("helvetica", "normal");
      doc.text(`Hostel Block: ${booking.block_name || "N/A"}`, 25, yPos);
      yPos += 8;
      doc.text(`Room Number: ${booking.room_number || "N/A"}`, 25, yPos);
      yPos += 8;
      doc.text(`Booked On: ${booking.booking_date ? new Date(booking.booking_date).toLocaleDateString() : "N/A"}`, 25, yPos);
      yPos += 8;
      doc.text(`Payment Status: ${paymentStatus?.payment_status === 'completed' ? "Completed ✓" : "Pending"}`, 25, yPos);
      yPos += 8;
      doc.text(`Booking Status: Active`, 25, yPos);
      
      yPos += 25;
      doc.setFontSize(9);
      doc.setTextColor(150, 150, 150);
      doc.text("This is a computer-generated receipt. No signature required.", 105, yPos, { align: "center" });
      yPos += 7;
      doc.text("For any queries, contact hostel administration.", 105, yPos, { align: "center" });
      
      doc.setDrawColor(41, 128, 185);
      doc.setLineWidth(0.5);
      doc.rect(15, 15, 180, yPos + 10);
      
      const fileName = `Hostel_Booking_${booking.block_name}_Room${booking.room_number}_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      
      alert("✅ PDF downloaded successfully!");
      
    } catch (error) {
      console.error("PDF Error:", error);
      alert("Error generating PDF: " + error.message);
    }
  };

  useEffect(() => {
    const userData = localStorage.getItem('user');
    const token = localStorage.getItem('access');
    
    if (!userData || !token) {
      navigate('/login');
      return;
    }

    setUser(JSON.parse(userData));
    fetchUserBlock();
    fetchUserBooking();
  }, []);

  const checkPaymentStatus = async (bookingId) => {
    try {
      const token = localStorage.getItem('access');
      const response = await axios.get(`http://127.0.0.1:8000/api/payments/status/${bookingId}/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setPaymentStatus(response.data);
      
      if (response.data.payment_status === 'completed') {
        console.log('Payment completed! Refreshing rooms...');
        refreshRooms();
      }
    } catch (err) {
      console.log('No payment found');
    }
  };

  const fetchUserBlock = async () => {
    try {
      const token = localStorage.getItem('access');
      const response = await axios.get('http://127.0.0.1:8000/api/my-block/', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setBlock(response.data.block);
      await fetchFloorsWithRooms(response.data.block.id);
    } catch (err) {
      setError('Failed to load block information');
      console.error(err);
      setLoading(false);
    }
  };

  const fetchFloorsWithRooms = async (blockId) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('access');
      const response = await axios.get(`http://127.0.0.1:8000/api/block/${blockId}/floors/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setFloors(response.data.floors);
      console.log('✅ Rooms data refreshed:', response.data.floors);
    } catch (err) {
      setError('Failed to load rooms');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserBooking = async () => {
    try {
      const token = localStorage.getItem('access');
      const response = await axios.get('http://127.0.0.1:8000/api/my-booking/', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.message !== 'No active booking') {
        setBooking(response.data);
        checkPaymentStatus(response.data.id);
      }
    } catch (err) {
      console.log('No active booking');
    }
  };

  const handleBookRoom = async (roomId) => {
    try {
      const token = localStorage.getItem('access');
      const response = await axios.post('http://127.0.0.1:8000/api/book-room/', 
        { room_id: roomId },
        { headers: { Authorization: `Bearer ${token}` }}
      );
      
      alert('Room booked successfully! Please complete payment.');
      
      // Refresh rooms to update availability immediately
      await refreshRooms();
      
      // Navigate to payment page with booking ID and return flag
      const bookingId = response.data.booking.id;
      navigate(`/payment/${bookingId}?return_to=room-allocation`);
      
    } catch (err) {
      alert(err.response?.data?.error || 'Booking failed');
    }
  };

  const handleCancelBooking = async () => {
    if (!window.confirm('Are you sure you want to cancel your booking?')) return;

    try {
      const token = localStorage.getItem('access');
      await axios.post(`http://127.0.0.1:8000/api/cancel-booking/${booking.id}/`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      alert('Booking cancelled successfully');
      setBooking(null);
      setPaymentStatus(null);
      
      // Refresh floors to show updated availability
      if (block) {
        await fetchFloorsWithRooms(block.id);
      }
    } catch (err) {
      alert('Failed to cancel booking');
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading rooms...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Back to Dashboard Button */}
      <div className="max-w-7xl mx-auto mb-4">
        <button
          onClick={handleBackToDashboard}
          className="flex items-center gap-2 text-slate-600 hover:text-blue-600 transition-colors group bg-white px-4 py-2 rounded-lg shadow-sm"
        >
          <span className="text-xl group-hover:-translate-x-1 transition-transform">←</span>
          <span className="font-medium">Back to Dashboard</span>
        </button>
      </div>

      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              Welcome, {user?.name || user?.full_name || user?.username}!
            </h1>
            <p className="text-gray-600">
              Year {user?.year} • {user?.branch} • {user?.admission}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto">
        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6">
            {error}
          </div>
        )}

        {booking ? (
          // Show current booking
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-6">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold text-white">Active Booking</h2>
                  <p className="text-blue-100 mt-1">
                    {user?.year} Year • {user?.branch}
                  </p>
                </div>
                <div className={`${paymentStatus?.payment_status === 'completed' ? 'bg-green-500' : 'bg-yellow-500'} text-white px-4 py-2 rounded-full text-sm font-semibold shadow-lg flex items-center gap-2`}>
                  <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                  {paymentStatus?.payment_status === 'completed' ? 'Active ✓' : 'Payment Pending'}
                </div>
              </div>
            </div>

            <div className="p-8">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-slate-50 rounded-2xl p-5">
                  <p className="text-slate-400 text-sm uppercase tracking-wide mb-2">
                    Hostel Block
                  </p>
                  <p className="text-2xl font-bold text-gray-800">
                    {booking.block_name}
                  </p>
                  <div className="mt-2 w-12 h-1 bg-blue-500 rounded-full"></div>
                </div>

                <div className="bg-slate-50 rounded-2xl p-5">
                  <p className="text-slate-400 text-sm uppercase tracking-wide mb-2">
                    Room Number
                  </p>
                  <p className="text-2xl font-bold text-gray-800">
                    {booking.room_number}
                  </p>
                  <div className="mt-2 w-12 h-1 bg-blue-500 rounded-full"></div>
                </div>

                <div className="bg-slate-50 rounded-2xl p-5">
                  <p className="text-slate-400 text-sm uppercase tracking-wide mb-2">
                    Booked On
                  </p>
                  <p className="text-lg font-semibold text-gray-800">
                    {new Date(booking.booking_date).toLocaleDateString()}
                  </p>
                </div>

                <div className="bg-slate-50 rounded-2xl p-5">
                  <p className="text-slate-400 text-sm uppercase tracking-wide mb-2">
                    Payment Status
                  </p>
                  <p className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                    paymentStatus?.payment_status === 'completed' 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {paymentStatus?.payment_status === 'completed' ? 'Completed ✓' : 'Pending'}
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-gray-200 mt-4">
                {paymentStatus?.payment_status !== 'completed' && (
                  <button
                    onClick={() => navigate(`/payment/${booking.id}?return_to=room-allocation`)}
                    className="flex-1 bg-green-600 text-white py-3 rounded-xl font-semibold hover:bg-green-700 transition-all duration-300 flex items-center justify-center gap-2"
                  >
                    <span>💰</span>
                    Complete Payment
                  </button>
                )}

                <button
                  onClick={handleCancelBooking}
                  className="flex-1 bg-red-50 text-red-600 border-2 border-red-200 py-3 rounded-xl font-semibold hover:bg-red-600 hover:text-white hover:border-red-600 transition-all duration-300 flex items-center justify-center gap-2"
                >
                  <span>❌</span>
                  Cancel Booking
                </button>

                <button
                  onClick={downloadBookingPDF}
                  className="flex-1 bg-blue-50 text-blue-600 border-2 border-blue-200 py-3 rounded-xl font-semibold hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all duration-300 flex items-center justify-center gap-2"
                >
                  <span>📄</span>
                  Download PDF Receipt
                </button>
              </div>

              <div className="mt-6 pt-4 text-center border-t border-gray-100">
                <button
                  onClick={handleBackToDashboard}
                  className="text-slate-500 hover:text-blue-600 transition-colors inline-flex items-center gap-1 text-sm"
                >
                  <span className="text-lg">←</span>
                  Back to Dashboard 
                </button>
              </div>
            </div>
          </div>
        ) : (
          // Show room selection
          <div>
            {block && (
              <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-6 rounded-xl shadow-lg mb-8">
                <h2 className="text-3xl font-bold mb-2">{block.display_name}</h2>
                <p className="text-lg opacity-90">
                  {user?.year === 1 && "1st Year Students - Orange Hostel"}
                  {user?.year === 2 && "2nd Year Students - Meta H Hostel"}
                  {user?.year === 3 && "3rd Year Students - Alumini Hostel"}
                  {user?.year === 4 && "4th Year Students - Orange Hostel"}
                </p>
              </div>
            )}

            {/* Legend */}
            <div className="bg-white p-4 rounded-lg shadow mb-6 flex gap-4 flex-wrap">
              {Object.entries(roomTypeConfig).map(([key, config]) => (
                <div key={key} className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded ${config.color}`}></div>
                  <span>{config.icon} {config.label}</span>
                </div>
              ))}
              <div className="flex items-center gap-2 ml-auto">
                <div className="w-6 h-6 rounded bg-yellow-100 border-2 border-yellow-500"></div>
                <span>✨ Selected</span>
              </div>
            </div>

            {/* Floor Selector */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Floor:
              </label>
              <select
                className="w-full md:w-64 p-3 border rounded-lg"
                onChange={(e) => setSelectedFloor(Number(e.target.value))}
                value={selectedFloor || ''}
              >
                <option value="">Choose a floor</option>
                {floors.map(floor => (
                  <option key={floor.floor_id} value={floor.floor_number}>
                    Floor {floor.floor_number === 0 ? 'Ground' : floor.floor_number}
                  </option>
                ))}
              </select>
            </div>

            {/* Rooms Display */}
            {selectedFloor !== null && (
              <div className="space-y-6">
                {floors
                  .filter(f => f.floor_number === selectedFloor)
                  .map(floor => (
                    <div key={floor.floor_id} className="bg-white rounded-xl shadow-lg p-6">
                      <h3 className="text-xl font-semibold mb-4">
                        Floor {floor.floor_number === 0 ? 'Ground' : floor.floor_number} - Room Layout
                      </h3>
                      
                      {/* Screen */}
                      <div className="w-full bg-gray-800 text-white text-center py-2 rounded-lg mb-8">
                        🎬 FRONT DESK / ENTRANCE 🎬
                      </div>

                      {/* Room Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                        {floor.rooms.map(room => {
                          const config = roomTypeConfig[room.room_type] || roomTypeConfig.regular;
                          const isBooked = booking?.room?.id === room.id;
                          
                          return (
                            <div
                              key={room.id}
                              className={`
                                relative p-4 rounded-lg border-2 transition-all
                                ${config?.color || 'bg-gray-50'}
                                ${isBooked ? 'border-yellow-500 scale-105 shadow-lg' : 'border-gray-200'}
                                ${room.room_type === 'regular' && room.is_available && !isBooked ? 'cursor-pointer hover:border-green-500 hover:shadow-md' : ''}
                                ${room.room_type !== 'regular' ? 'opacity-75' : ''}
                              `}
                              onClick={() => {
                                if (room.room_type === 'regular' && room.is_available && !isBooked) {
                                  if (window.confirm(`Book Room ${room.room_number}?`)) {
                                    handleBookRoom(room.id);
                                  }
                                }
                              }}
                            >
                              <div className="text-lg font-bold mb-2">
                                {room.room_number}
                              </div>

                              <div className="text-3xl mb-2">
                                {config?.icon}
                              </div>

                              <div className="text-sm text-gray-600">
                                {config?.label}
                              </div>

                              {room.room_type === 'regular' && (
                                <div className="mt-2 text-sm">
                                  <span className="font-semibold">
                                    {room.available_beds}/{room.capacity}
                                  </span>
                                  <span className="text-gray-500"> beds</span>
                                  {!room.is_available && (
                                    <div className="text-red-500 font-semibold mt-1">
                                      FULL
                                    </div>
                                  )}
                                </div>
                              )}

                              {isBooked && (
                                <div className="absolute top-0 right-0 bg-yellow-500 text-white text-xs px-2 py-1 rounded-bl-lg rounded-tr-lg">
                                  YOUR ROOM
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      <div className="flex justify-between mt-6 text-sm text-gray-500">
                        <span>⬅️ LEFT WING</span>
                        <span>➡️ RIGHT WING</span>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default RoomAllocation;