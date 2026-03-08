// Frontend/hostel/src/pages/RoomAllocation.jsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './RoomAllocation.css';

function RoomAllocation() {
  const [user, setUser] = useState(null);
  const [block, setBlock] = useState(null);
  const [floors, setFloors] = useState([]);
  const [selectedFloor, setSelectedFloor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(null);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Room type icons and colors
  const roomTypeConfig = {
    regular: { icon: '🛏️', color: 'bg-green-100', label: 'Available Room' },
    office: { icon: '📋', color: 'bg-blue-100', label: 'Office' },
    washroom: { icon: '🚻', color: 'bg-gray-100', label: 'Washroom' },
    common: { icon: '📺', color: 'bg-purple-100', label: 'Common Room' }
  };

  useEffect(() => {
    // Check if user is logged in
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

  const fetchUserBlock = async () => {
    try {
      const token = localStorage.getItem('access');
      const response = await axios.get('http://127.0.0.1:8000/api/my-block/', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setBlock(response.data.block);
      fetchFloorsWithRooms(response.data.block.id);
    } catch (err) {
      setError('Failed to load block information');
      console.error(err);
    }
  };

  const fetchFloorsWithRooms = async (blockId) => {
    try {
      const token = localStorage.getItem('access');
      const response = await axios.get(`http://127.0.0.1:8000/api/block/${blockId}/floors/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setFloors(response.data.floors);
      setLoading(false);
    } catch (err) {
      setError('Failed to load rooms');
      console.error(err);
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
      }
    } catch (err) {
      // No booking found - that's fine
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
      
      alert('Room booked successfully!');
      setBooking(response.data.booking);
      
      // Refresh floors to update availability
      if (block) {
        fetchFloorsWithRooms(block.id);
      }
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
      
      // Refresh floors
      if (block) {
        fetchFloorsWithRooms(block.id);
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
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              You have an active booking!
            </h2>
            <div className="bg-blue-50 p-6 rounded-lg max-w-md mx-auto">
              <p className="text-lg mb-2">
                <span className="font-semibold">Block:</span> {booking.block_name}
              </p>
              <p className="text-lg mb-2">
                <span className="font-semibold">Room:</span> {booking.room_number}
              </p>
              <p className="text-lg mb-4">
                <span className="font-semibold">Booked on:</span>{' '}
                {new Date(booking.booking_date).toLocaleDateString()}
              </p>
              <button
                onClick={handleCancelBooking}
                className="bg-red-500 text-white px-6 py-2 rounded hover:bg-red-600"
              >
                Cancel Booking
              </button>
            </div>
          </div>
        ) : (
          // Show room selection
          <div>
            {/* Block Info */}
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

            {/* Rooms Display - Cinema Style */}
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
                              {/* Room Number */}
                              <div className="text-lg font-bold mb-2">
                                {room.room_number}
                              </div>

                              {/* Room Icon */}
                              <div className="text-3xl mb-2">
                                {config?.icon}
                              </div>

                              {/* Room Type */}
                              <div className="text-sm text-gray-600">
                                {config?.label}
                              </div>

                              {/* Capacity/Availability */}
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

                              {/* Selected Badge */}
                              {isBooked && (
                                <div className="absolute top-0 right-0 bg-yellow-500 text-white text-xs px-2 py-1 rounded-bl-lg rounded-tr-lg">
                                  YOUR ROOM
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Aisle Labels */}
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