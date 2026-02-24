import React from 'react'

function WardenLog() {
  return (
    <div className="flex justify-center mt-5 px-4">
      {/* Container: Gives the form a white card look with a soft shadow */}
      <form className="bg-white p-10 rounded-2xl shadow-xl border border-slate-100 w-full max-w-md flex flex-col gap-6">
        
        <h2 className="text-2xl font-black text-slate-800 text-center uppercase tracking-wider mb-2">
          Warden <span className="text-blue-700">Login</span>
        </h2>

        {/* UserID Input */}
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Warden Id</label>
          <input 
            type="text" 
            placeholder="e.g. 12345678" 
            className="w-full px-4 py-3 rounded-lg bg-slate-50 border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
          />
        </div>

        {/* Password Input */}
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Password</label>
          <input 
            type="password" 
            placeholder="••••••••" 
            className="w-full px-4 py-3 rounded-lg bg-slate-50 border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
          />
        </div>

        {/* Space between Password and Button is handled by the "gap-6" in the form tag */}

        {/* The Simple Professional Button */}
        <button 
          type="submit"
          className="w-full bg-[#002147] hover:bg-[#003366] text-white font-bold py-4 px-6 rounded-lg border-b-4 border-yellow-500 active:border-b-0 transition-all uppercase tracking-widest mt-2"
        >
          Login to Portal
        </button>

        <p className="text-center text-xs text-slate-400 font-medium cursor-pointer hover:text-blue-600">
          Forgot your password?
        </p>
      </form>
    </div>
  )
}

export default WardenLog