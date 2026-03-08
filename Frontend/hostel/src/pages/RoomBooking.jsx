// src/pages/RoomBooking.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const RoomBooking = () => {
  const navigate = useNavigate();
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
    if (!userData) {
      navigate("/login/student");
      return;
    }
    const parsedUser = JSON.parse(userData);
    setUser(parsedUser);

    // Set available blocks and floors based on user's year
    setUserRestrictions(parsedUser);

    fetchRoomData();
  }, []);

  const setUserRestrictions = (user) => {
    const userYear = user.year;
    let availableBlocks = [];
    let availableFloorsForBlock = {};

    if (userYear === 1) {
      // 1st year: Only Orange block, Ground, 1st, 2nd, 3rd floors
      availableBlocks = ["orange"];
      availableFloorsForBlock = {
        orange: ["ground", 1, 2, 3],
      };
      setSelectedBlock("orange");
      setSelectedFloor(0); // Set ground floor as default for 1st year
    } else if (userYear === 2) {
      // 2nd year: Only Meta H block
      availableBlocks = ["meta"];
      availableFloorsForBlock = {
        meta: ["ground", 1, 2],
      };
      setSelectedBlock("meta");
      setSelectedFloor(0); // Set ground floor as default for 2nd year
    } else if (userYear === 3) {
      // 3rd year: Only Alumini block
      availableBlocks = ["alumini"];
      availableFloorsForBlock = {
        alumini: ["ground", 1, 2],
      };
      setSelectedBlock("alumini");
      setSelectedFloor(0); // Set ground floor as default for 3rd year
    } else if (userYear === 4) {
      // 4th year: Only Orange block, 4th and 5th floors
      availableBlocks = ["orange"];
      availableFloorsForBlock = {
        orange: [4, 5],
      };
      setSelectedBlock("orange");
      setSelectedFloor(4); // Set 4th floor as default for 4th year
    }

    setAvailableFloors(availableFloorsForBlock);
  };

  const fetchRoomData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("access");
      const response = await axios.get("http://127.0.0.1:8000/api/rooms/", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRooms(response.data);
    } catch (error) {
      console.error("Error fetching rooms:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleBlockChange = (block) => {
    setSelectedBlock(block);
    // Set default floor based on user's year and selected block
    const userYear = user?.year;
    if (userYear === 1 && block === "orange") {
      setSelectedFloor(0); // Ground floor for 1st year
    } else if (userYear === 2 && block === "meta") {
      setSelectedFloor(0); // Ground floor for 2nd year
    } else if (userYear === 3 && block === "alumini") {
      setSelectedFloor(0); // Ground floor for 3rd year
    } else if (userYear === 4 && block === "orange") {
      setSelectedFloor(4); // 4th floor for 4th year
    } else {
      setSelectedFloor(null);
    }
    setSelectedRoom(null);
    setRoomFilter(null);
    setWingFilter(null);
  };

  const handleRoomSelect = (room) => {
    if (room.available_beds > 0) {
      setSelectedRoom(room);
      setShowPayment(true);
    }
  };

  const handlePayment = async () => {
    // Razorpay integration
    const options = {
      key: "YOUR_RAZORPAY_KEY",
      amount: selectedRoom.price * 100, // Amount in paise
      currency: "INR",
      name: "Hostel Room Booking",
      description: `Booking Room ${selectedRoom.number}`,
      handler: async function (response) {
        // Handle successful payment
        await confirmBooking(response);
      },
      prefill: {
        name: user?.name,
        email: user?.email,
      },
      theme: {
        color: "#002147",
      },
    };

    const razorpay = new window.Razorpay(options);
    razorpay.open();
  };

  const confirmBooking = async (paymentResponse) => {
    try {
      const token = localStorage.getItem("access");
      const response = await axios.post(
        "http://127.0.0.1:8000/api/book-room/",
        {
          room_id: selectedRoom.id,
          payment_id: paymentResponse.razorpay_payment_id,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      setBookingData(response.data);
      setShowConfirmation(true);
      setShowPayment(false);

      // Update room availability locally
      const updatedRooms = rooms.map((room) =>
        room.id === selectedRoom.id
          ? { ...room, available_beds: room.available_beds - 1 }
          : room,
      );
      setRooms(updatedRooms);
    } catch (error) {
      alert("Booking failed. Please try again.");
    }
  };

  // Helper function to count rooms by type
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

  // Helper function to count rooms by wing
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

  // Check if floor is accessible for current user
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
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Room Booking System
          </h1>
          <p className="text-gray-600">
            Welcome, {user?.name} | Year {user?.year} | {user?.branch}
          </p>
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

      {/* Block Selector */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Select Hostel Block</h2>
          <div className="flex gap-4">
            {/* Orange Block - Available for 1st and 4th year */}
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

            {/* Meta Block - Available for 2nd year */}
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

            {/* Alumini Block - Available for 3rd year */}
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
          {/* Floor Tabs - Only show accessible floors */}
          <div className="bg-white rounded-t-xl shadow-lg p-4">
            <div className="flex gap-2 overflow-x-auto">
              {Object.keys(blockData[selectedBlock].floors)
                .filter((floorKey) =>
                  isFloorAccessible(selectedBlock, floorKey),
                )
                .sort((a, b) => {
                  // Sort floors: ground first, then ascending numbers
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

          {/* Cinema-style Room Layout */}
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

              {/* Room Grid with Filtering */}
              <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 mb-8">
                {blockData[selectedBlock].floors[
                  selectedFloor === 0 ? "ground" : selectedFloor
                ]?.rooms
                  .filter((room) => {
                    // Apply room type filter
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
                    // Apply wing filter (only for regular rooms)
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
                        {/* Room Number */}
                        <div className="text-sm font-bold mb-1">
                          {room.number}
                        </div>

                        {/* Room Icon based on type */}
                        <div className="text-2xl mb-1">
                          {room.type === "washroom"
                            ? "🚻"
                            : room.type === "office"
                              ? "📋"
                              : room.type === "common"
                                ? "🛏️"
                                : "🛏️"}
                        </div>

                        {/* Capacity */}
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

                        {/* Special room label */}
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

                        {/* Full indicator */}
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

              {/* Legend with Working Filters and Tick Marks */}
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

                {/* Left/Right Wing Labels with Tick Marks */}
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

      {/* Success Modal */}
      {showConfirmation && bookingData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-8 max-w-md w-full text-center">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold mb-2">Booking Confirmed!</h2>
            <p className="text-gray-600 mb-4">
              Room {bookingData.room_number} has been booked successfully.
            </p>
            <div className="bg-blue-50 p-4 rounded-lg mb-4 text-left">
              <p>
                <span className="font-semibold">Booking ID:</span>{" "}
                {bookingData.id}
              </p>
              <p>
                <span className="font-semibold">Room:</span>{" "}
                {bookingData.room_number}
              </p>
              <p>
                <span className="font-semibold">Date:</span>{" "}
                {new Date(bookingData.booking_date).toLocaleDateString()}
              </p>
            </div>
            <button
              onClick={() => {
                setShowConfirmation(false);
                navigate("/home");
              }}
              className="w-full bg-[#002147] text-white py-3 rounded-lg font-semibold hover:bg-blue-900"
            >
              Go to Homepage
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Room generation functions - ALL ROOMS INITIALLY AVAILABLE
function generateOrangeGroundFloor() {
  const rooms = [];
  // Room 1-7 with capacity 2
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
  // Add 2 washrooms
  rooms.push({ number: "W1", type: "washroom", id: "orange-g-w1" });
  rooms.push({ number: "W2", type: "washroom", id: "orange-g-w2" });
  return rooms;
}

function generateOrangeFirstFloor() {
  const rooms = [];
  // Room 8-23 with varying capacities
  const capacities = {
    8: 2,
    15: 2,
    18: 2,
    20: 2,
    21: 2,
    23: 2,
    9: 3,
    10: 3,
    11: 3,
    12: 3,
    13: 3,
    22: 3,
    14: 4,
    16: 4,
    17: 4,
    19: 4,
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
    24: 6,
    25: 6,
    26: 6,
    31: 6,
    27: 8,
    28: 8,
    29: 8,
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
    32: 5,
    39: 5,
    34: 6,
    38: 6,
    33: 8,
    36: 8,
    37: 8,
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
    40: 6,
    42: 6,
    46: 6,
    47: 6,
    41: 8,
    44: 8,
    43: 7,
    45: 7,
  };

  for (let i = 40; i <= 47; i++) {
    rooms.push({
      number: i,
      capacity: capacities[i] || 4,
      available_beds: capacities[i] || 4,
      type: "regular",
      price: 10000,
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
    48: 6,
    49: 6,
    50: 6,
    52: 6,
    54: 6,
    55: 6,
    51: 7,
    53: 8,
  };

  for (let i = 48; i <= 55; i++) {
    rooms.push({
      number: i,
      capacity: capacities[i] || 4,
      available_beds: capacities[i] || 4,
      type: "regular",
      price: 10000,
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
  // Regular rooms 60-90 (3 sharing)
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

  // Common Hall 1 - 10 sharing room
  rooms.push({
    number: "CH1",
    capacity: 10,
    available_beds: 10,
    type: "regular",
    price: 13000,
    label: "Common Hall 1",
    id: "meta-2-ch1",
  });

  // Common Hall 2 - 10 sharing room
  rooms.push({
    number: "CH2",
    capacity: 10,
    available_beds: 10,
    type: "regular",
    price: 13000,
    label: "Common Hall 2",
    id: "meta-2-ch2",
  });

  // Washrooms
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
