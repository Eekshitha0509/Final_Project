import React from 'react'
import logo from '../assets/logo.png'

function Header() {
  return (
    // We change bg-white to a deep Navy Blue (AU Theme)
    <nav className="w-full bg-[black] px-12 py-8 shadow-2xl border-b-4 border-yellow-500">
      <div className="max-w-[1600px] mx-auto grid grid-cols-3 items-center">
        
        {/* LEFT: Massive Logo with High Contrast */}
        <div className="flex justify-start">
          <div className="relative group">
            {/* Subtle glow to separate the logo from the dark background */}
            <div className="absolute -inset-6 bg-white/5 blur-3xl rounded-full"></div>
            
            <img 
              src={logo} 
              alt="AU Logo" 
              className="relative h-40 w-40 md:h-48 md:w-48 object-contain transition-transform duration-500 group-hover:scale-105 drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]" 
            />
          </div>
        </div>

        {/* CENTER: High-Contrast Branding */}
        <div className="flex flex-col items-center">
          <h1 className="text-6xl font-[900] tracking-[0.05em] text-white uppercase">
            AU <span className="text-yellow-400">Hostels</span>
          </h1>
          
          <div className="flex items-center gap-4 mt-4 w-full">
            <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-yellow-500 to-transparent"></div>
            <p className="text-sm font-bold text-slate-300 uppercase tracking-[0.5em] whitespace-nowrap">
              Andhra University
            </p>
            <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-yellow-500 to-transparent"></div>
          </div>
        </div>

        {/* RIGHT: Empty for balance */}
        <div className="flex justify-end invisible md:visible"></div>

      </div>
    </nav>
  )
}

export default Header