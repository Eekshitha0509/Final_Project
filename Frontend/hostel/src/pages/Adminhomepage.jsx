import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from 'axios';

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
  
  // --- Upload Excel State ---
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);

  // --- API Call: Fetch Student Profile ---
  const fetchStudent = async () => {
    if (!searchId) return setError("Please enter Admission or Registration Number");
    
    try {
      setError("");
      setStudent(null);
      setLoading(true);

      const searchParam = searchType === "admission_no" ? "admission_no" : "reg_no";
      const url = `http://127.0.0.1:8000/api/get-student-profile/?${searchParam}=${encodeURIComponent(searchId)}`;
      
      const response = await fetch(url);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Student not found");
      }

      const data = await response.json();
      setStudent(data);
    } catch (err) {
      setError(err.message || "No student found with this Admission/Registration Number");
    } finally {
      setLoading(false);
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
        `http://127.0.0.1:8000/api/get-student-billing/?${searchType}=${searchId}`
      );

      if (!response.ok) throw new Error("No billing records found");

      const data = await response.json();
      setBillingData(data);
    } catch (err) {
      setError(err.message || "No billing records found for this student");
    } finally {
      setLoading(false);
    }
  };

  // --- Upload Excel File ---
  const handleFileUpload = async () => {
    if (!uploadFile) {
      alert('Please select an Excel file first');
      return;
    }

    const formData = new FormData();
    formData.append('file', uploadFile);
    
    setUploading(true);
    setUploadResult(null);
    
    try {
      const response = await axios.post(
        'http://127.0.0.1:8000/api/upload-meta-hostel-excel/',
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      
      setUploadResult(response.data);
      alert('✅ Upload successful!');
    } catch (error) {
      console.error('Upload error:', error);
      alert('❌ Upload failed: ' + (error.response?.data?.error || error.message));
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
          />
          <TabButton 
            active={activeTab === "upload"} 
            onClick={() => {
              setActiveTab("upload");
              setStudent(null);
              setBillingData(null);
              setError("");
              setUploadResult(null);
              setUploadFile(null);
            }} 
            label="📤 Upload Excel" 
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
                    <DataPoint label="Student Name" value={billingData.student?.name} />
                    <DataPoint label="Admission No" value={billingData.student?.admission_no} />
                    <DataPoint label="Registration No" value={billingData.student?.reg_no} />
                    <DataPoint label="Room No" value={billingData.student?.room_no} />
                    <DataPoint label="Class/Year" value={billingData.student?.class_yr} />
                    <DataPoint label="Total Paid" value={`₹${billingData.total_paid || 0}`} />
                    <DataPoint label="Total Months" value={billingData.total_months || 0} />
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
                        <th className="px-4 py-3 text-left">Transaction ID</th>
                        <th className="px-4 py-3 text-left">Payment Time</th>
                        <th className="px-4 py-3 text-left">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {billingData.billing_history && billingData.billing_history.length > 0 ? (
                        billingData.billing_history.map((bill, index) => (
                          <tr key={index} className="border-b border-slate-200 hover:bg-slate-50">
                            <td className="px-4 py-3">{bill.month}</td>
                            <td className="px-4 py-3">{bill.days}</td>
                            <td className="px-4 py-3">₹{bill.electric_charge}</td>
                            <td className="px-4 py-3">₹{bill.mess_charge}</td>
                            <td className="px-4 py-3">₹{bill.service_charge}</td>
                            <td className="px-4 py-3 font-semibold">₹{bill.net_demand}</td>
                            <td className="px-4 py-3 text-green-600">₹{bill.collection}</td>
                            <td className="px-4 py-3">{bill.date}</td>
                            <td className="px-4 py-3 text-sm">{bill.transaction_id || 'N/A'}</td>
                            <td className="px-4 py-3 text-sm">{bill.payment_time || 'N/A'}</td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                bill.status === 'Success' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                              }`}>
                                {bill.status}
                              </span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="11" className="text-center py-8 text-slate-500">
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
              <div className="max-w-2xl mx-auto">
                {/* Instructions */}
                <div className="mb-8 p-4 bg-blue-50 rounded-xl">
                  <h3 className="font-semibold text-blue-800 mb-2">📋 Instructions:</h3>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• Click "Choose File" to select your Excel file</li>
                    <li>• Upload your META Hostel Excel file (META 2024-25 all det.xlsx)</li>
                    <li>• File should contain student details and monthly payments</li>
                    <li>• System will extract students and payment records automatically</li>
                    <li>• Duplicate entries will be skipped</li>
                  </ul>
                </div>

                {/* File Input - Improved visibility */}
                <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center">
                  <label className="cursor-pointer inline-block">
                    <div className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors mb-4 inline-block">
                      📁 Choose File
                    </div>
                    <input
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={(e) => setUploadFile(e.target.files[0])}
                      className="hidden"
                    />
                  </label>
                  
                  {uploadFile && (
                    <p className="text-green-600 text-sm mt-4">
                      ✅ Selected: {uploadFile.name} ({(uploadFile.size / 1024).toFixed(2)} KB)
                    </p>
                  )}
                  
                  {!uploadFile && (
                    <p className="text-slate-500 text-sm mt-4">
                      No file chosen. Click "Choose File" to select your Excel file.
                    </p>
                  )}
                  
                  <button
                    onClick={handleFileUpload}
                    disabled={uploading || !uploadFile}
                    className={`w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                      !uploadFile ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    {uploading ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                        </svg>
                        Uploading...
                      </span>
                    ) : (
                      'Upload META Hostel Excel'
                    )}
                  </button>
                </div>

                {/* Results Summary */}
                {uploadResult && (
                  <div className={`mt-6 p-4 rounded-xl ${
                    uploadResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                  }`}>
                    <h4 className="font-bold mb-2">📊 Upload Summary:</h4>
                    {uploadResult.success ? (
                      <>
                        <p>✅ Students Created: {uploadResult.students_created || 0}</p>
                        <p>🔄 Students Updated: {uploadResult.students_updated || 0}</p>
                        <p>💰 Payments Created: {uploadResult.payments_created || 0}</p>
                        {uploadResult.message && <p className="mt-2 text-sm">📝 {uploadResult.message}</p>}
                        {uploadResult.errors && uploadResult.errors.length > 0 && (
                          <div className="mt-2">
                            <p className="font-semibold text-red-600">⚠️ Errors ({uploadResult.errors.length}):</p>
                            <ul className="text-xs text-red-500 list-disc pl-4 max-h-32 overflow-y-auto">
                              {uploadResult.errors.slice(0, 5).map((err, i) => (
                                <li key={i}>{err}</li>
                              ))}
                            </ul>
                          </div>
                        )}
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
      </div>
    </div>
  );
};

// --- Helper Components ---
const TabButton = ({ active, onClick, label }) => (
  <button
    onClick={onClick}
    className={`w-full text-left p-4 rounded-xl font-bold text-sm uppercase tracking-tight transition-all ${
      active ? "bg-blue-600 shadow-lg" : "hover:bg-slate-800 text-slate-400"
    }`}
  >
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

export default AdminDashboard;