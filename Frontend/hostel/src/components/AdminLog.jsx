import React, { useState } from 'react';
import { useNavigate } from "react-router-dom";

function AdminLog() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    admin_id: "",
    password: ""
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const loginData = {
        admin_id: formData.admin_id.trim(),
        password: formData.password
      };
      
      console.log("Sending login data:", loginData);
      
      const response = await fetch("http://127.0.0.1:8000/hostel/admin-login/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(loginData)
      });
      
      const data = await response.json();
      console.log("Response data:", data);
      
      if (response.ok && data.status === "success") {
        localStorage.setItem(
          "admin",
          JSON.stringify({
            username: data.admin,
            admin_id: formData.admin_id
          })
        );
        
        alert("Admin Login Successful");
        navigate("/adminpanel");
      } else {
        setError(data.error || data.message || "Login failed");
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("Network error. Please check if the server is running.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 px-4">
      <form 
        onSubmit={handleLogin}
        className="bg-white p-8 md:p-10 rounded-2xl shadow-2xl border border-slate-100 w-full max-w-md flex flex-col gap-6 transform transition-all duration-300 hover:shadow-3xl"
      >
        <div className="text-center mb-2">
          <h2 className="text-2xl md:text-3xl font-black text-slate-800 uppercase tracking-wider">
            Admin <span className="text-blue-700">Login</span>
          </h2>
          <div className="w-20 h-1 bg-yellow-500 mx-auto mt-2 rounded-full"></div>
          <p className="text-xs text-slate-500 mt-3">Access the admin dashboard</p>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded-lg">
            <p className="text-red-600 text-sm font-medium">
              ⚠️ {error}
            </p>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">
            Admin ID
          </label>
          <input 
            type="text"
            name="admin_id"
            value={formData.admin_id}
            placeholder="Enter admin username"
            onChange={handleChange}
            required
            className="w-full px-4 py-3 rounded-lg bg-slate-50 border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all duration-200 placeholder:text-sm"
            disabled={loading}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">
            Password
          </label>
          <input 
            type="password"
            name="password"
            value={formData.password}
            placeholder="••••••••"
            onChange={handleChange}
            required
            className="w-full px-4 py-3 rounded-lg bg-slate-50 border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all duration-200"
            disabled={loading}
          />
        </div>

        <button 
          type="submit"
          disabled={loading}
          className={`
            w-full bg-[#002147] text-white font-bold py-4 px-6 rounded-lg 
            border-b-4 border-yellow-500 active:border-b-0 
            transition-all duration-200 uppercase tracking-wider mt-2
            ${loading ? 'opacity-70 cursor-not-allowed' : 'hover:bg-[#003366] hover:shadow-lg'}
          `}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Logging in...
            </span>
          ) : (
            "Login to Portal"
          )}
        </button>

        <div className="border-t border-slate-100 pt-4 mt-2">
          <p className="text-center text-[10px] text-slate-400">
            Secure admin access only • Unauthorized access is prohibited
          </p>
        </div>
      </form>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        .animate-shake {
          animation: shake 0.3s ease-in-out;
        }
      `}</style>
    </div>
  );
}

export default AdminLog;