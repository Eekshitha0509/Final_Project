import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from 'axios';
import { toast } from 'react-toastify';

const APP_API = 'http://127.0.0.1:8000/api/app/';
const STUDENT_API = 'http://127.0.0.1:8000/api/student/';

const AdminDashboard = () => {
  const navigate = useNavigate();

  // --- State Management ---
  const [activeTab, setActiveTab] = useState("students");
  const [searchId, setSearchId] = useState("");
  const [searchType, setSearchType] = useState("admission_no");
  const [student, setStudent] = useState(null);
  const [billingData, setBillingData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  
  // --- Registrations State ---
  const [registrations, setRegistrations] = useState(null);
  const [regLoading, setRegLoading] = useState(false);
  
  // --- Upload Excel State ---
  const [studentFile, setStudentFile] = useState(null);
  const [billingFile, setBillingFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadType, setUploadType] = useState("student");
  const [uploadResult, setUploadResult] = useState(null);
  
  // --- Hostel Allocation State ---
  const [hostels, setHostels] = useState([]);
  const [allocationLoading, setAllocationLoading] = useState(false);
  const [allocationSaving, setAllocationSaving] = useState(false);

  // --- API Call: Fetch Student Details ---
  const fetchStudent = async () => {
    if (!searchId) return setError("Please enter Admission or Registration Number");
    
    try {
      setError("");
      setStudent(null);
      setLoading(true);

      const response = await fetch(
        `${STUDENT_API}get-student/?${searchType}=${searchId}`
      );

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }
      
      const data = await response.json();
      
      console.log("Student API Response:", data);
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      setStudent(data);
    } catch (err) {
      setError(err.message || "No student records found");
    } finally {
      setLoading(false);
    }
  };

  // --- Upload Student Excel File ---
  const handleStudentUpload = async () => {
    if (!studentFile) {
      toast.warn('Please select a student Excel file first');
      return;
    }

    const formData = new FormData();
    formData.append('file', studentFile);
    
    setUploading(true);
    setUploadResult(null);
    
    try {
      const response = await axios.post(
        APP_API + 'upload-excel/',
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      
      setUploadResult({ type: 'student', ...response.data });
      toast.success('Student data uploaded successfully!');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Upload failed: ' + (error.response?.data?.error || error.message));
      setUploadResult({ success: false, message: error.response?.data?.error || error.message });
    } finally {
      setUploading(false);
    }
  };

  // --- Upload Billing Excel File ---
  const handleBillingUpload = async () => {
    if (!billingFile) {
      toast.warn('Please select a billing Excel file first');
      return;
    }

    const formData = new FormData();
    formData.append('file', billingFile);
    
    setUploading(true);
    setUploadResult(null);
    
    try {
      const response = await axios.post(
        APP_API + 'upload-billing-excel/',
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      
setUploadResult({ type: 'billing', ...response.data });
      toast.success('Billing data uploaded successfully!');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Upload failed: ' + (error.response?.data?.error || error.message));
      setUploadResult({ success: false, message: error.response?.data?.error || error.message });
    } finally {
      setUploading(false);
    }
  };

  // --- API Call: Fetch Billing Details ---
  const fetchBillingDetails = async () => {
    if (!searchId) return setError("Please enter Admission or Registration Number");
    
    try {
      setError("");
      setBillingData(null);
      setLoading(true);

      const response = await fetch(
        `${STUDENT_API}get-student-billing/?${searchType}=${searchId}`
      );

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      if (!data.billing_data || data.billing_data.length === 0 || !data.billing_data[0]?.months) {
        throw new Error("No billing records found for this student");
      }
      
      setBillingData(data);
    } catch (err) {
      setError(err.message || "No billing records found for this student");
    } finally {
      setLoading(false);
    }
  };

  // --- API Call: Fetch Registrations Summary ---
  const fetchRegistrations = async () => {
    setRegLoading(true);
    try {
      const response = await fetch(
        STUDENT_API + 'registrations-summary/'
      );
      
      if (!response.ok) throw new Error("Failed to fetch");
      
      const data = await response.json();
      console.log("Registrations API Response:", data);
      setRegistrations(data);
    } catch (err) {
      setError(err.message || "Failed to load registrations");
    } finally {
      setRegLoading(false);
    }
  };

  // --- Upload Excel File ---
  const handleFileUpload = async () => {
    const uploadFile = studentFile; 
    if (!uploadFile) {
      toast.warn('Please select an Excel file first');
      return;
    }

    const formData = new FormData();
    formData.append('file', uploadFile);
    
    setUploading(true);
    setUploadResult(null);
    
    try {
      const response = await axios.post(
        APP_API + 'upload-meta-hostel-excel/',
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      
      setUploadResult(response.data);
      toast.success('Upload successful!');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Upload failed: ' + (error.response?.data?.error || error.message));
      setUploadResult({ success: false, message: error.response?.data?.error || error.message });
    } finally {
      setUploading(false);
    }
  };

  // Handle Enter key press
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      if (activeTab === "students") {
        fetchStudent();
      } else if (activeTab === "billing") {
        fetchBillingDetails();
      }
    }
  };

  // Handle search button click based on active tab
  const handleSearch = () => {
    if (activeTab === "students") {
      fetchStudent();
    } else if (activeTab === "billing") {
      fetchBillingDetails();
    }
  };

  // --- Fetch Hostels for Allocation ---
  const fetchHostelsForAllocation = async () => {
    setAllocationLoading(true);
    try {
      const response = await axios.get(APP_API + 'blocks/');
      setHostels(response.data);
    } catch (error) {
      console.error('Error fetching hostels:', error);
      setHostels([]);
    } finally {
      setAllocationLoading(false);
    }
  };

  // --- Save Allocation ---
  const saveAllocation = async (hostelId, yearFloorMapping) => {
    setAllocationSaving(true);
    try {
      const response = await axios.post(APP_API + 'save-allocation/', {
        hostel_id: hostelId,
        year_floor_mapping: yearFloorMapping
      });
      if (response.data.success) {
        toast.success('Allocation saved successfully!');
      } else {
        toast.error(response.data.error || 'Failed to save allocation');
      }
    } catch (error) {
      console.error('Error saving allocation:', error);
      toast.error('Failed to save allocation');
    } finally {
      setAllocationSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans">
      
      {/* SIDEBAR */}
      <div className="w-64 bg-slate-900 text-white flex flex-col p-6 shadow-xl">
        <h2 className="text-xl font-black text-blue-400 mb-10 uppercase tracking-widest">AU Admin</h2>
        <nav className="flex-1 space-y-2">
          <TabButton 
            active={activeTab === "students"} 
            onClick={() => {
              setActiveTab("students");
              setStudent(null);
              setBillingData(null);
              setError("");
              setSearchId("");
              setUploadResult(null);
            }} 
            label="Student Records" 
            icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />}
          />
          <TabButton 
            active={activeTab === "billing"} 
            onClick={() => {
              setActiveTab("billing");
              setStudent(null);
              setBillingData(null);
              setError("");
              setSearchId("");
              setUploadResult(null);
            }} 
            label="Billing Details" 
            icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />}
          />
          <TabButton 
            active={activeTab === "registrations"} 
            onClick={() => {
              setActiveTab("registrations");
              setStudent(null);
              setBillingData(null);
              setError("");
              setUploadResult(null);
              fetchRegistrations();
            }} 
            label="Registrations" 
            icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />}
          />
          <TabButton 
            active={activeTab === "certificates"} 
            onClick={() => {
              setActiveTab("certificates");
              setStudent(null);
              setBillingData(null);
              setError("");
              setUploadResult(null);
            }} 
            label="Certificates" 
            icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />}
          />
          <TabButton 
            active={activeTab === "upload"} 
            onClick={() => {
              setActiveTab("upload");
              setStudent(null);
              setBillingData(null);
              setError("");
              setUploadResult(null);
              setStudentFile(null);
              setBillingFile(null);
            }} 
            label="Upload Excel" 
            icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />}
          />
          <TabButton 
            active={activeTab === "allocation"} 
            onClick={() => {
              setActiveTab("allocation");
              setStudent(null);
              setBillingData(null);
              setError("");
              setUploadResult(null);
              fetchHostelsForAllocation();
            }} 
            label="Hostel Allocation" 
            icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />}
          />
        </nav>
      </div>

      {/* MAIN SECTION */}
      <div className="flex-1 p-12 overflow-y-auto">
        
        {/* STUDENTS TAB */}
        {activeTab === "students" && (
          <div className="animate-in fade-in duration-500">
            <h1 className="text-4xl font-light text-slate-900 mb-8">Search Registry</h1>
            
            {/* Search Type Toggle Buttons */}
            <div className="flex gap-4 mb-6">
              <button
                onClick={() => {
                  setSearchType("admission_no");
                  setStudent(null);
                  setError("");
                }}
                className={`px-6 py-2 rounded-lg font-bold transition-all ${
                  searchType === "admission_no" 
                    ? "bg-blue-600 text-white shadow-md" 
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                Search by Admission Number
              </button>
              <button
                onClick={() => {
                  setSearchType("reg_no");
                  setStudent(null);
                  setError("");
                }}
                className={`px-6 py-2 rounded-lg font-bold transition-all ${
                  searchType === "reg_no" 
                    ? "bg-blue-600 text-white shadow-md" 
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                Search by Registration Number
              </button>
            </div>
            
            <div className="flex gap-4 mb-10">
              <input
                type="text"
                placeholder={searchType === "admission_no" ? "Enter Admission Number..." : "Enter Registration Number..."}
                value={searchId}
                onChange={(e) => setSearchId(e.target.value)}
                onKeyPress={handleKeyPress}
                className="bg-white border border-slate-200 px-6 py-4 rounded-2xl w-80 shadow-sm focus:ring-2 focus:ring-blue-400 outline-none"
              />
              <button
                onClick={handleSearch}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-2xl font-bold shadow-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Searching..." : "Fetch Details"}
              </button>
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 font-medium border border-red-200">
                {error}
              </div>
            )}

            {student && (
              <div className="bg-white shadow-2xl rounded-[2.5rem] p-10 border border-slate-100 animate-in slide-in-from-bottom-4">
                <div className="grid md:grid-cols-4 gap-12">
                  
                  {/* Column 1: Academic Profile */}
                  <div className="space-y-6">
                    <SectionLabel label="Academic Profile" color="blue" />
                    <DataPoint label="Full Name" value={student.full_name} />
                    <DataPoint label="Admission No" value={student.admission_no} />
                    <DataPoint label="Registration No" value={student.reg_no} />
                    <DataPoint label="Roll Number" value={student.roll_no} />
                    <DataPoint label="Year & Branch" value={`${student.class_yr || 'N/A'} - ${student.branch || 'N/A'}`} />
                    <DataPoint label="Catering" value={student.catering || 'Not Specified'} />
                  </div>

                  {/* Column 2: Personal & Contact */}
                  <div className="space-y-6">
                    <SectionLabel label="Personal Information" color="green" />
                    <DataPoint label="Mobile" value={student.mobile} />
                    <DataPoint label="Email ID" value={student.email} />
                    <DataPoint label="Aadhar No" value={student.aadhar || 'Not Provided'} />
                    <DataPoint label="Date of Birth" value={student.dob || 'Not Provided'} />
                    <DataPoint label="Caste" value={student.caste || 'Not Provided'} />
                    <DataPoint label="Fee Amount" value={`₹${student.amount || '0'}`} />
                  </div>

                  {/* Column 3: Room Details */}
                  <div className="space-y-6">
                    <SectionLabel label="Room Details" color="purple" />
                    {(student.room_details || (student.block && student.block !== "Not Allotted")) ? (
                      <>
                        <DataPoint 
                          label="Room Number" 
                          value={student.room_details?.room_number || student.room_no || student.room} 
                        />
                        <DataPoint 
                          label="Block Name" 
                          value={student.room_details?.block_name || student.block} 
                        />
                        <DataPoint 
                          label="Floor" 
                          value={student.room_details?.floor || student.floor || "N/A"} 
                        />
                        <DataPoint 
                          label="Bed Number" 
                          value={student.room_details?.bed_number || student.bed_number || "N/A"} 
                        />
                        <DataPoint 
                          label="Room Type" 
                          value={student.room_details?.room_type || student.room_type || "N/A"} 
                        />
                        <DataPoint 
                          label="Sharing Type" 
                          value={student.room_details?.sharing_type || student.sharing_type || "N/A"} 
                        />
                        {(student.room_details?.allotted_date || student.allotted_date) && (
                          <DataPoint 
                            label="Allotted Date" 
                            value={new Date(student.room_details?.allotted_date || student.allotted_date).toLocaleDateString()} 
                          />
                        )}
                      </>
                    ) : (
                      <div className="px-2 py-4 text-center bg-slate-50 rounded-lg">
                        <p className="text-slate-500 text-sm">No room allotted yet</p>
                        <p className="text-xs text-slate-400 mt-1">Student hasn't completed room booking</p>
                      </div>
                    )}
                  </div>

                  {/* Column 4: Family & Media */}
                  <div className="space-y-6">
                    <SectionLabel label="Family & Media" color="orange" />
                    <DataPoint 
                      label="Father Name" 
                      value={`${student.father_name || 'Not Provided'} ${student.father_phone ? `(${student.father_phone})` : ''}`} 
                    />
                    <DataPoint 
                      label="Mother Name" 
                      value={`${student.mother_name || 'Not Provided'} ${student.mother_phone ? `(${student.mother_phone})` : ''}`} 
                    />
                    <DataPoint 
                      label="Guardian" 
                      value={`${student.guardian_name || 'Not Provided'} ${student.guardian_phone ? `(${student.guardian_phone})` : ''}`} 
                    />
                    
                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <div className="text-center">
                        <div className="w-16 h-20 mx-auto bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden shadow-inner">
                          {student.student_photo ? (
                            <img
                              src={student.student_photo.startsWith('http') 
                                  ? student.student_photo 
                                  : `http://127.0.0.1:8000${student.student_photo.startsWith('/') ? '' : '/'}${student.student_photo}`}
                              alt="Student"
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.target.onerror = null; 
                                e.target.src = "https://via.placeholder.com/150?text=No+Image";
                              }}
                            />
                          ) : (
                            <div className="text-center">
                              <svg className="w-8 h-8 mx-auto text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                            </div>
                          )}
                        </div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">Student</p>
                      </div>
                      
                      <div className="text-center">
                        <div className="w-16 h-20 mx-auto bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden shadow-inner">
                          {student.father_photo ? (
                            <img
                              src={student.father_photo.startsWith('http') 
                                  ? student.father_photo 
                                  : `http://127.0.0.1:8000${student.father_photo.startsWith('/') ? '' : '/'}${student.father_photo}`}
                              alt="Father"
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.target.onerror = null; 
                                e.target.src = "https://via.placeholder.com/150?text=No+Image";
                              }}
                            />
                          ) : (
                            <div className="text-center">
                              <svg className="w-8 h-8 mx-auto text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                            </div>
                          )}
                        </div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">Father</p>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            )}
          </div>
        )}

        {/* BILLING TAB */}
        {activeTab === "billing" && (
          <div className="animate-in fade-in duration-500">
            <h1 className="text-4xl font-light text-slate-900 mb-8">Billing Details</h1>
            
            {/* Search Type Toggle Buttons */}
            <div className="flex gap-4 mb-6">
              <button
                onClick={() => {
                  setSearchType("admission_no");
                  setBillingData(null);
                  setError("");
                }}
                className={`px-6 py-2 rounded-lg font-bold transition-all ${
                  searchType === "admission_no" 
                    ? "bg-blue-600 text-white shadow-md" 
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                Search by Admission Number
              </button>
              <button
                onClick={() => {
                  setSearchType("reg_no");
                  setBillingData(null);
                  setError("");
                }}
                className={`px-6 py-2 rounded-lg font-bold transition-all ${
                  searchType === "reg_no" 
                    ? "bg-blue-600 text-white shadow-md" 
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                Search by Registration Number
              </button>
            </div>
            
            <div className="flex gap-4 mb-10">
              <input
                type="text"
                placeholder={searchType === "admission_no" ? "Enter Admission Number..." : "Enter Registration Number..."}
                value={searchId}
                onChange={(e) => setSearchId(e.target.value)}
                onKeyPress={handleKeyPress}
                className="bg-white border border-slate-200 px-6 py-4 rounded-2xl w-80 shadow-sm focus:ring-2 focus:ring-blue-400 outline-none"
              />
              <button
                onClick={handleSearch}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-2xl font-bold shadow-lg transition-all active:scale-95 disabled:opacity-50"
              >
                {loading ? "Searching..." : "Fetch Billing"}
              </button>
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 font-medium border border-red-200">
                {error}
              </div>
            )}

            {billingData && (
              <div className="bg-white shadow-2xl rounded-[2.5rem] p-10 border border-slate-100">
                {/* Student Summary */}
                <div className="mb-8 p-6 bg-slate-50 rounded-xl">
                  <h3 className="text-xl font-bold text-slate-800 mb-4">Student Summary</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <DataPoint label="Student Name" value={billingData.student?.full_name} />
                    <DataPoint label="Admission No" value={billingData.student?.admission_no || billingData.student?.reg_no} />
                    <DataPoint label="Registration No" value={billingData.student?.reg_no} />
                    <DataPoint label="Room No" value={billingData.student?.room_no} />
                    <DataPoint label="Class/Year" value={billingData.student?.class_yr} />
                    <DataPoint label="Total Paid" value={`₹${billingData.total_credit || 0}`} />
                    <DataPoint label="Total Months" value={billingData.billing_data?.[0]?.months ? Object.keys(billingData.billing_data[0].months).length : 0} />
                  </div>
                </div>

                {/* Billing Table */}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-800 text-white">
                      <tr>
                        <th className="px-4 py-3 text-left">Month</th>
                        <th className="px-4 py-3 text-left">Days</th>
                        <th className="px-4 py-3 text-left">Electric Charge</th>
                        <th className="px-4 py-3 text-left">Mess Charge</th>
                        <th className="px-4 py-3 text-left">Service Charge</th>
                        <th className="px-4 py-3 text-left">Net Demand</th>
                        <th className="px-4 py-3 text-left">Collection</th>
                        <th className="px-4 py-3 text-left">Date</th>
                        <th className="px-4 py-3 text-left">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {billingData.billing_data && billingData.billing_data.length > 0 && billingData.billing_data[0].months ? (
                        Object.entries(billingData.billing_data[0].months).map(([month, data]) => (
                          data && (data.days > 0 || data.collection > 0) && (
                            <tr key={month} className="border-b border-slate-200 hover:bg-slate-50">
                              <td className="px-4 py-3 font-medium">{month}</td>
                              <td className="px-4 py-3">{data.days || '-'}</td>
                              <td className="px-4 py-3">₹{data.electric_charge || 0}</td>
                              <td className="px-4 py-3">₹{data.mess_charge || 0}</td>
                              <td className="px-4 py-3">₹{data.service_charge || 0}</td>
                              <td className="px-4 py-3 font-semibold">₹{data.net_demand || 0}</td>
                              <td className="px-4 py-3 text-green-600 font-bold">₹{data.collection || 0}</td>
                              <td className="px-4 py-3">{data.date || '-'}</td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                  data.collection > 0 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                                }`}>
                                  {data.collection > 0 ? 'Paid' : 'Pending'}
                                </span>
                              </td>
                            </tr>
                          )
                        ))
                      ) : (
                        <tr>
                          <td colSpan="9" className="text-center py-8 text-slate-500">
                            No billing records found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* CERTIFICATES TAB */}
        {activeTab === "certificates" && (
          <div className="grid md:grid-cols-3 gap-8">
            <CertCard title="Resident Certificate" path="/residentcertificate" navigate={navigate} />
            <CertCard title="No Dues Certificate" path="/nodues" navigate={navigate} />
            <CertCard title="Estimation Slip" path="/estimationslip" navigate={navigate} />
          </div>
        )}

        {/* UPLOAD EXCEL TAB */}
        {activeTab === "upload" && (
          <div className="animate-in fade-in duration-500">
            <h1 className="text-4xl font-light text-slate-900 mb-8">Upload Excel Data</h1>
            
            <div className="bg-white shadow-2xl rounded-[2.5rem] p-10 border border-slate-100">
              <div className="max-w-2xl mx-auto space-y-8">
                
                {/* Student Data Upload */}
                <div className="border-2 border-dashed border-blue-300 rounded-xl p-6 bg-blue-50">
                  <h3 className="text-lg font-bold text-blue-800 mb-3">📚 Upload Student Details</h3>
                  <p className="text-sm text-blue-600 mb-3">
                    Columns: reg_no, full_name, dob, aadhar_no, caste, admission_no, admission_date, degree, branch, year, hostel, room_no, mobile, email, address, amount, months_stayed, is_leaving, father_name, father_phone, mother_name, mother_phone
                  </p>
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={(e) => setStudentFile(e.target.files[0])}
                    className="mb-3 w-full text-sm form-input"
                  />
                  {studentFile && <p className="text-sm text-green-600 mb-2">Selected: {studentFile.name}</p>}
                  <button
                    onClick={handleStudentUpload}
                    disabled={uploading || !studentFile}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition disabled:opacity-50"
                  >
                    {uploading ? "Uploading..." : "Upload Student Data"}
                  </button>
                </div>

                {/* Billing Rates Upload */}
                <div className="border-2 border-dashed border-green-300 rounded-xl p-6 bg-green-50">
                  <h3 className="text-lg font-bold text-green-800 mb-3">💰 Upload Billing Rates</h3>
                  <p className="text-sm text-green-600 mb-3">
                    Columns: MONTH, DAYS, MESS_CHARGE, ELECTRIC_CHARGE, DATE
                  </p>
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={(e) => setBillingFile(e.target.files[0])}
                    className="mb-3 w-full text-sm form-input"
                  />
                  {billingFile && <p className="text-sm text-green-600 mb-2">Selected: {billingFile.name}</p>}
                  <button
                    onClick={handleBillingUpload}
                    disabled={uploading || !billingFile}
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 rounded-lg transition disabled:opacity-50"
                  >
                    {uploading ? "Uploading..." : "Upload Billing Data"}
                  </button>
                </div>

                {/* Results Summary */}
                {uploadResult && (
                  <div className={`mt-6 p-4 rounded-xl ${
                    uploadResult.success !== false ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                  }`}>
                    <h4 className="font-bold mb-2">📊 Upload Summary:</h4>
                    {uploadResult.type === 'student' ? (
                      <>
                        <p>✅ Students Created: {uploadResult.students_created || 0}</p>
                        {uploadResult.message && <p className="mt-2 text-sm">📝 {uploadResult.message}</p>}
                      </>
                    ) : uploadResult.type === 'billing' ? (
                      <>
                        <p>✅ Billing Records: {uploadResult.count || 0}</p>
                        {uploadResult.message && <p className="mt-2 text-sm">📝 {uploadResult.message}</p>}
                      </>
                    ) : (
                      <p className="text-red-600">❌ {uploadResult.message || 'Upload failed'}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* REGISTRATIONS TAB */}
        {activeTab === "registrations" && (
          <RegistrationsTab registrations={registrations} loading={regLoading} />
        )}

        {/* ALLOCATION TAB */}
        {activeTab === "allocation" && (
          <AllocationTab 
            hostels={hostels} 
            loading={allocationLoading}
            saving={allocationSaving}
            onSave={saveAllocation}
          />
        )}
      </div>
    </div>
  );
};

// --- Helper Components ---
const TabButton = ({ active, onClick, label, icon }) => (
  <button
    onClick={onClick}
    className={`w-full text-left p-4 rounded-xl font-bold text-sm uppercase tracking-tight transition-all flex items-center gap-3 ${
      active ? "bg-blue-600 shadow-lg" : "hover:bg-slate-800 text-slate-400"
    }`}
  >
    {icon && (
      <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        {icon}
      </svg>
    )}
    {label}
  </button>
);

const SectionLabel = ({ label, color }) => {
  const colors = {
    blue: "text-blue-600 bg-blue-50",
    green: "text-green-600 bg-green-50",
    orange: "text-orange-600 bg-orange-50",
    purple: "text-purple-600 bg-purple-50"
  };
  return (
    <h3 className={`text-[11px] font-black uppercase tracking-[0.2em] px-4 py-2 rounded-lg inline-block ${colors[color]}`}>
      {label}
    </h3>
  );
};

const DataPoint = ({ label, value }) => (
  <div className="flex flex-col px-2 py-1 hover:bg-slate-50 rounded-lg transition-colors">
    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{label}</span>
    <span className="text-slate-800 font-medium break-words">{value || "Not Provided"}</span>
  </div>
);

const CertCard = ({ title, path, navigate }) => (
  <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm text-center hover:shadow-xl transition-all group cursor-pointer">
    <h3 className="font-bold text-slate-800 mb-6 text-lg">{title}</h3>
    <button
      onClick={() => navigate(path)}
      className="bg-slate-50 text-slate-900 px-6 py-3 rounded-xl font-bold hover:bg-slate-900 hover:text-white transition-all w-full"
    >
      Generate PDF
    </button>
  </div>
);

const RegistrationsTab = ({ registrations, loading }) => {
  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (!registrations) return <div className="p-8 text-center">Click "Registrations" tab to load</div>;
  
  const { total_students, year_counts, registrations: regs } = registrations;
  
  return (
    <div className="animate-in fade-in duration-500">
      <h1 className="text-4xl font-light text-slate-900 mb-8">Student Registrations</h1>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-blue-600">
          <p className="text-sm text-slate-500">Total Students</p>
          <p className="text-3xl font-bold text-blue-600">{total_students}</p>
        </div>
        {Object.entries(year_counts || {}).map(([year, count]) => (
          <div key={year} className="bg-white p-6 rounded-xl shadow-md border-l-4 border-green-600">
            <p className="text-sm text-slate-500">Year {year}</p>
            <p className="text-3xl font-bold text-green-600">{count}</p>
          </div>
        ))}
      </div>
      
      {/* Registrations Table */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-100">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase">Admission No</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase">Name</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase">Year</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase">Branch</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase">Block</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase">Room</th>
              </tr>
            </thead>
            <tbody>
              {(regs || []).map((s) => (
                <tr key={s.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium">{s.admission_no}</td>
                  <td className="px-4 py-3">{s.full_name}</td>
                  <td className="px-4 py-3">{s.class_yr || '-'}</td>
                  <td className="px-4 py-3">{s.branch || '-'}</td>
                  <td className="px-4 py-3">{s.block || 'Not Allotted'}</td>
                  <td className="px-4 py-3">{s.room_no || 'Not Allotted'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const AllocationTab = ({ hostels, loading, saving, onSave }) => {
  const [selectedHostel, setSelectedHostel] = useState(null);
  const [floors, setFloors] = useState([]);
  const [yearAllocations, setYearAllocations] = useState({});
  const [loadingFloors, setLoadingFloors] = useState(false);

  const years = [1, 2, 3, 4];

  const handleHostelSelect = async (hostel) => {
    setSelectedHostel(hostel);
    setLoadingFloors(true);
    setFloors([]);
    
    try {
      const response = await axios.get(`http://127.0.0.1:8000/api/app/blocks/${hostel.id}/floors/`);
      const floorsData = response.data.floors || [];
      setFloors(floorsData);
      
      try {
        const allocResponse = await axios.get('http://127.0.0.1:8000/api/app/allocations/');
        const allocations = allocResponse.data;
        const blockAllocation = allocations[hostel.name] || {};
        
        const formattedAllocation = {};
        Object.entries(blockAllocation).forEach(([key, value]) => {
          if (key === 'year_1_floors') formattedAllocation['1'] = value;
          else if (key === 'year_2_floors') formattedAllocation['2'] = value;
          else if (key === 'year_3_floors') formattedAllocation['3'] = value;
          else if (key === 'year_4_floors') formattedAllocation['4'] = value;
        });
        setYearAllocations(formattedAllocation);
      } catch (allocErr) {
        setYearAllocations({});
      }
    } catch (error) {
      console.error('Error fetching floors:', error);
      setFloors([]);
    } finally {
      setLoadingFloors(false);
    }
  };

  const handleYearFloorChange = (year, floors) => {
    setYearAllocations(prev => ({
      ...prev,
      [String(year)]: floors
    }));
  };

  const toggleFloor = (year, floorNo) => {
    const yearKey = String(year);
    const currentFloors = yearAllocations[yearKey] || [];
    const newFloors = currentFloors.includes(floorNo)
      ? currentFloors.filter(f => f !== floorNo)
      : [...currentFloors, floorNo];
    handleYearFloorChange(yearKey, newFloors);
  };

  const handleSave = () => {
    if (!selectedHostel) {
      toast.warn('Please select a hostel first');
      return;
    }
    
    const formattedMapping = {
      'year_1': yearAllocations['1'] || [],
      'year_2': yearAllocations['2'] || [],
      'year_3': yearAllocations['3'] || [],
      'year_4': yearAllocations['4'] || [],
    };
    
    onSave(selectedHostel.id, formattedMapping);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-500">
      <h1 className="text-4xl font-light text-slate-900 mb-8">Hostel Allocation</h1>
      <p className="text-slate-600 mb-8">
        Assign which floors each year of students can access for room booking
      </p>

      <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
        <h2 className="text-lg font-bold text-slate-800 mb-4">Select Hostel / Block</h2>
        {hostels.length === 0 ? (
          <p className="text-slate-500">No hostels found.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {hostels.map((hostel) => (
              <button
                key={hostel.id}
                onClick={() => handleHostelSelect(hostel)}
                className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                  selectedHostel?.id === hostel.id
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-slate-200 hover:border-blue-400 bg-white'
                }`}
              >
                <div className="text-left">
                  <p className="font-bold text-slate-800">{hostel.display_name || hostel.name}</p>
                  <p className="text-sm text-slate-500">{hostel.floors_count || 0} Floors</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedHostel && (
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-lg font-bold text-slate-800 mb-6">
            Floor Allocation for: <span className="text-blue-600">{selectedHostel.display_name || selectedHostel.name}</span>
          </h2>
          
          {loadingFloors ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : floors.length === 0 ? (
            <p className="text-slate-500 text-center py-8">No floors available for this hostel</p>
          ) : (
            <div className="space-y-6">
              {years.map((year) => (
                <div key={year} className="border-b border-slate-100 pb-6 last:border-b-0">
                  <h3 className="text-md font-semibold text-slate-700 mb-3 flex items-center gap-2">
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white ${
                      year === 1 ? 'bg-green-500' : year === 2 ? 'bg-blue-500' : year === 3 ? 'bg-purple-500' : 'bg-orange-500'
                    }`}>
                      {year}
                    </span>
                    Year {year} Students
                  </h3>
                  <div className="flex flex-wrap gap-3">
                    {floors.map((floor) => {
                      const floorNum = floor.floor_number;
                      const isSelected = (yearAllocations[String(year)] || []).includes(floorNum);
                      return (
                        <button
                          key={floorNum}
                          onClick={() => toggleFloor(year, floorNum)}
                          className={`px-4 py-2 rounded-lg font-semibold transition-all duration-200 ${
                            isSelected
                              ? 'bg-blue-600 text-white shadow-md'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          Floor {floorNum}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-sm text-slate-500 mt-2">
                    Selected: {yearAllocations[String(year)]?.length || 0} floors
                  </p>
                </div>
              ))}
            </div>
          )}

          <div className="mt-8 flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving || !selectedHostel}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-bold shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Allocation'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;