import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_BASE = 'http://127.0.0.1:8000/api/student/';

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
    if (!email) {
      setError('Please enter your email');
      return;
    }
    setLoading(true);
    setError('');
    
    try {
      const response = await axios.post(API_BASE + 'request-otp/', { email });

      if (response.data.status === 'success') {
        setSuccess('OTP sent to your email!');
        setStep(2);
      } else {
        setError(response.data.error || 'Failed to send OTP');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send OTP. Please check if the server is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    if (!otp) {
      setError('Please enter OTP');
      return;
    }
    setLoading(true);
    setError('');
    
    try {
      const response = await axios.post(API_BASE + 'verify-otp/', { email, otp });

      if (response.data.status === 'success') {
        localStorage.setItem('reset_token', response.data.reset_token);
        setSuccess('OTP verified!');
        setStep(3);
      } else {
        setError(response.data.error || 'Invalid OTP');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match!');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      const resetToken = localStorage.getItem('reset_token');
      const response = await axios.post(API_BASE + 'reset-password/', {
        reset_token: resetToken,
        new_password: newPassword
      });

      if (response.data.status === 'success') {
        setSuccess('Password reset successful! Redirecting...');
        localStorage.removeItem('reset_token');
        setTimeout(() => navigate('/login/student'), 2000);
      } else {
        setError(response.data.error || 'Failed to reset');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reset password');
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
                placeholder="Enter your email"
                required
                className="w-full px-4 py-2 rounded-lg bg-slate-50 border border-slate-200 mt-1"
              />
            </div>
            <button type="submit" disabled={loading} className="w-full bg-[#002147] text-white py-3 rounded-lg uppercase">
              {loading ? 'Sending...' : 'Send OTP'}
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleVerifyOTP} className="flex flex-col gap-4">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">OTP</label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="Enter OTP"
                required
                className="w-full px-4 py-2 rounded-lg bg-slate-50 border border-slate-200"
              />
            </div>
            <button type="submit" disabled={loading} className="w-full bg-[#002147] text-white py-3 rounded-lg uppercase">
              {loading ? 'Verifying...' : 'Verify OTP'}
            </button>
            <button type="button" onClick={() => setStep(1)} className="text-sm text-slate-500">
              Back
            </button>
          </form>
        )}

        {step === 3 && (
          <form onSubmit={handleResetPassword} className="flex flex-col gap-4">
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="New Password"
              required
              className="w-full px-4 py-2 rounded-lg bg-slate-50 border border-slate-200"
            />
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm Password"
              required
              className="w-full px-4 py-2 rounded-lg bg-slate-50 border border-slate-200"
            />
            <button type="submit" disabled={loading} className="w-full bg-[#002147] text-white py-3 rounded-lg uppercase">
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default ForgotPassword;