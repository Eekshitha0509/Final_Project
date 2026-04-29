import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import logo from '../assets/logo.png';

function Header() {
  const navigate = useNavigate();
  
  // Always get fresh auth state - no stale cache
  const isAuthenticated = !!localStorage.getItem('access');
  const isAdmin = !!localStorage.getItem('admin');
  
  const handleLogout = () => {
    const isAdmin = localStorage.getItem('admin');
    const isStudent = !isAdmin && localStorage.getItem('access');
    
    localStorage.removeItem('access');
    localStorage.removeItem('refresh');
    localStorage.removeItem('user');
    localStorage.removeItem('admin');
    localStorage.removeItem('role');
    if (isStudent) {
      navigate('/login/student');
    } else if (isAdmin) {
      navigate('/login/admin');
    } else {
      navigate('/');
    }
    window.location.reload();
  };

  return (
    <header className="w-full bg-slate-800 shadow-md">
      
      {/* 🏛️ Top Branding Area */}
      <div className="pt-8 pb-6 max-w-[1200px] mx-auto flex flex-col items-center text-center">
        {/* Logo */}
        <img 
          src={logo} 
          alt="AU Logo" 
          className="h-20 md:h-24 object-contain mb-4"
        />

        {/* Title */}
        <div className="text-center">
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-wide">
            ANDHRA UNIVERSITY
          </h1>
          <p className="text-sm md:text-base font-semibold text-yellow-400 mt-1">
            A.U. COLLEGE OF ENGINEERING (A), VISAKHAPATNAM
          </p>
          <p className="text-xs md:text-sm font-bold text-white mt-1">
            SELF-SUPPORT HOSTELS (BOYS)
          </p>
        </div>

        {/* Thin line */}
        <div className="mt-3 w-24 h-[2px] bg-yellow-400 rounded-full"></div>
      </div>

      {/* 🧭 Horizontal Menu Bar */}
      <nav className="bg-slate-900 border-t border-b border-slate-700 py-3">
        <div className="max-w-[1200px] mx-auto flex justify-center items-center px-4">
          <ul className="flex flex-wrap items-center gap-6 md:gap-12 text-sm font-semibold tracking-wider">
            
            {isAdmin ? (
              // ✅ Header for Admin Users
              <>
                <li>
                  <Link to="/adminpanel" className="text-slate-300 hover:text-white transition uppercase">
                    Dashboard
                  </Link>
                </li>
                <li>
                  <button 
                    onClick={handleLogout} 
                    className="text-red-400 hover:text-red-300 transition uppercase"
                  >
                    Logout
                  </button>
                </li>
              </>
            ) : isAuthenticated ? (
              // ✅ Header for Logged-In Students
              <>
                <li>
                  <Link to="/about" className="text-slate-300 hover:text-white transition uppercase">
                    About Hostels
                  </Link>
                </li>
                <li>
                  <Link to="/profile" className="text-slate-300 hover:text-white transition uppercase">
                    Profile
                  </Link>
                </li>
                <li>
                  <button 
                    onClick={handleLogout} 
                    className="text-red-400 hover:text-red-300 transition uppercase"
                  >
                    Logout
                  </button>
                </li>
              </>
            ) : (
              // ❌ Header for Guests / Logged-Out Users
              <>
                <li>
                  <Link to="/" className="text-slate-300 hover:text-white transition uppercase">
                    Home
                  </Link>
                </li>
                <li>
                  <Link to="/about" className="text-slate-300 hover:text-white transition uppercase">
                    About Hostels
                  </Link>
                </li>
                <li>
                  <Link 
                    to="/login/student" 
                    className="text-yellow-400 hover:text-yellow-300 transition uppercase"
                  >
                    Login
                  </Link>
                </li>
              </>
            )}

          </ul>
        </div>
      </nav>

    </header>
  );
}

export default Header;
