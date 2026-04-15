import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import jsPDF from "jspdf";
import "jspdf-autotable";

const RoomBooking = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedBlock, setSelectedBlock] = useState(null);
  const [selectedFloor, setSelectedFloor] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [showPayment, setShowPayment] = useState(false);
  const [user, setUser] = useState(null);
  const [bookingData, setBookingData] = useState(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [roomFilter, setRoomFilter] = useState(null);
  const [wingFilter, setWingFilter] = useState(null);
  const [availableFloors, setAvailableFloors] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const [floorData, setFloorData] = useState({});
  const [realRooms, setRealRooms] = useState([]);
  const [authError, setAuthError] = useState(false);

  // Create authenticated axios instance
  const authAxios = () => {
    const token = localStorage.getItem('access_token') || localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    
    const instance = axios.create({
      baseURL: 'http://127.0.0.1:8000',
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json'
      },
      timeout: 10000,
    });

    instance.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          console.error('Authentication failed.');
          setAuthError(true);
          localStorage.removeItem('access_token');
          localStorage.removeItem('authToken');
          sessionStorage.removeItem('authToken');
          setTimeout(() => {
            navigate('/login/student');
          }, 2000);
        }
        return Promise.reject(error);
      }
    );

    return instance;
  };

  // Refresh rooms function - KEY FOR UPDATING CAPACITY
  const refreshRoomsForCurrentFloor = async () => {
    if (selectedBlock && selectedFloor !== null) {
      console.log('🔄 Refreshing rooms data...');
      await fetchRoomsForCurrentFloor();
    }
  };

  // Check for payment completion on return
  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const fromPayment = queryParams.get('from');
    const paymentStatus = queryParams.get('payment_status');
    const paymentSuccess = queryParams.get('payment_success');
    
    if ((fromPayment === 'payment' && paymentStatus === 'success') || paymentSuccess === 'true') {
      console.log('✅ Payment completed, refreshing room data...');
      refreshRoomsForCurrentFloor();
      // Clean URL
      navigate('/room-booking', { replace: true });
    }
  }, [location.search]);

  useEffect(() => {
    const userData = localStorage.getItem("user");
    const token = localStorage.getItem('access_token') || localStorage.getItem('authToken');
    
    if (!userData || !token) {
      console.log("No user data or token found, redirecting to login");
      navigate("/login/student");
      return;
    }
    
    try {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
      setUserRestrictions(parsedUser);
      fetchBlocksFromBackend();
    } catch (error) {
      console.error("Error parsing user data:", error);
      navigate("/login/student");
    }
  }, [navigate]);

  // Fetch rooms when floor changes
  useEffect(() => {
    if (selectedBlock && selectedFloor !== null) {
      fetchRoomsForCurrentFloor();
    }
  }, [selectedBlock, selectedFloor]);

  const fetchBlocksFromBackend = async () => {
    try {
      const api = authAxios();
      const response = await api.get('/hostel/blocks/');
      console.log("✅ Blocks loaded from backend:", response.data);
      
      const transformedBlocks = response.data.map(block => ({
        id: block.id,
        name: block.name,
        display_name: block.display_name
      }));
      
      setBlocks(transformedBlocks);
    } catch (error) {
      console.error('Error fetching blocks:', error);
      
      if (error.response?.status === 401) {
        setAuthError(true);
        alert('Your session has expired. Please login again.');
        navigate('/login/student');
        return;
      }
      
      console.log("Using fallback block data");
      setBlocks([
        { id: 1, name: 'orange', display_name: 'Orange Hostel' },
        { id: 2, name: 'meta', display_name: 'Meta H Hostel' },
        { id: 3, name: 'alumini', display_name: 'Alumini Hostel' }
      ]);
    }
  };

  const fetchFloorsForBlock = async (blockId) => {
    try {
      setLoading(true);
      const api = authAxios();
      const response = await api.get(`/hostel/block/${blockId}/floors/`);
      
      const floorsMap = {};
      response.data.floors.forEach(floor => {
        floorsMap[floor.floor_number] = floor;
      });
      setFloorData(floorsMap);
      console.log("✅ Floors loaded:", floorsMap);
      
    } catch (error) {
      console.error('Error fetching floors:', error);
      if (error.response?.status === 401) {
        setAuthError(true);
        navigate('/login/student');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchRoomsForCurrentFloor = async () => {
    if (!selectedBlock || selectedFloor === null) return;
    
    try {
      setLoading(true);
      
      const floorNumber = selectedFloor === 0 ? 0 : selectedFloor;
      const api = authAxios();
      
      console.log(`🔄 Fetching rooms for block: ${selectedBlock}, floor: ${floorNumber}`);
      
      const response = await api.get(
        `/hostel/block/${selectedBlock}/floor/${floorNumber}/rooms/`
      );
      
      console.log("✅ Rooms loaded from DB:", response.data);
      setRealRooms(response.data);
      
    } catch (error) {
      console.error("❌ Error loading rooms:", error.response?.data || error.message);
      
      if (error.response?.status === 401) {
        setAuthError(true);
        navigate('/login/student');
        return;
      }
      
      // Clear rooms on error
      setRealRooms([]);
    } finally {
      setLoading(false);
    }
  };

  const setUserRestrictions = (user) => {
    const userYear = user.year;

    if (userYear === 1) {
      setSelectedBlock("orange");
      setSelectedFloor(0);
    } else if (userYear === 2) {
      setSelectedBlock("meta");
      setSelectedFloor(0);
    } else if (userYear === 3) {
      setSelectedBlock("alumini");
      setSelectedFloor(0);
    } else if (userYear === 4) {
      setSelectedBlock("orange");
      setSelectedFloor(4);
    }
  };

  const getBlockIdFromName = (blockName) => {
    const blockMap = {
      'orange': 1,
      'meta': 2,
      'alumini': 3
    };
    return blockMap[blockName];
  };

  const handleBlockChange = (block) => {
    setSelectedBlock(block);
    const userYear = user?.year;
    
    if (userYear === 1 && block === "orange") {
      setSelectedFloor(0);
    } else if (userYear === 2 && block === "meta") {
      setSelectedFloor(0);
    } else if (userYear === 3 && block === "alumini") {
      setSelectedFloor(0);
    } else if (userYear === 4 && block === "orange") {
      setSelectedFloor(4);
    } else {
      setSelectedFloor(null);
    }
    
    setSelectedRoom(null);
    setRoomFilter(null);
    setWingFilter(null);
    setRealRooms([]); // Clear rooms when changing block
    
    const blockId = getBlockIdFromName(block);
    if (blockId) {
      fetchFloorsForBlock(blockId);
    }
  };

  const handleRoomSelect = (room) => {
    if (room.available_beds > 0) {
      console.log("Selected room:", room);
      setSelectedRoom({
        number: room.room_number,
        capacity: room.capacity,
        available_beds: room.available_beds,
        type: room.room_type,
        price: room.price_per_semester,
        id: room.id
      });
      setShowPayment(true);
    }
  };

  const handlePayment = async () => {
    setShowPayment(false);
    
    try {
      const floorNumber = selectedFloor === 0 ? 0 : selectedFloor;
      const api = authAxios();
      
      console.log("🔍 Getting rooms for:", selectedBlock, "floor", floorNumber);
      
      let roomsOnFloor = [];
      try {
        const roomsResponse = await api.get(
          `/hostel/block/${selectedBlock}/floor/${floorNumber}/rooms/`
        );
        roomsOnFloor = roomsResponse.data;
        console.log("✅ Database rooms:", roomsOnFloor);
      } catch (error) {
        console.log("Error fetching rooms:", error);
        alert("Unable to fetch room data. Please try again.");
        return;
      }
      
      const matchingRoom = roomsOnFloor.find(
        room => String(room.room_number) === String(selectedRoom.number)
      );
      
      if (!matchingRoom) {
        alert(`❌ Room ${selectedRoom.number} not found in database. Please refresh and try again.`);
        setShowPayment(false);
        setSelectedRoom(null);
        return;
      }
      
      console.log("✅ Found room with DB ID:", matchingRoom.id);
      
      try {
        const bookingResponse = await api.post("/hostel/book-room/", {
          room_id: matchingRoom.id,
        });

        console.log("✅ Booking successful:", bookingResponse.data);
        
        // REFRESH ROOMS IMMEDIATELY AFTER BOOKING
        await refreshRoomsForCurrentFloor();
        
        const bookingData = bookingResponse.data.booking;
        
        if (!bookingData.id || isNaN(bookingData.id)) {
          throw new Error("Invalid booking ID received");
        }
        
        console.log("🔄 Redirecting to payment page for booking ID:", bookingData.id);
        navigate(`/payment/${bookingData.id}?from=booking&return_to=room-booking`);
        
      } catch (bookingError) {
        console.error("❌ Booking API error:", bookingError);
        
        if (bookingError.response?.status === 401) {
          alert('Session expired. Please login again.');
          navigate('/login/student');
          return;
        }
        
        const errorMsg = bookingError.response?.data?.error || 
                         bookingError.response?.data?.message || 
                         "Room booking failed. The room might be already booked or unavailable.";
        
        alert(`❌ ${errorMsg}`);
        setShowPayment(false);
        setSelectedRoom(null);
      }

    } catch (error) {
      console.error("❌ BOOKING ERROR:", error);
      
      if (error.response?.status === 401) {
        alert('Session expired. Please login again.');
        navigate('/login/student');
      } else if (error.response) {
        alert(`❌ Error ${error.response.status}: ${error.response.data?.error || JSON.stringify(error.response.data)}`);
      } else {
        alert(`❌ Error: ${error.message}`);
      }
      setShowPayment(false);
      setSelectedRoom(null);
    }
  };

  const handleBackToDashboard = () => {
    navigate("/");
  };

  const downloadBookingPDF = () => {
    if (!user) {
      alert("User information not available");
      return;
    }

    const doc = new jsPDF();
    
    doc.setFontSize(20);
    doc.setTextColor(0, 51, 102);
    doc.text("HOSTEL ROOM BOOKING STATUS", 105, 20, { align: "center" });
    
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 105, 30, { align: "center" });
    
    doc.line(20, 35, 190, 35);
    
    const blockName = selectedBlock ? selectedBlock.toUpperCase() : "Not Selected";
    const floorDisplay = selectedFloor === 0 ? "Ground Floor" : (selectedFloor ? `Floor ${selectedFloor}` : "Not Selected");
    const roomDisplay = selectedRoom ? selectedRoom.number : "Not Selected";
    const roomCapacity = selectedRoom ? `${selectedRoom.capacity} ${selectedRoom.capacity === 10 ? "beds (Hall)" : "sharing"}` : "N/A";
    const roomPrice = selectedRoom ? `₹${selectedRoom.price}/semester` : "N/A";
    
    doc.autoTable({
      startY: 45,
      head: [["Detail", "Information"]],
      body: [
        ["Student Name", user?.name || user?.full_name || user?.username || "N/A"],
        ["Year / Program", `${user?.year || "N/A"} Year · ${user?.branch || "CSE"}`],
        ["Email", user?.email || "N/A"],
        ["Hostel Block", blockName],
        ["Floor", floorDisplay],
        ["Selected Room", roomDisplay],
        ["Room Capacity", roomCapacity],
        ["Room Price", roomPrice],
        ["Booking Status", selectedRoom ? "Pending Payment" : "No Room Selected"],
        ["Payment Status", "Pending"],
      ],
      theme: "striped",
      headStyles: { fillColor: [41, 128, 185], textColor: 255 },
      styles: { fontSize: 11, cellPadding: 5 },
      columnStyles: {
        0: { fontStyle: "bold", cellWidth: 60 },
        1: { cellWidth: 100 },
      },
    });
    
    const finalY = doc.lastAutoTable.finalY || 100;
    doc.setFontSize(9);
    doc.setTextColor(150, 150, 150);
    doc.text("This is a computer-generated booking status report.", 105, finalY + 15, { align: "center" });
    doc.text("For any queries, contact hostel administration.", 105, finalY + 22, { align: "center" });
    
    const fileName = `Hostel_Booking_${user?.username || "Student"}_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
  };

  // Filter functions using realRooms from database
  const countRoomsByType = (type) => {
    if (selectedFloor === null || !selectedBlock) return 0;
    
    if (type === "available") {
      return realRooms.filter(
        (room) => room.room_type === "regular" && room.available_beds > 0,
      ).length;
    } else if (type === "full") {
      return realRooms.filter(
        (room) => room.room_type === "regular" && room.available_beds === 0,
      ).length;
    } else {
      return realRooms.filter((room) => room.room_type === type).length;
    }
  };

  const countRoomsByWing = (wing) => {
    if (selectedFloor === null || !selectedBlock) return 0;
    
    const regularRooms = realRooms.filter(
      (room) => room.room_type === "regular",
    );

    if (wing === "left") {
      return Math.floor(regularRooms.length / 2);
    } else {
      return Math.ceil(regularRooms.length / 2);
    }
  };

  const isFloorAccessible = (block, floorNum) => {
    const userYear = user?.year;

    if (userYear === 1 && block === "orange") {
      return [0, 1, 2, 3].includes(floorNum);
    } else if (userYear === 2 && block === "meta") {
      return [0, 1, 2].includes(floorNum);
    } else if (userYear === 3 && block === "alumini") {
      return [0, 1, 2].includes(floorNum);
    } else if (userYear === 4 && block === "orange") {
      return [4, 5].includes(floorNum);
    }
    return false;
  };

  // Get available floors for current block from backend data
  const getAvailableFloors = () => {
    if (!selectedBlock || !floorData) return [];
    const floors = Object.keys(floorData).map(Number);
    return floors.filter(floorNum => isFloorAccessible(selectedBlock, floorNum)).sort((a, b) => a - b);
  };

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
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">
                Room Booking System
              </h1>
              <p className="text-gray-600">
                Welcome, {user?.name || user?.full_name || user?.username} | Year {user?.year} | {user?.branch}
              </p>
              {authError && (
                <div className="mt-2 p-3 bg-red-100 text-red-700 rounded-lg">
                  ⚠️ Authentication error. Please login again.
                </div>
              )}
              {loading && (
                <p className="text-blue-600 mt-2">Loading rooms from database...</p>
              )}
              {user && (
                <div className="mt-2 text-sm text-blue-600">
                  {user.year === 1 &&
                    "You can book rooms in Orange Hostel (Ground, 1st, 2nd, 3rd floors only)"}
                  {user.year === 2 && "You can book rooms in Meta H Hostel only"}
                  {user.year === 3 && "You can book rooms in Alumini Hostel only"}
                  {user.year === 4 &&
                    "You can book rooms in Orange Hostel (4th and 5th floors only)"}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Block Selector */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Select Hostel Block</h2>
          <div className="flex gap-4">
            {(user?.year === 1 || user?.year === 4) && (
              <button
                onClick={() => handleBlockChange("orange")}
                className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                  selectedBlock === "orange"
                    ? "bg-orange-500 text-white shadow-lg scale-105"
                    : "bg-gray-100 text-gray-700 hover:bg-orange-100"
                }`}
              >
                Orange Hostel {user?.year === 1 ? "(1st Year)" : "(4th Year)"}
              </button>
            )}

            {user?.year === 2 && (
              <button
                onClick={() => handleBlockChange("meta")}
                className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                  selectedBlock === "meta"
                    ? "bg-blue-500 text-white shadow-lg scale-105"
                    : "bg-gray-100 text-gray-700 hover:bg-blue-100"
                }`}
              >
                Meta H Hostel (2nd Year)
              </button>
            )}

            {user?.year === 3 && (
              <button
                onClick={() => handleBlockChange("alumini")}
                className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                  selectedBlock === "alumini"
                    ? "bg-green-500 text-white shadow-lg scale-105"
                    : "bg-gray-100 text-gray-700 hover:bg-green-100"
                }`}
              >
                Alumini Hostel (3rd Year)
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Floor and Room Display */}
      {selectedBlock && (
        <div className="max-w-7xl mx-auto">
          {/* Floor Tabs */}
          <div className="bg-white rounded-t-xl shadow-lg p-4">
            <div className="flex gap-2 overflow-x-auto">
              {getAvailableFloors().map((floorNum) => {
                const isActive = selectedFloor === floorNum;
                const getBlockColor = () => {
                  if (selectedBlock === "orange") return "bg-orange-500";
                  if (selectedBlock === "meta") return "bg-blue-500";
                  if (selectedBlock === "alumini") return "bg-green-500";
                  return "bg-gray-500";
                };
                return (
                  <button
                    key={floorNum}
                    onClick={() => setSelectedFloor(floorNum)}
                    className={`px-4 py-2 rounded-lg whitespace-nowrap ${
                      isActive
                        ? `${getBlockColor()} text-white`
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {floorNum === 0 ? "Ground Floor" : `Floor ${floorNum}`}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Room Layout */}
          {selectedFloor !== null && (
            <div className="bg-white rounded-b-xl shadow-lg p-6">
              {/* Screen */}
              <div className="relative mb-12">
                <div className="absolute inset-x-0 -top-6 flex justify-center">
                  <div className="bg-gray-800 text-white px-8 py-2 rounded-t-lg text-sm font-semibold">
                    🎬 ENTRANCE / FRONT DESK 🎬
                  </div>
                </div>
                <div className="w-full h-2 bg-gradient-to-r from-transparent via-gray-400 to-transparent"></div>
              </div>

              {/* Room Grid - USING REAL ROOMS FROM DATABASE */}
              <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 mb-8">
                {realRooms.length > 0 ? (
                  realRooms
                    .filter((room) => {
                      if (roomFilter === "available") {
                        return room.room_type === "regular" && room.available_beds > 0;
                      } else if (roomFilter === "full") {
                        return room.room_type === "regular" && room.available_beds === 0;
                      } else if (roomFilter) {
                        return room.room_type === roomFilter;
                      }
                      return true;
                    })
                    .filter((room, index, array) => {
                      if (wingFilter && room.room_type !== "regular") return true;
                      const regularRooms = array.filter((r) => r.room_type === "regular");
                      if (wingFilter === "left") {
                        return index < Math.floor(regularRooms.length / 2);
                      } else if (wingFilter === "right") {
                        return index >= Math.floor(regularRooms.length / 2);
                      }
                      return true;
                    })
                    .map((room, index) => {
                      const isAvailable = room.room_type === "regular" ? room.available_beds > 0 : false;
                      const isSelected = selectedRoom?.number === room.room_number;

                      const getRoomStyle = () => {
                        if (room.room_type === "washroom") return "bg-gray-200 border-gray-300";
                        if (room.room_type === "office") return "bg-purple-100 border-purple-300";
                        if (room.room_type === "common") return "bg-yellow-100 border-yellow-300";
                        if (isAvailable) return "bg-green-100 border-green-500 hover:scale-105 hover:shadow-lg cursor-pointer";
                        return "bg-red-100 border-red-500 opacity-50 cursor-not-allowed";
                      };

                      return (
                        <button
                          key={room.id || index}
                          onClick={() => isAvailable && handleRoomSelect(room)}
                          disabled={!isAvailable}
                          className={`
                            relative p-3 rounded-lg border-2 transition-all
                            ${getRoomStyle()}
                            ${isSelected ? "ring-4 ring-blue-500 scale-105" : ""}
                          `}
                        >
                          <div className="text-sm font-bold mb-1">
                            {room.room_number}
                          </div>

                          <div className="text-2xl mb-1">
                            {room.room_type === "washroom"
                              ? "🚻"
                              : room.room_type === "office"
                                ? "📋"
                                : room.room_type === "common"
                                  ? "🛏️"
                                  : "🛏️"}
                          </div>

                          {room.room_type === "regular" && (
                            <>
                              <div className="text-xs text-gray-600">
                                {room.capacity} {room.capacity === 10 ? "beds (Hall)" : "beds"}
                              </div>
                              <div className="mt-1">
                                <span className="text-xs font-semibold">
                                  {room.available_beds} available
                                </span>
                              </div>
                            </>
                          )}

                          {room.room_type !== "regular" && (
                            <div className="text-xs text-gray-600">
                              {room.room_type === "washroom"
                                ? "Washroom"
                                : room.room_type === "office"
                                  ? room.label || "Office"
                                  : room.room_type === "common"
                                    ? "Common Area"
                                    : ""}
                            </div>
                          )}

                          {room.room_type === "regular" && room.available_beds === 0 && (
                            <div className="absolute top-0 right-0 bg-red-500 text-white text-xs px-1 rounded-bl">
                              FULL
                            </div>
                          )}
                        </button>
                      );
                    })
                ) : (
                  <div className="col-span-full text-center py-8 text-gray-500">
                    {loading ? "Loading rooms from database..." : "No rooms available on this floor"}
                  </div>
                )}
              </div>

              {/* Show real rooms count */}
              {realRooms.length > 0 && (
                <div className="mb-4 p-2 bg-blue-50 text-xs text-blue-700 rounded">
                  📊 {realRooms.filter(r => r.room_type === "regular").length} regular rooms on this floor | 
                  Available: {realRooms.filter(r => r.room_type === "regular" && r.available_beds > 0).length} | 
                  Full: {realRooms.filter(r => r.room_type === "regular" && r.available_beds === 0).length}
                </div>
              )}

              {/* Legend */}
              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-700">Room Legend:</h3>
                  <button
                    onClick={() => {
                      setRoomFilter(null);
                      setWingFilter(null);
                    }}
                    className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                  >
                    <span>⟲</span> Reset All Filters
                  </button>
                </div>

                <div className="flex gap-4 flex-wrap">
                  <button
                    onClick={() =>
                      setRoomFilter(
                        roomFilter === "available" ? null : "available",
                      )
                    }
                    className={`flex items-center gap-2 px-3 py-1 rounded-lg transition-colors relative ${
                      roomFilter === "available"
                        ? "bg-gray-200 font-medium"
                        : "hover:bg-gray-100"
                    }`}
                  >
                    <div className="w-4 h-4 bg-green-100 border-2 border-green-500 rounded flex items-center justify-center">
                      {roomFilter === "available" && (
                        <span className="text-black text-xs font-bold">✓</span>
                      )}
                    </div>
                    <span className="text-sm">Available</span>
                    <span className="text-xs text-gray-500">
                      ({countRoomsByType("available")})
                    </span>
                  </button>

                  <button
                    onClick={() =>
                      setRoomFilter(roomFilter === "full" ? null : "full")
                    }
                    className={`flex items-center gap-2 px-3 py-1 rounded-lg transition-colors relative ${
                      roomFilter === "full"
                        ? "bg-gray-200 font-medium"
                        : "hover:bg-gray-100"
                    }`}
                  >
                    <div className="w-4 h-4 bg-red-100 border-2 border-red-500 rounded flex items-center justify-center">
                      {roomFilter === "full" && (
                        <span className="text-black text-xs font-bold">✓</span>
                      )}
                    </div>
                    <span className="text-sm">Full</span>
                    <span className="text-xs text-gray-500">
                      ({countRoomsByType("full")})
                    </span>
                  </button>

                  <button
                    onClick={() =>
                      setRoomFilter(
                        roomFilter === "washroom" ? null : "washroom",
                      )
                    }
                    className={`flex items-center gap-2 px-3 py-1 rounded-lg transition-colors relative ${
                      roomFilter === "washroom"
                        ? "bg-gray-200 font-medium"
                        : "hover:bg-gray-100"
                    }`}
                  >
                    <div className="w-4 h-4 bg-gray-200 border-2 border-gray-300 rounded flex items-center justify-center">
                      {roomFilter === "washroom" && (
                        <span className="text-black text-xs font-bold">✓</span>
                      )}
                    </div>
                    <span className="text-sm">Washroom</span>
                    <span className="text-xs text-gray-500">
                      ({countRoomsByType("washroom")})
                    </span>
                  </button>

                  <button
                    onClick={() =>
                      setRoomFilter(roomFilter === "office" ? null : "office")
                    }
                    className={`flex items-center gap-2 px-3 py-1 rounded-lg transition-colors relative ${
                      roomFilter === "office"
                        ? "bg-gray-200 font-medium"
                        : "hover:bg-gray-100"
                    }`}
                  >
                    <div className="w-4 h-4 bg-purple-100 border-2 border-purple-300 rounded flex items-center justify-center">
                      {roomFilter === "office" && (
                        <span className="text-black text-xs font-bold">✓</span>
                      )}
                    </div>
                    <span className="text-sm">Office/Staff</span>
                    <span className="text-xs text-gray-500">
                      ({countRoomsByType("office")})
                    </span>
                  </button>

                  <div className="flex items-center gap-2 ml-auto">
                    <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                      {selectedRoom && (
                        <span className="text-white text-xs font-bold">✓</span>
                      )}
                    </div>
                    <span className="text-sm">Selected</span>
                  </div>
                </div>

                {/* Left/Right Wing Labels */}
                <div className="flex justify-between mt-4 text-sm">
                  <button
                    onClick={() =>
                      setWingFilter(wingFilter === "left" ? null : "left")
                    }
                    className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                      wingFilter === "left"
                        ? "bg-gray-200 font-semibold"
                        : "text-gray-500 hover:bg-gray-100"
                    }`}
                  >
                    {wingFilter === "left" && (
                      <span className="text-black font-bold text-lg">✓</span>
                    )}
                    <span>⬅️ LEFT WING</span>
                    <span className="text-xs text-gray-500">
                      ({countRoomsByWing("left")} rooms)
                    </span>
                  </button>
                  <button
                    onClick={() =>
                      setWingFilter(wingFilter === "right" ? null : "right")
                    }
                    className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                      wingFilter === "right"
                        ? "bg-gray-200 font-semibold"
                        : "text-gray-500 hover:bg-gray-100"
                    }`}
                  >
                    {wingFilter === "right" && (
                      <span className="text-black font-bold text-lg">✓</span>
                    )}
                    <span>RIGHT WING ➡️</span>
                    <span className="text-xs text-gray-500">
                      ({countRoomsByWing("right")} rooms)
                    </span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Payment Modal */}
      {showPayment && selectedRoom && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-8 max-w-md w-full">
            <h2 className="text-2xl font-bold mb-4">Confirm Booking</h2>

            <div className="space-y-3 mb-6">
              <p>
                <span className="font-semibold">Block:</span>{" "}
                {selectedBlock?.toUpperCase() || "Unknown"}
              </p>
              <p>
                <span className="font-semibold">Floor:</span>{" "}
                {selectedFloor === 0 ? "Ground" : selectedFloor}
              </p>
              <p>
                <span className="font-semibold">Room No:</span>{" "}
                {selectedRoom.number}
              </p>
              <p>
                <span className="font-semibold">Capacity:</span>{" "}
                {selectedRoom.capacity}{" "}
                {selectedRoom.capacity === 10
                  ? "beds (Common Hall)"
                  : "sharing"}
              </p>
              <p>
                <span className="font-semibold">Available Beds:</span>{" "}
                {selectedRoom.available_beds}
              </p>
              <p>
                <span className="font-semibold">Price:</span> ₹
                {selectedRoom.price}/semester
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handlePayment}
                className="flex-1 bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700"
              >
                Pay ₹{selectedRoom.price}
              </button>
              <button
                onClick={() => setShowPayment(false)}
                className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoomBooking;