// src/components/Register.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from 'axios';
import { toast } from 'react-toastify';

const STUDENT_API = 'http://127.0.0.1:8000/api/student/';

function Register() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: "",
    first_name: "",
    last_name: "",
    email: "",
    admission: "",
    year: "",
    branch: "",
    phone: "",
    password: "",
    password2: ""
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Basic validation
    if (formData.password !== formData.password2) {
      setError("Passwords do not match!");
      setLoading(false);
      return;
    }

    // Check phone number
    if (!formData.phone || formData.phone.trim() === '') {
      setError("Phone number is required!");
      setLoading(false);
      return;
    }

    // Prepare data for backend - MATCHING YOUR SERIALIZER
    const submitData = {
        admission_no: formData.admission,   // ✅ FIXED
        reg_no: formData.admission,         // optional but safe
        full_name: formData.first_name + " " + formData.last_name,  // ✅ FIXED
        phone: formData.phone,
        email: formData.email,
        password: formData.password
      };
    console.log("Sending registration data:", submitData);

    try {
      const response = await axios.post(STUDENT_API + 'register/', submitData);
      
      console.log("Registration response:", response.data);
      
      if (response.data.success) {
        toast.success("Registration successful! Please login.");
        navigate('/login/student');
      } else {
        setError(JSON.stringify(response.data.errors) || "Registration failed");
      }
      
    } catch (error) {
      console.error("Registration failed:", error);
      console.error("Error response:", error.response?.data);
      
      if (error.response?.data?.errors) {
        const errors = error.response.data.errors;
        const errorMessages = Object.keys(errors).map(key => `${key}: ${errors[key]}`).join('\n');
        setError(errorMessages);
      } else if (error.response?.data?.message) {
        setError(error.response.data.message);
      } else if (error.response?.status === 500) {
        setError("Phone number already exists. Please use a different phone number.");
      } else {
        setError("Registration failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-slate-100 px-4 py-8">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-8 rounded-2xl shadow-xl border border-slate-200 w-full max-w-md flex flex-col gap-4"
      >
        <h2 className="text-2xl font-black text-slate-800 text-center uppercase tracking-wider">
          Student <span className="text-blue-700">Register</span>
        </h2>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm whitespace-pre-line">
            {error}
          </div>
        )}

        {/* Username */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            Username *
          </label>
          <input
            type="text"
            name="username"
            placeholder="Choose a username"
            value={formData.username}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 rounded-lg bg-slate-50 border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
          />
        </div>

        {/* First Name */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            First Name *
          </label>
          <input
            type="text"
            name="first_name"
            placeholder="First name"
            value={formData.first_name}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 rounded-lg bg-slate-50 border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
          />
        </div>

        {/* Last Name */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            Last Name *
          </label>
          <input
            type="text"
            name="last_name"
            placeholder="Last name"
            value={formData.last_name}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 rounded-lg bg-slate-50 border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
          />
        </div>

        {/* Email */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            Email *
          </label>
          <input
            type="email"
            name="email"
            placeholder="student@example.com"
            value={formData.email}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 rounded-lg bg-slate-50 border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
          />
        </div>

        {/* Admission Number */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            Admission Number *
          </label>
          <input
            type="text"
            name="admission"
            placeholder="Enter admission number"
            value={formData.admission}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 rounded-lg bg-slate-50 border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
          />
        </div>

        {/* Phone Number */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            Phone Number *
          </label>
          <input
            type="tel"
            name="phone"
            placeholder="Enter your phone number"
            value={formData.phone}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 rounded-lg bg-slate-50 border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
          />
        </div>

        {/* Year */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            Year *
          </label>
          <select
            name="year"
            value={formData.year}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 rounded-lg bg-slate-50 border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
          >
            <option value="">Select Year</option>
            <option value="1">1st Year</option>
            <option value="2">2nd Year</option>
            <option value="3">3rd Year</option>
            <option value="4">4th Year</option>
          </select>
        </div>

        {/* Branch */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            Branch *
          </label>
          <input
            type="text"
            name="branch"
            placeholder="e.g., CSE, ECE, MECH"
            value={formData.branch}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 rounded-lg bg-slate-50 border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
          />
        </div>

        {/* Password */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            Password *
          </label>
          <input
            type="password"
            name="password"
            placeholder="••••••••"
            value={formData.password}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 rounded-lg bg-slate-50 border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
          />
        </div>

        {/* Confirm Password */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            Confirm Password *
          </label>
          <input
            type="password"
            name="password2"
            placeholder="••••••••"
            value={formData.password2}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 rounded-lg bg-slate-50 border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#002147] hover:bg-[#003366] text-white font-bold py-3 px-4 rounded-lg border-b-4 border-yellow-500 active:border-b-0 transition-all uppercase tracking-widest disabled:bg-gray-400 disabled:border-gray-600 mt-2"
        >
          {loading ? 'Registering...' : 'Create Account'}
        </button>

        <p className="text-center text-sm">
          Already have an account?{" "}
          <span
            className="text-blue-700 font-bold cursor-pointer hover:underline"
            onClick={() => navigate('/login/student')}
          >
            Login here
          </span>
        </p>
      </form>
    </div>
  );
}

export default Register;