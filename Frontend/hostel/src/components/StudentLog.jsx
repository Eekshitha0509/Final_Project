// src/components/StudentLog.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

function StudentLog() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    login_id: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!formData.login_id.trim()) {
      setError('Please enter your admission number');
      setLoading(false);
      return;
    }

    if (!formData.password.trim()) {
      setError('Please enter your password');
      setLoading(false);
      return;
    }

    try {
      const loginData = {
        admission_number: formData.login_id.trim(),
        password: formData.password
      };
      
      console.log('Sending login data:', loginData);
      
      const STUDENT_API = 'http://127.0.0.1:8000/api/student/';
      const response = await axios.post(STUDENT_API + 'login/', loginData, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        withCredentials: true
      });
      
      console.log('Login response:', response.data);
      
      if (response.data.success) {
        const userData = response.data.user;
        
        // Store user data with consistent key names
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('user', JSON.stringify(userData));
        localStorage.setItem('student_name', userData.full_name);
        
        // FIX: Store both admission_no and reg_no (use the same value for both)
        localStorage.setItem('admission_no', userData.admission_number); // Changed from admission_number to admission_no
        localStorage.setItem('reg_no', userData.admission_number); // Using admission_number for reg_no too
        localStorage.setItem('admission_number', userData.admission_number); // Keep original for compatibility
        
        localStorage.setItem('email', userData.email);
        localStorage.setItem('phone', userData.phone_number || '');
        localStorage.setItem('student', 'true');
        localStorage.setItem('access', response.data.access);
        localStorage.setItem('refresh', response.data.refresh);
        localStorage.setItem('access_token', response.data.access);
        localStorage.setItem('refresh_token', response.data.refresh);
        
        console.log('Stored admission_no:', localStorage.getItem('admission_no'));
        console.log('Stored reg_no:', localStorage.getItem('reg_no'));
        console.log('Login successful! Redirecting to profile...');
        
        // Option 1: Pass data through navigation state
        navigate('/profile', { 
          state: { 
            studentData: userData,
            admission_no: userData.admission_number,
            reg_no: userData.admission_number
          } 
        });
      } else {
        setError(response.data.error || 'Login failed');
      }
      
    } catch (error) {
      console.error('Login error:', error);
      
      if (error.response) {
        console.error('Error data:', error.response.data);
        console.error('Error status:', error.response.status);
        
        if (error.response.status === 401) {
          setError('Invalid admission number or password');
        } else if (error.response.data?.error) {
          setError(error.response.data.error);
        } else {
          setError('Login failed. Please try again.');
        }
      } else if (error.request) {
        setError('Cannot connect to server. Please check if backend is running.');
      } else {
        setError('An error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
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
            Admission Number *
          </label>
          <input 
            type="text" 
            name="login_id"
            value={formData.login_id}
            onChange={handleChange}
            placeholder="Enter your admission number" 
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
          disabled={loading}
          className={`w-full bg-[#002147] hover:bg-[#003366] text-white font-bold py-3 px-4 rounded-lg border-b-4 border-yellow-500 active:border-b-0 transition-all uppercase tracking-widest mt-2 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
        >
          {loading ? 'Logging in...' : 'Login to Portal'}
        </button>

        <div className="text-center">
          <p className="text-sm">
            <span 
              onClick={() => navigate('/forgot-password')}
              className="text-blue-600 font-bold cursor-pointer hover:underline"
            >
              Forgot Password?
            </span>
          </p>
        </div>

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