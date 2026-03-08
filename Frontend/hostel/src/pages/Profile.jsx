import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

function Profile() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [user, setUser] = useState(null);

  // Check authentication on mount
  useEffect(() => {
    const token = localStorage.getItem('access');
    const userData = localStorage.getItem('user');
    
    if (!token || !userData) {
      alert('Please login first');
      navigate('/login/student');
    } else {
      setUser(JSON.parse(userData));
    }
  }, [navigate]);

  // Form state
  const [formData, setFormData] = useState({
    full_name: '',
    aadhar: '',
    class_yr: '',
    branch: '',
    roll_no: '',
    dob: '',
    mobile: '',
    email: '',
    address: '',
    caste: '',
    catering: '',
    amount: ''
  });

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  // Submit form
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('access');
      
      if (!token) {
        alert('Session expired. Please login again.');
        navigate('/login/student');
        return;
      }

      console.log("Submitting application:", formData);

      // CORRECT ENDPOINT - using /api/profile/update/
      const response = await axios.post(
        'http://127.0.0.1:8000/api/profile/update/', 
        formData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (response.status === 201 || response.status === 200) {
        alert("Application Submitted Successfully!");
        navigate('/home');
      }
    } catch (error) {
      console.error("Submission Error:", error);
      
      if (error.response) {
        if (error.response.status === 401) {
          alert('Session expired. Please login again.');
          localStorage.removeItem('access');
          localStorage.removeItem('refresh');
          localStorage.removeItem('user');
          navigate('/login/student');
        } else {
          setError(error.response.data.error || 'Failed to submit application');
        }
      } else {
        setError('Network error. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 py-10 px-4">
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden border border-slate-200">
        
        {/* Form Header */}
        <div className="bg-[#002147] p-6 text-center text-white">
          <h1 className="text-lg font-bold text-yellow-500 uppercase">Andhra University</h1>
          <h2 className="text-xl font-black uppercase">College of Engineering (A) Hostel</h2>
          <p className="text-sm mt-1">Application for Admission</p>
          {user && (
            <p className="text-xs mt-2 text-yellow-300">Welcome, {user.full_name || user.username}</p>
          )}
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 m-6 rounded-lg">
            Error: {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          
          {/* Section 1: Personal Details */}
          <div className="space-y-4">
            <h3 className="text-blue-800 font-bold border-b pb-2 uppercase text-sm">1. Personal Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Name of the Applicant</label>
                <input 
                  type="text" 
                  name="full_name" 
                  value={formData.full_name} 
                  onChange={handleChange} 
                  required
                  className="border-b-2 border-slate-200 focus:border-blue-500 outline-none py-1 uppercase" 
                  placeholder="Full Name" 
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Aadhar No.</label>
                <input 
                  type="text" 
                  name="aadhar" 
                  value={formData.aadhar} 
                  onChange={handleChange} 
                  required
                  className="border-b-2 border-slate-200 focus:border-blue-500 outline-none py-1" 
                  placeholder="XXXX XXXX XXXX" 
                />
              </div>
            </div>
          </div>

          {/* Section 2: Academic Details */}
          <div className="space-y-4">
            <h3 className="text-blue-800 font-bold border-b pb-2 uppercase text-sm">2. Academic Details</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Class (e.g. 3/4)</label>
                <input 
                  type="text" 
                  name="class_yr" 
                  value={formData.class_yr} 
                  onChange={handleChange} 
                  className="border-b-2 border-slate-200 focus:border-blue-500 outline-none py-1" 
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Branch</label>
                <input 
                  type="text" 
                  name="branch" 
                  value={formData.branch} 
                  onChange={handleChange} 
                  className="border-b-2 border-slate-200 focus:border-blue-500 outline-none py-1" 
                  placeholder="INF / CSE" 
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Roll No.</label>
                <input 
                  type="text" 
                  name="roll_no" 
                  value={formData.roll_no} 
                  onChange={handleChange} 
                  className="border-b-2 border-slate-200 focus:border-blue-500 outline-none py-1" 
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Date of Birth</label>
                <input 
                  type="date" 
                  name="dob" 
                  value={formData.dob} 
                  onChange={handleChange} 
                  className="border-b-2 border-slate-200 focus:border-blue-500 outline-none py-1" 
                />
              </div>
            </div>
          </div>

          {/* Section 3: Contact Details */}
          <div className="space-y-4">
            <h3 className="text-blue-800 font-bold border-b pb-2 uppercase text-sm">3. Communication</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Student Mobile No.</label>
                <input 
                  type="tel" 
                  name="mobile" 
                  value={formData.mobile} 
                  onChange={handleChange} 
                  className="border-b-2 border-slate-200 focus:border-blue-500 outline-none py-1" 
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Email ID</label>
                <input 
                  type="email" 
                  name="email" 
                  value={formData.email} 
                  onChange={handleChange} 
                  className="border-b-2 border-slate-200 focus:border-blue-500 outline-none py-1" 
                />
              </div>
              <div className="flex flex-col gap-1 md:col-span-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Address for Communication</label>
                <textarea 
                  name="address" 
                  value={formData.address} 
                  onChange={handleChange} 
                  rows="2" 
                  className="border-b-2 border-slate-200 focus:border-blue-500 outline-none py-1 resize-none" 
                  placeholder="House No, Village, Mandal, District, State"
                ></textarea>
              </div>
            </div>
          </div>

          {/* Section 4: Preferences */}
          <div className="space-y-4">
            <h3 className="text-blue-800 font-bold border-b pb-2 uppercase text-sm">4. Other Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Caste (Sub-caste)</label>
                <input 
                  type="text" 
                  name="caste" 
                  value={formData.caste} 
                  onChange={handleChange} 
                  className="border-b-2 border-slate-200 focus:border-blue-500 outline-none py-1" 
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Type of Catering</label>
                <select 
                  name="catering" 
                  value={formData.catering} 
                  onChange={handleChange} 
                  className="border-b-2 border-slate-200 focus:border-blue-500 outline-none py-1 bg-transparent"
                >
                  <option value="">Select Type</option>
                  <option value="veg">Vegetarian</option>
                  <option value="non-veg">Non-Vegetarian</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Amount Paid</label>
                <input 
                  type="number" 
                  name="amount" 
                  value={formData.amount} 
                  onChange={handleChange} 
                  className="border-b-2 border-slate-200 focus:border-blue-500 outline-none py-1" 
                  placeholder="₹" 
                />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-10">
            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-[#002147] hover:bg-blue-900 text-white font-bold py-4 rounded-lg border-b-4 border-yellow-500 active:border-b-0 transition-all uppercase tracking-widest shadow-lg disabled:bg-gray-400 disabled:border-gray-600"
            >
              {loading ? 'Submitting...' : 'Submit Application'}
            </button>
            <p className="text-center text-[10px] text-slate-400 mt-4 italic">
              * By submitting, I agree to abide by the rules and regulations of the University Hostels.
            </p>
          </div>

        </form>
      </div>
    </div>
  );
}

export default Profile;