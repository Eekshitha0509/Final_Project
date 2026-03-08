// src/components/StudentLog.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

function StudentLog() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const response = await axios.post('http://127.0.0.1:8000/api/login/', {
        username: formData.username,
        password: formData.password
      });
      
      localStorage.setItem('access', response.data.access);
      localStorage.setItem('refresh', response.data.refresh);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      
      console.log('Login successful for user:', response.data.user.username);
      
      navigate('/profile');
      
    } catch (error) {
      console.error('Login failed:', error);
      if (error.response) {
        setError(error.response.data.error || 'Invalid username or password');
      } else {
        setError('Network error. Please try again.');
      }
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-slate-100 px-4">
      <form 
        onSubmit={handleLogin} 
        className="bg-white p-8 rounded-2xl shadow-xl border border-slate-200 w-full max-w-md flex flex-col gap-4"
      >
        <h2 className="text-2xl font-black text-slate-800 text-center uppercase tracking-wider mb-2">
          Student <span className="text-blue-700">Login</span>
        </h2>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            Username
          </label>
          <input 
            type="text" 
            name="username"
            value={formData.username}
            onChange={handleChange}
            placeholder="Enter your username" 
            required
            className="w-full px-4 py-2 rounded-lg bg-slate-50 border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            Password
          </label>
          <input 
            type="password" 
            name="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="••••••••" 
            required
            className="w-full px-4 py-2 rounded-lg bg-slate-50 border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
          />
        </div>

        <button 
          type="submit"
          className="w-full bg-[#002147] hover:bg-[#003366] text-white font-bold py-3 px-4 rounded-lg border-b-4 border-yellow-500 active:border-b-0 transition-all uppercase tracking-widest mt-2"
        >
          Login to Portal
        </button>

        <p className="text-center text-sm">
          Don't have an account?{' '}
          <span 
            onClick={() => navigate('/register')}
            className="text-blue-600 font-bold cursor-pointer hover:underline"
          >
            Register here
          </span>
        </p>
      </form>
    </div>
  );
}

export default StudentLog;