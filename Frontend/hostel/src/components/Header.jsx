import React from 'react'
import logo from '../assets/logo.png'

function Header() {
  return (
    <nav className="w-full bg-slate-800 py-8 shadow-md border-b border-slate-700">
      
      <div className="max-w-[1200px] mx-auto flex flex-col items-center text-center">
        
        {/* 🔶 Logo WITHOUT BOX */}
        <img 
          src={logo} 
          alt="AU Logo" 
          className="h-20 md:h-24 object-contain mb-4"
        />

        {/* 🔷 Title */}
        <h1 className="text-2xl md:text-3xl font-bold text-white tracking-wide">
          AU <span className="text-yellow-400">SELF SUPPORTED HOSTELS</span>
        </h1>

        {/* 🔸 Subtitle */}
        <p className="text-xs text-slate-300 tracking-widest mt-1">
          ANDHRA UNIVERSITY
        </p>

        {/* 🔹 Thin line */}
        <div className="mt-3 w-24 h-[2px] bg-yellow-400 rounded-full"></div>

      </div>
    </nav>
  )
}

export default Header