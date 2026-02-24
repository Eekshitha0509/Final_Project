import React from 'react';

function Homepage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      
      {/* Title */}
      <h1 className="text-xl font-medium text-slate-400 mb-10 tracking-[0.2em] uppercase">
        Select Service
      </h1>

      {/* Button Container */}
      <div className="flex flex-col md:flex-row gap-6 w-full max-w-4xl">
        
        {/* Option 1: Room Allocation */}
        <button className="flex-1 group bg-white border-2 border-slate-100 p-10 rounded-[2rem] transition-all duration-300 hover:border-blue-500 hover:shadow-2xl hover:-translate-y-2"
        onclick={() =>(<RoomSelection/>)}>
          <div className="h-20 w-20 bg-blue-50 rounded-2xl flex items-center justify-center mb-6 mx-auto group-hover:bg-blue-600 transition-colors">
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Room Allocation</h2>
          <p className="text-slate-500 text-sm">Book or manage your hostel room</p>
        </button>

        {/* Option 2: Mess Payment */}
        <button className="flex-1 group bg-white border-2 border-slate-100 p-10 rounded-[2rem] transition-all duration-300 hover:border-orange-500 hover:shadow-2xl hover:-translate-y-2">
          <div className="h-20 w-20 bg-orange-50 rounded-2xl flex items-center justify-center mb-6 mx-auto group-hover:bg-orange-600 transition-colors">
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Mess Payment</h2>
          <p className="text-slate-500 text-sm">Pay bills and check food credits</p>
        </button>

      </div>

      {/* Simple Footer Link */}
      <button className="mt-12 text-slate-400 hover:text-slate-600 text-sm font-medium transition-colors">
        Logout of account
      </button>
    </div>
  );
}

export default Homepage;