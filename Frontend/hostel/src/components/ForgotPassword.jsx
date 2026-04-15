// src/components/ForgotPassword.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleRequestOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      console.log("Requesting OTP for email:", email);
      
      // Try multiple possible endpoints
      const endpoints = [
        'http://127.0.0.1:8000/hostel/request-otp/',
        'http://127.0.0.1:8000/api/request-otp/',
        'http://127.0.0.1:8000/applications/request-otp/'
      ];
      
      let response = null;
      for (const endpoint of endpoints) {
        try {
          console.log(`Trying endpoint: ${endpoint}`);
          response = await axios.post(endpoint, { email: email });
          if (response.data) break;
        } catch (err) {
          console.log(`Failed on ${endpoint}`);
          continue;
        }
      }
      
      if (!response) {
        throw new Error("No working endpoint found");
      }
      
      console.log("OTP response:", response.data);
      
      if (response.data.status === "success") {
        setSuccess("OTP sent to your email!");
        setStep(2);
      } else {
        setError(response.data.error || "Failed to send OTP");
      }
      
    } catch (error) {
      console.error("OTP request failed:", error);
      setError("Failed to send OTP. Please check if the server is running.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const response = await axios.post('http://127.0.0.1:8000/hostel/verify-otp/', {
        email: email,
        otp: otp
      });
      
      console.log("Verify OTP response:", response.data);
      
      if (response.data.status === "success") {
        const resetToken = response.data.reset_token;
        localStorage.setItem('reset_token', resetToken);
        setSuccess('OTP verified!');
        setStep(3);
      } else {
        setError(response.data.error || "Invalid OTP");
      }
      
    } catch (error) {
      console.error('OTP verification failed:', error);
      setError('Invalid OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match!');
      setLoading(false);
      return;
    }
    
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long!');
      setLoading(false);
      return;
    }
    
    try {
      const resetToken = localStorage.getItem('reset_token');
      const response = await axios.post('http://127.0.0.1:8000/hostel/reset-password/', {
        reset_token: resetToken,
        new_password: newPassword
      });
      
      console.log("Reset password response:", response.data);
      
      if (response.data.status === "success") {
        setSuccess('Password reset successful! Redirecting to login...');
        localStorage.removeItem('reset_token');
        
        setTimeout(() => {
          navigate('/login/student');
        }, 2000);
      } else {
        setError(response.data.error || "Failed to reset password");
      }
      
    } catch (error) {
      console.error('Password reset failed:', error);
      setError('Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-slate-100 px-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-200 w-full max-w-md">
        <h2 className="text-2xl font-black text-slate-800 text-center uppercase tracking-wider mb-6">
          Forgot <span className="text-blue-700">Password</span>
        </h2>
        
        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4">
            {error}
          </div>
        )}
        
        {success && (
          <div className="bg-green-50 text-green-600 p-3 rounded-lg text-sm mb-4">
            {success}
          </div>
        )}
        
        {step === 1 && (
          <form onSubmit={handleRequestOTP} className="flex flex-col gap-4">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your registered email"
                required
                className="w-full px-4 py-2 rounded-lg bg-slate-50 border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all mt-1"
              />
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#002147] hover:bg-[#003366] text-white font-bold py-3 px-4 rounded-lg border-b-4 border-yellow-500 active:border-b-0 transition-all uppercase tracking-widest"
            >
              {loading ? 'Sending...' : 'Send OTP'}
            </button>
            
            <p className="text-center text-sm">
              Remember your password?{' '}
              <span
                className="text-blue-600 font-bold cursor-pointer hover:underline"
                onClick={() => navigate('/login/student')}
              >
                Login here
              </span>
            </p>
          </form>
        )}
        
        {step === 2 && (
          <form onSubmit={handleVerifyOTP} className="flex flex-col gap-4">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Enter OTP
              </label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="Enter 6-digit OTP"
                required
                pattern="[0-9]{6}"
                maxLength="6"
                className="w-full px-4 py-2 rounded-lg bg-slate-50 border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all mt-1"
              />
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#002147] hover:bg-[#003366] text-white font-bold py-3 px-4 rounded-lg border-b-4 border-yellow-500 active:border-b-0 transition-all uppercase tracking-widest"
            >
              {loading ? 'Verifying...' : 'Verify OTP'}
            </button>
          </form>
        )}
        
        {step === 3 && (
          <form onSubmit={handleResetPassword} className="flex flex-col gap-4">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                New Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                required
                className="w-full px-4 py-2 rounded-lg bg-slate-50 border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all mt-1"
              />
            </div>
            
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                required
                className="w-full px-4 py-2 rounded-lg bg-slate-50 border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all mt-1"
              />
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#002147] hover:bg-[#003366] text-white font-bold py-3 px-4 rounded-lg border-b-4 border-yellow-500 active:border-b-0 transition-all uppercase tracking-widest"
            >
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default ForgotPassword;