import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const AdminDashboard = () => {
  const navigate = useNavigate();

  // --- State Management ---
  const [activeTab, setActiveTab] = useState("students");
  const [searchId, setSearchId] = useState("");
  const [searchType, setSearchType] = useState("admission_no"); // "admission_no" or "reg_no"
  const [student, setStudent] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // --- API Call: Fetch Student Profile ---
  const fetchStudent = async () => {
    if (!searchId) return setError("Please enter Admission or Registration Number");
    
    try {
      setError("");
      setStudent(null);
      setLoading(true);

      const response = await fetch(
        `http://127.0.0.1:8000/hostel/get-student-profile/?${searchType}=${searchId}`
      );

      if (!response.ok) throw new Error("Student not found");

      const data = await response.json();
      setStudent(data);
    } catch (err) {
      setError("No student found with this Admission/Registration Number");
    } finally {
      setLoading(false);
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
            onClick={() => setActiveTab("students")} 
            label="Student Records" 
          />
          <TabButton 
            active={activeTab === "certificates"} 
            onClick={() => setActiveTab("certificates")} 
            label="Certificates" 
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
                onClick={() => setSearchType("admission_no")}
                className={`px-6 py-2 rounded-lg font-bold transition-all ${
                  searchType === "admission_no" 
                    ? "bg-blue-600 text-white shadow-md" 
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                Search by Admission Number
              </button>
              <button
                onClick={() => setSearchType("reg_no")}
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
                className="bg-white border border-slate-200 px-6 py-4 rounded-2xl w-80 shadow-sm focus:ring-2 focus:ring-blue-400 outline-none"
              />
              <button
                onClick={fetchStudent}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-2xl font-bold shadow-lg transition-all active:scale-95 disabled:opacity-50"
              >
                {loading ? "Searching..." : "Fetch Details"}
              </button>
            </div>

            {error && <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 font-medium">{error}</div>}

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
                    <DataPoint label="Year & Branch" value={`${student.class_yr} - ${student.branch}`} />
                    <DataPoint label="Catering" value={student.catering} />
                  </div>

                  {/* Column 2: Personal & Contact */}
                  <div className="space-y-6">
                    <SectionLabel label="Personal Information" color="green" />
                    <DataPoint label="Mobile" value={student.mobile} />
                    <DataPoint label="Email ID" value={student.email} />
                    <DataPoint label="Aadhar No" value={student.aadhar} />
                    <DataPoint label="Date of Birth" value={student.dob} />
                    <DataPoint label="Caste" value={student.caste} />
                    <DataPoint label="Fee Amount" value={`₹${student.amount}`} />
                  </div>

                  {/* Column 3: Room Details */}
                  <div className="space-y-6">
                    <SectionLabel label="Room Details" color="purple" />
                    {student.room_details ? (
                      <>
                        <DataPoint label="Room Number" value={student.room_details.room_number} />
                        <DataPoint label="Block Name" value={student.room_details.block_name} />
                        <DataPoint label="Floor" value={student.room_details.floor || "N/A"} />
                        <DataPoint label="Bed Number" value={student.room_details.bed_number || "N/A"} />
                        <DataPoint label="Room Type" value={student.room_details.room_type || "N/A"} />
                        <DataPoint label="Sharing Type" value={student.room_details.sharing_type || "N/A"} />
                        {student.room_details.allotted_date && (
                          <DataPoint label="Allotted Date" value={new Date(student.room_details.allotted_date).toLocaleDateString()} />
                        )}
                      </>
                    ) : (
                      <div className="px-2 py-4 text-center">
                        <p className="text-slate-500 text-sm">No room allotted yet</p>
                      </div>
                    )}
                  </div>

                  {/* Column 4: Family & Media */}
                  <div className="space-y-6">
                    <SectionLabel label="Family & Media" color="orange" />
                    <DataPoint label="Father Name" value={`${student.father_name} (${student.father_phone})`} />
                    <DataPoint label="Mother Name" value={`${student.mother_name} (${student.mother_phone})`} />
                    <DataPoint label="Guardian" value={student.guardian_name} />
                    
                    <div className="pt-4 text-center">
                      <div className="w-32 h-40 mx-auto bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden shadow-inner">
                        {student.student_photo ? (
                          <img
                            src={student.student_photo.startsWith('http') 
                                ? student.student_photo 
                                : `http://127.0.0.1:8000${student.student_photo.startsWith('/') ? '' : '/'}${student.student_photo}`}
                            alt="Student"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.target.onerror = null; 
                              e.target.src = "https://via.placeholder.com/150?text=Error+Loading";
                            }}
                          />
                        ) : (
                          <span className="text-[10px] text-slate-400 font-bold uppercase p-2">No Photo Found</span>
                        )}
                      </div>
                      <p className="text-[10px] font-black text-slate-400 uppercase mt-2 tracking-widest">Student Photo</p>
                    </div>
                  </div>

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
  return <h3 className={`text-[11px] font-black uppercase tracking-[0.2em] px-4 py-2 rounded-lg ${colors[color]}`}>{label}</h3>;
};

const DataPoint = ({ label, value }) => (
  <div className="flex flex-col px-2">
    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{label}</span>
    <span className="text-slate-800 font-medium truncate">{value || "Not Provided"}</span>
  </div>
);

const CertCard = ({ title, path, navigate }) => (
  <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm text-center hover:shadow-xl transition-all group">
    <h3 className="font-bold text-slate-800 mb-6">{title}</h3>
    <button
      onClick={() => navigate(path)}
      className="bg-slate-50 text-slate-900 px-6 py-3 rounded-xl font-bold hover:bg-slate-900 hover:text-white transition-all w-full"
    >
      Generate PDF
    </button>
  </div>
);

export default AdminDashboard;