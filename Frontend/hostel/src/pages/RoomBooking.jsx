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

  // Block data based on your specifications
  const blockData = {
    orange: {
      name: "Orange Hostel",
      color: "bg-orange-500",
      floors: {
        ground: {
          number: 0,
          students: "1st Year",
          rooms: generateOrangeGroundFloor(),
        },
        1: {
          number: 1,
          students: "1st Year",
          rooms: generateOrangeFirstFloor(),
        },
        2: {
          number: 2,
          students: "1st Year",
          rooms: generateOrangeSecondFloor(),
        },
        3: {
          number: 3,
          students: "1st Year",
          rooms: generateOrangeThirdFloor(),
        },
        4: {
          number: 4,
          students: "4th Year",
          rooms: generateOrangeFourthFloor(),
        },
        5: {
          number: 5,
          students: "4th Year",
          rooms: generateOrangeFifthFloor(),
        },
      },
    },
    meta: {
      name: "Meta H Hostel",
      color: "bg-blue-500",
      floors: {
        ground: {
          number: 0,
          students: "2nd Year",
          rooms: generateMetaGroundFloor(),
        },
        1: { number: 1, students: "2nd Year", rooms: generateMetaFirstFloor() },
        2: {
          number: 2,
          students: "2nd Year",
          rooms: generateMetaSecondFloor(),
        },
      },
    },
    alumini: {
      name: "Alumini Hostel",
      color: "bg-green-500",
      floors: {
        ground: {
          number: 0,
          students: "3rd Year",
          rooms: generateAluminiGroundFloor(),
        },
        1: {
          number: 1,
          students: "3rd Year",
          rooms: generateAluminiFirstFloor(),
        },
        2: {
          number: 2,
          students: "3rd Year",
          rooms: generateAluminiSecondFloor(),
        },
      },
    },
  };

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
      
      // Use local data as fallback
      console.log("Using local room data as fallback");
      const floorKey = selectedFloor === 0 ? "ground" : selectedFloor;
      const localRooms = blockData[selectedBlock]?.floors[floorKey]?.rooms || [];
      setRealRooms(localRooms);
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
    
    const blockId = getBlockIdFromName(block);
    if (blockId) {
      fetchFloorsForBlock(blockId);
    }
  };

  const handleRoomSelect = (room) => {
    if (room.available_beds > 0) {
      console.log("Selected room:", room);
      setSelectedRoom(room);
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
        room => String(room.room_number || room.number) === String(selectedRoom.number)
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
    
    const blockName = selectedBlock ? blockData[selectedBlock]?.name || selectedBlock.toUpperCase() : "Not Selected";
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

  const countRoomsByType = (type) => {
    if (selectedFloor === null || !selectedBlock) return 0;

    const floorKey = selectedFloor === 0 ? "ground" : selectedFloor;
    const currentFloorRooms =
      blockData[selectedBlock]?.floors[floorKey]?.rooms || [];

    if (type === "available") {
      return currentFloorRooms.filter(
        (room) => room.type === "regular" && room.available_beds > 0,
      ).length;
    } else if (type === "full") {
      return currentFloorRooms.filter(
        (room) => room.type === "regular" && room.available_beds === 0,
      ).length;
    } else {
      return currentFloorRooms.filter((room) => room.type === type).length;
    }
  };

  const countRoomsByWing = (wing) => {
    if (selectedFloor === null || !selectedBlock) return 0;

    const floorKey = selectedFloor === 0 ? "ground" : selectedFloor;
    const currentFloorRooms =
      blockData[selectedBlock]?.floors[floorKey]?.rooms || [];
    const regularRooms = currentFloorRooms.filter(
      (room) => room.type === "regular",
    );

    if (wing === "left") {
      return Math.floor(regularRooms.length / 2);
    } else {
      return Math.ceil(regularRooms.length / 2);
    }
  };

  const isFloorAccessible = (block, floorKey) => {
    const userYear = user?.year;
    const floorNum = floorKey === "ground" ? 0 : parseInt(floorKey);

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
              {Object.keys(blockData[selectedBlock].floors)
                .filter((floorKey) =>
                  isFloorAccessible(selectedBlock, floorKey),
                )
                .sort((a, b) => {
                  if (a === "ground") return -1;
                  if (b === "ground") return 1;
                  return parseInt(a) - parseInt(b);
                })
                .map((floorKey) => {
                  const floor = blockData[selectedBlock].floors[floorKey];
                  return (
                    <button
                      key={floorKey}
                      onClick={() => setSelectedFloor(floor.number)}
                      className={`px-4 py-2 rounded-lg whitespace-nowrap ${
                        selectedFloor === floor.number
                          ? `${blockData[selectedBlock].color} text-white`
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      {floor.number === 0
                        ? "Ground Floor"
                        : `Floor ${floor.number}`}
                      <span className="ml-2 text-xs opacity-75">
                        ({floor.students})
                      </span>
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

              {/* Room Grid */}
              <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 mb-8">
                {blockData[selectedBlock].floors[
                  selectedFloor === 0 ? "ground" : selectedFloor
                ]?.rooms
                  .filter((room) => {
                    if (roomFilter === "available") {
                      return room.type === "regular" && room.available_beds > 0;
                    } else if (roomFilter === "full") {
                      return (
                        room.type === "regular" && room.available_beds === 0
                      );
                    } else if (roomFilter) {
                      return room.type === roomFilter;
                    }
                    return true;
                  })
                  .filter((room, index, array) => {
                    if (wingFilter && room.type !== "regular") return true;

                    const regularRooms = array.filter(
                      (r) => r.type === "regular",
                    );
                    if (wingFilter === "left") {
                      return index < Math.floor(regularRooms.length / 2);
                    } else if (wingFilter === "right") {
                      return index >= Math.floor(regularRooms.length / 2);
                    }
                    return true;
                  })
                  .map((room, index) => {
                    const isAvailable =
                      room.type === "regular" ? room.available_beds > 0 : false;
                    const isSelected = selectedRoom?.number === room.number;

                    return (
                      <button
                        key={index}
                        onClick={() => isAvailable && handleRoomSelect(room)}
                        disabled={!isAvailable}
                        className={`
                          relative p-3 rounded-lg border-2 transition-all
                          ${
                            isAvailable
                              ? "hover:scale-105 hover:shadow-lg cursor-pointer"
                              : room.type !== "regular"
                                ? "cursor-default"
                                : "opacity-50 cursor-not-allowed"
                          }
                          ${
                            room.type === "washroom"
                              ? "bg-gray-200 border-gray-300"
                              : room.type === "office"
                                ? "bg-purple-100 border-purple-300"
                                : room.type === "common"
                                  ? "bg-yellow-100 border-yellow-300"
                                  : isAvailable
                                    ? "bg-green-100 border-green-500"
                                    : "bg-red-100 border-red-500"
                          }
                          ${isSelected ? "ring-4 ring-blue-500 scale-105" : ""}
                        `}
                      >
                        <div className="text-sm font-bold mb-1">
                          {room.number}
                        </div>

                        <div className="text-2xl mb-1">
                          {room.type === "washroom"
                            ? "🚻"
                            : room.type === "office"
                              ? "📋"
                              : room.type === "common"
                                ? "🛏️"
                                : "🛏️"}
                        </div>

                        {room.type === "regular" && (
                          <>
                            <div className="text-xs text-gray-600">
                              {room.capacity}{" "}
                              {room.capacity === 10 ? "beds (Hall)" : "beds"}
                            </div>
                            <div className="mt-1">
                              <span className="text-xs font-semibold">
                                {room.available_beds} available
                              </span>
                            </div>
                          </>
                        )}

                        {room.type !== "regular" && (
                          <div className="text-xs text-gray-600">
                            {room.type === "washroom"
                              ? "Washroom"
                              : room.type === "office"
                                ? room.label || "Office"
                                : room.type === "common"
                                  ? "Common Area"
                                  : ""}
                          </div>
                        )}

                        {room.type === "regular" &&
                          room.available_beds === 0 && (
                            <div className="absolute top-0 right-0 bg-red-500 text-white text-xs px-1 rounded-bl">
                              FULL
                            </div>
                          )}
                      </button>
                    );
                  })}
              </div>

              {/* Show real rooms count */}
              {realRooms.length > 0 && (
                <div className="mb-4 p-2 bg-blue-50 text-xs text-blue-700 rounded">
                  Database has {realRooms.length} rooms on this floor
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
                {blockData[selectedBlock].name}
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

// ========== ROOM GENERATION FUNCTIONS (Keep as is) ==========
function generateOrangeGroundFloor() {
  const rooms = [];
  for (let i = 1; i <= 7; i++) {
    rooms.push({
      number: i,
      capacity: 2,
      available_beds: 2,
      type: "regular",
      price: 13000,
      id: `orange-g-${i}`,
    });
  }
  rooms.push({ number: "W1", type: "washroom", id: "orange-g-w1" });
  rooms.push({ number: "W2", type: "washroom", id: "orange-g-w2" });
  return rooms;
}

function generateOrangeFirstFloor() {
  const rooms = [];
  const capacities = {
    8: 2, 15: 2, 18: 2, 20: 2, 21: 2, 23: 2,
    9: 3, 10: 3, 11: 3, 12: 3, 13: 3, 22: 3,
    14: 4, 16: 4, 17: 4, 19: 4,
  };

  for (let i = 8; i <= 23; i++) {
    rooms.push({
      number: i,
      capacity: capacities[i] || 4,
      available_beds: capacities[i] || 4,
      type: "regular",
      price: 13000,
      id: `orange-1-${i}`,
    });
  }
  rooms.push({ number: "W1", type: "washroom", id: "orange-1-w1" });
  rooms.push({ number: "W2", type: "washroom", id: "orange-1-w2" });
  return rooms;
}

function generateOrangeSecondFloor() {
  const rooms = [];
  const capacities = {
    24: 6, 25: 6, 26: 6, 31: 6,
    27: 8, 28: 8, 29: 8,
  };

  for (let i = 24; i <= 31; i++) {
    rooms.push({
      number: i,
      capacity: capacities[i] || 4,
      available_beds: capacities[i] || 4,
      type: "regular",
      price: 13000,
      id: `orange-2-${i}`,
    });
  }
  rooms.push({ number: "W1", type: "washroom", id: "orange-2-w1" });
  rooms.push({ number: "W2", type: "washroom", id: "orange-2-w2" });
  return rooms;
}

function generateOrangeThirdFloor() {
  const rooms = [];
  const capacities = {
    32: 5, 39: 5,
    34: 6, 38: 6,
    33: 8, 36: 8, 37: 8,
  };

  for (let i = 32; i <= 39; i++) {
    rooms.push({
      number: i,
      capacity: capacities[i] || 4,
      available_beds: capacities[i] || 4,
      type: "regular",
      price: 13000,
      id: `orange-3-${i}`,
    });
  }
  rooms.push({ number: "W1", type: "washroom", id: "orange-3-w1" });
  rooms.push({ number: "W2", type: "washroom", id: "orange-3-w2" });
  return rooms;
}

function generateOrangeFourthFloor() {
  const rooms = [];
  const capacities = {
    40: 6, 42: 6, 46: 6, 47: 6,
    41: 8, 44: 8,
    43: 7, 45: 7,
  };

  for (let i = 40; i <= 47; i++) {
    rooms.push({
      number: i,
      capacity: capacities[i] || 4,
      available_beds: capacities[i] || 4,
      type: "regular",
      price: 13000,
      id: `orange-4-${i}`,
    });
  }
  
  rooms.push({ number: "W1", type: "washroom", id: "orange-4-w1" });
  rooms.push({ number: "W2", type: "washroom", id: "orange-4-w2" });
  return rooms;
}

function generateOrangeFifthFloor() {
  const rooms = [];
  const capacities = {
    48: 6, 49: 6, 50: 6, 52: 6, 54: 6, 55: 6,
    51: 7,
    53: 8,
  };

  for (let i = 48; i <= 55; i++) {
    rooms.push({
      number: i,
      capacity: capacities[i] || 4,
      available_beds: capacities[i] || 4,
      type: "regular",
      price: 13000,
      id: `orange-5-${i}`,
    });
  }
  
  rooms.push({ number: "W1", type: "washroom", id: "orange-5-w1" });
  rooms.push({ number: "W2", type: "washroom", id: "orange-5-w2" });
  return rooms;
}

function generateMetaGroundFloor() {
  const rooms = [];
  rooms.push({
    number: 1,
    type: "office",
    label: "Office",
    id: "meta-g-office1",
  });

  for (let i = 2; i <= 29; i++) {
    rooms.push({
      number: i,
      capacity: 3,
      available_beds: 3,
      type: "regular",
      price: 13000,
      id: `meta-g-${i}`,
    });
  }

  rooms.push({
    number: 16,
    type: "office",
    label: "Staff Room",
    id: "meta-g-office2",
  });
  rooms.push({ number: "W1", type: "washroom", id: "meta-g-w1" });
  rooms.push({ number: "W2", type: "washroom", id: "meta-g-w2" });
  return rooms;
}

function generateMetaFirstFloor() {
  const rooms = [];
  for (let i = 30; i <= 59; i++) {
    rooms.push({
      number: i,
      capacity: 3,
      available_beds: 3,
      type: "regular",
      price: 13000,
      id: `meta-1-${i}`,
    });
  }
  rooms.push({ number: "W1", type: "washroom", id: "meta-1-w1" });
  rooms.push({ number: "W2", type: "washroom", id: "meta-1-w2" });
  return rooms;
}

function generateMetaSecondFloor() {
  const rooms = [];
  for (let i = 60; i <= 90; i++) {
    rooms.push({
      number: i,
      capacity: 3,
      available_beds: 3,
      type: "regular",
      price: 13000,
      id: `meta-2-${i}`,
    });
  }

  rooms.push({
    number: "CH1",
    capacity: 10,
    available_beds: 10,
    type: "regular",
    price: 13000,
    label: "Common Hall 1",
    id: "meta-2-ch1",
  });

  rooms.push({
    number: "CH2",
    capacity: 10,
    available_beds: 10,
    type: "regular",
    price: 13000,
    label: "Common Hall 2",
    id: "meta-2-ch2",
  });

  rooms.push({ number: "W1", type: "washroom", id: "meta-2-w1" });
  rooms.push({ number: "W2", type: "washroom", id: "meta-2-w2" });

  return rooms;
}

function generateAluminiGroundFloor() {
  const rooms = [];
  for (let i = 1; i <= 108; i++) {
    rooms.push({
      number: i,
      capacity: 4,
      available_beds: 4,
      type: "regular",
      price: 13000,
      id: `alumini-g-${i}`,
    });
  }
  rooms.push({ number: "W1", type: "washroom", id: "alumini-g-w1" });
  rooms.push({ number: "W2", type: "washroom", id: "alumini-g-w2" });
  return rooms;
}

function generateAluminiFirstFloor() {
  const rooms = [];
  for (let i = 109; i <= 214; i++) {
    rooms.push({
      number: i,
      capacity: 4,
      available_beds: 4,
      type: "regular",
      price: 13000,
      id: `alumini-1-${i}`,
    });
  }
  rooms.push({ number: "W1", type: "washroom", id: "alumini-1-w1" });
  rooms.push({ number: "W2", type: "washroom", id: "alumini-1-w2" });
  return rooms;
}

function generateAluminiSecondFloor() {
  const rooms = [];
  for (let i = 301; i <= 318; i++) {
    rooms.push({
      number: i,
      capacity: 4,
      available_beds: 4,
      type: "regular",
      price: 13000,
      id: `alumini-2-${i}`,
    });
  }
  rooms.push({ number: "W1", type: "washroom", id: "alumini-2-w1" });
  rooms.push({ number: "W2", type: "washroom", id: "alumini-2-w2" });
  return rooms;
}

export default RoomBooking;