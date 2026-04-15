import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

function Profile() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const degreeMap = {
    1: "B.Tech",
    2: "M.Tech",
    3: "MCA"
  };

  const [formData, setFormData] = useState({
    full_name: "",
    aadhar: "",
    aadhar_pdf: null,
    student_photo: null,
    admission_no: "",
    reg_no: "",
    roll_no: "",
    degree: "",
    branch: "",
    class_yr: "",
    admission_date: "",
    dob: "",
    mobile: "",
    email: "",
    address: "",
    caste: "",
    catering: "",
    amount: "13000",
    father_name: "",
    father_phone: "",
    father_aadhar: null,
    father_photo: null,
    mother_name: "",
    mother_phone: "",
    mother_aadhar: null,
    mother_photo: null,
    guardian_name: "",
    guardian_phone: "",
    guardian_aadhar: null,
  });

  const [preview, setPreview] = useState({
    student: "",
    father: "",
    mother: "",
  });

  // Check authentication and load existing profile
  useEffect(() => {
    const token = localStorage.getItem('access_token') || localStorage.getItem('access');
    const userData = localStorage.getItem('user');
    const admission_no = localStorage.getItem('admission_no');
    
    if (!token && !userData) {
      alert('Please login first');
      navigate('/login/student');
      return;
    }
    
    // Load existing profile if available
    const fetchExistingProfile = async () => {
      try {
        const admissionNo = admission_no || (userData ? JSON.parse(userData).admission_no : null);
        
        if (!admissionNo) return;
        
        const response = await axios.get(
          `http://127.0.0.1:8000/hostel/get-student-profile/?admission_no=${admissionNo}`,
          {
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
          }
        );
        
        const profileData = response.data;
        console.log("✅ Loaded existing profile:", profileData);
        
        if (profileData.full_name) {
          setFormData(prev => ({
            ...prev,
            full_name: profileData.full_name || prev.full_name,
            aadhar: profileData.aadhar || prev.aadhar,
            class_yr: profileData.class_yr || prev.class_yr,
            branch: profileData.branch || prev.branch,
            admission_no: profileData.admission_no || prev.admission_no,
            reg_no: profileData.reg_no || prev.reg_no,
            roll_no: profileData.roll_no || prev.roll_no,
            dob: profileData.dob || prev.dob,
            mobile: profileData.mobile || prev.mobile,
            email: profileData.email || prev.email,
            address: profileData.address || prev.address,
            caste: profileData.caste || prev.caste,
            catering: profileData.catering || prev.catering,
            amount: profileData.amount || prev.amount,
            father_name: profileData.father_name || prev.father_name,
            father_phone: profileData.father_phone || prev.father_phone,
            mother_name: profileData.mother_name || prev.mother_name,
            mother_phone: profileData.mother_phone || prev.mother_phone,
            guardian_name: profileData.guardian_name || prev.guardian_name,
            guardian_phone: profileData.guardian_phone || prev.guardian_phone,
          }));
        }
      } catch (error) {
        console.log("No existing profile found:", error.message);
      }
    };
    
    fetchExistingProfile();
  }, [navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleFileChange = (e) => {
    const { name, files } = e.target;
    const file = files[0];
    if (!file) return;

    setFormData({ ...formData, [name]: file });

    if (file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      if (name === "student_photo") setPreview({ ...preview, student: url });
      if (name === "father_photo") setPreview({ ...preview, father: url });
      if (name === "mother_photo") setPreview({ ...preview, mother: url });
    }
  };

  const clearFile = (fieldName, previewName = null) => {
    setFormData(prev => ({ ...prev, [fieldName]: null }));
    if (previewName) setPreview(prev => ({ ...prev, [previewName]: "" }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const data = new FormData();
    for (let key in formData) {
      if (formData[key] !== null && formData[key] !== "") {
        data.append(key, formData[key]);
      }
    }

    const admission_no = localStorage.getItem('admission_no');
    if (admission_no) data.append('admission_no', admission_no);

    try {
      const response = await axios.post(
        "http://127.0.0.1:8000/hostel/submit-profile/",
        data,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      
      alert(response.data.message || "Profile Saved Successfully!");
      navigate("/homepage");
    } catch (error) {
      console.error("Submission Error:", error);
      setError(error.response?.data?.error || "Submission Failed");
      alert(error.response?.data?.error || "Submission Failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 py-10 px-4">
      <div className="max-w-5xl mx-auto bg-white rounded-2xl shadow-xl border">
        
        {/* Header */}
        <div className="bg-[#002147] p-6 text-center text-white rounded-t-2xl">
          <h1 className="text-lg font-bold text-yellow-400 uppercase">Andhra University</h1>
          <h2 className="text-xl font-black uppercase">College of Engineering (A) Hostel</h2>
          <p className="text-sm mt-1">Application for Admission</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 m-6 rounded-lg">
            <strong>Error:</strong> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          
          {/* Personal Information */}
          <SectionTitle title="1. Personal Information" />
          <div className="grid md:grid-cols-2 gap-6">
            <Input label="Full Name" name="full_name" value={formData.full_name} handleChange={handleChange} required />
            <Input label="Aadhar Number" name="aadhar" value={formData.aadhar} handleChange={handleChange} required />
            <Input label="Date of Birth" name="dob" type="date" value={formData.dob} handleChange={handleChange} />
            <Input label="Caste" name="caste" value={formData.caste} handleChange={handleChange} />
          </div>

          {/* Student Photo */}
          <div>
            <label className="text-sm font-semibold text-slate-600 mb-2 block">Student Photo</label>
            <div className="flex gap-4 items-center">
              <FileInput label="Upload Photo" name="student_photo" handleFileChange={handleFileChange} />
              {preview.student && (
                <div className="relative">
                  <img src={preview.student} alt="student" className="w-20 h-20 rounded-lg object-cover border shadow" />
                  <button type="button" onClick={() => clearFile("student_photo", "student")} className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-5 h-5 text-xs">×</button>
                </div>
              )}
            </div>
          </div>

          {/* Academic Details */}
          <SectionTitle title="2. Academic Details" />
          <div className="grid md:grid-cols-3 gap-6">
            <Input label="Admission Number" name="admission_no" value={formData.admission_no} handleChange={handleChange} required readOnly />
            <Input label="Registration Number" name="reg_no" value={formData.reg_no} handleChange={handleChange} />
            <Input label="Roll Number" name="roll_no" value={formData.roll_no} handleChange={handleChange} />
            <Select label="Degree" name="degree" value={formData.degree} onChange={handleChange} options={["B.Tech", "M.Tech", "MCA"]} />
            <Input label="Branch" name="branch" value={formData.branch} handleChange={handleChange} />
            <Select label="Year" name="class_yr" value={formData.class_yr} onChange={handleChange} options={["1st Year", "2nd Year", "3rd Year", "4th Year"]} />
          </div>

          {/* Communication Details */}
          <SectionTitle title="3. Communication Details" />
          <div className="grid md:grid-cols-2 gap-6">
            <Input label="Mobile Number" name="mobile" value={formData.mobile} handleChange={handleChange} type="tel" />
            <Input label="Email" name="email" type="email" value={formData.email} handleChange={handleChange} />
          </div>
          <Textarea label="Address" name="address" value={formData.address} handleChange={handleChange} />

          {/* Other Information */}
          <SectionTitle title="4. Other Information" />
          <div className="grid md:grid-cols-2 gap-6">
            <Select label="Catering Type" name="catering" value={formData.catering} onChange={handleChange} options={["veg", "non-veg"]} />
            <Input label="Amount Paid" name="amount" value={formData.amount} readOnly />
          </div>

          {/* Father Details */}
          <SectionTitle title="5. Father Details" />
          <div className="grid md:grid-cols-2 gap-6">
            <Input label="Father Name" name="father_name" value={formData.father_name} handleChange={handleChange} />
            <Input label="Father Phone" name="father_phone" value={formData.father_phone} handleChange={handleChange} type="tel" />
            <FileInput label="Father Aadhar (PDF)" name="father_aadhar" handleFileChange={handleFileChange} />
            <FileInput label="Father Photo" name="father_photo" handleFileChange={handleFileChange} />
          </div>

          {/* Mother Details */}
          <SectionTitle title="6. Mother Details" />
          <div className="grid md:grid-cols-2 gap-6">
            <Input label="Mother Name" name="mother_name" value={formData.mother_name} handleChange={handleChange} />
            <Input label="Mother Phone" name="mother_phone" value={formData.mother_phone} handleChange={handleChange} type="tel" />
            <FileInput label="Mother Aadhar (PDF)" name="mother_aadhar" handleFileChange={handleFileChange} />
            <FileInput label="Mother Photo" name="mother_photo" handleFileChange={handleFileChange} />
          </div>

          {/* Guardian Details */}
          <SectionTitle title="7. Guardian Details" />
          <div className="grid md:grid-cols-2 gap-6">
            <Input label="Guardian Name" name="guardian_name" value={formData.guardian_name} handleChange={handleChange} />
            <Input label="Guardian Phone" name="guardian_phone" value={formData.guardian_phone} handleChange={handleChange} type="tel" />
            <FileInput label="Guardian Aadhar (PDF)" name="guardian_aadhar" handleFileChange={handleFileChange} />
          </div>

          {/* Submit Button */}
          <button type="submit" disabled={loading} className="w-full bg-[#002147] hover:bg-blue-900 text-white font-bold py-4 rounded-xl transition disabled:opacity-50">
            {loading ? 'Saving...' : 'Save Profile'}
          </button>
        </form>
      </div>
    </div>
  );
}

// Helper Components
const SectionTitle = ({ title }) => (
  <h3 className="text-[#002147] font-bold border-b pb-2 uppercase text-sm">{title}</h3>
);

const Input = ({ label, name, value, handleChange, type = "text", required = false, readOnly = false }) => (
  <div className="flex flex-col">
    <label className="text-sm font-semibold text-slate-600 mb-2">{label} {required && <span className="text-red-500">*</span>}</label>
    <input type={type} name={name} value={value || ""} onChange={handleChange} required={required} readOnly={readOnly}
      className="border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400 outline-none" />
  </div>
);

const Select = ({ label, name, value, onChange, options }) => (
  <div className="flex flex-col">
    <label className="text-sm font-semibold text-slate-600 mb-2">{label}</label>
    <select name={name} value={value} onChange={onChange} className="border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400 outline-none">
      <option value="">Select {label}</option>
      {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
    </select>
  </div>
);

const Textarea = ({ label, name, value, handleChange }) => (
  <div className="flex flex-col">
    <label className="text-sm font-semibold text-slate-600 mb-2">{label}</label>
    <textarea name={name} value={value || ""} onChange={handleChange} rows="3"
      className="border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400 outline-none resize-none" />
  </div>
);

const FileInput = ({ label, name, handleFileChange }) => {
  const [fileName, setFileName] = useState("");

  const handleChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFileName(file.name);
      handleFileChange(e);
    }
  };

  return (
    <div className="flex flex-col">
      <label className="text-sm font-semibold text-slate-600 mb-2">{label}</label>
      <label className="flex items-center justify-between border-2 border-dashed border-slate-300 rounded-xl px-4 py-2 cursor-pointer hover:border-blue-500 transition">
        <span className="text-sm text-slate-600 truncate">{fileName || "Click to upload"}</span>
        <span className="bg-[#002147] text-white text-xs px-3 py-1 rounded-md">Browse</span>
        <input type="file" name={name} accept="image/*,application/pdf" onChange={handleChange} className="hidden" />
      </label>
    </div>
  );
};

export default Profile;