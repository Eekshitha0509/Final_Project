import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

function Profile() {
  const navigate = useNavigate();
  const degreeMap = {
    1: "B.Tech",
    2: "M.Tech",
    3: "MCA",
    4: "B.Tech + M.Tech"
  };
  
  const [formData, setFormData] = useState({
    full_name: "", dob: "", aadhar_no: "", aadhar_pdf: null, student_photo: null,
    admission_no: "", reg_no: "", roll_no: "", degree: "", branch: "", year: "", 
    admission_date: "", caste: "", mobile: "", email: "", address: "",
    father_name: "", father_phone: "", father_aadhar_no: "", father_aadhar_pdf: null, father_photo: null,
    mother_name: "", mother_phone: "", mother_aadhar_no: "", mother_aadhar_pdf: null, mother_photo: null,
    amount: "13000",
  });

  const [preview, setPreview] = useState({
    student: "", father: "", mother: "", aadhar: "", father_aadhar: "", mother_aadhar: ""
  });

  // =============================
  // 🔥 ROBUST REFETCH LOGIC
  // =============================
  useEffect(() => {
  const fetchStudent = async () => {
    try {
      const userStr = localStorage.getItem("user");

      if (!userStr) {
        navigate("/studentlog");
        return;
      }

      const user = JSON.parse(userStr);

      // -------------------------------
      // TRY FETCH FROM DB
      // -------------------------------
      try {
        const params = new URLSearchParams();

        if (user.admission_no)
          params.append("admission_no", user.admission_no);
        if (user.reg_no)
          params.append("reg_no", user.reg_no);

        const res = await axios.get(
          `http://127.0.0.1:8000/hostel/get-student-profile/?${params.toString()}`
        );

        const student = res.data;

        if (student && Object.keys(student).length > 0) {
          console.log("✅ Loaded from DB");

          const getImageUrl = (path) =>
            path ? `http://127.0.0.1:8000${path}` : "";

          setFormData((prev) => ({
            ...prev,
            ...student,
            student_photo: null,
            father_photo: null,
            mother_photo: null,
          }));

          setPreview({
            student: getImageUrl(student.student_photo),
            father: getImageUrl(student.father_photo),
            mother: getImageUrl(student.mother_photo),
            aadhar: getImageUrl(student.aadhar_pdf),
            father_aadhar: getImageUrl(student.father_aadhar_pdf),
            mother_aadhar: getImageUrl(student.mother_aadhar_pdf),
          });

          return; // stop here if DB found
        }
      } catch (err) {
        console.log("⚠️ No DB data");
      }

      // -------------------------------
      // FALLBACK → REGISTRATION DATA
      // -------------------------------
      console.log("🆕 Using registration data");

      setFormData((prev) => ({
        ...prev,
        full_name: user.full_name || "",
        admission_no: user.admission_no || "",
        reg_no: user.reg_no || "",
        email: user.email || "",
      }));

    } catch (error) {
      console.error("Error:", error);
    }
  };

  fetchStudent();
}, [navigate]);

  // =============================
  // HANDLERS
  // =============================
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
    const data = new FormData();
    
    for (let key in formData) {
      if (formData[key] !== null && formData[key] !== "") {
        data.append(key, formData[key]);
      }
    }

    try {
      const response = await axios.post(
        "http://127.0.0.1:8000/hostel/submit-profile/",
        data,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      if (response.status === 200 || response.status === 201) {
        alert("Profile Saved Successfully!");
        navigate("/Homepage");
      }
    } catch (error) {
      console.error("Submission error details:", error.response?.data);
      alert("Submission Failed. Check console.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 py-10 px-4 font-sans text-slate-900">
      <div className="max-w-5xl mx-auto bg-white shadow-2xl rounded-lg overflow-hidden border-t-8 border-[#002147] relative">
        
        <div className="p-6 border-b text-center bg-white">
          <p className="text-right font-bold text-red-600 text-sm tracking-tight">Admission Fee - 13000/-</p>
          <h1 className="text-2xl font-bold uppercase text-[#002147]">Andhra University</h1>
          <h2 className="text-lg font-semibold text-slate-700">College of Engineering (A) Hostel</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-10">
          
          <section className="relative min-h-[180px]">
            <SectionTitle title="Personal Information" />
            
            {/* Student Photo top right */}
            <div className="absolute top-0 right-0">
               {!preview.student ? (
                 <div className="w-32 h-40 border-2 border-dashed border-slate-300 flex flex-col items-center justify-center rounded bg-slate-50">
                    <label className="cursor-pointer text-center p-2">
                       <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">No Photo<br/>Click to Upload</span>
                       <input type="file" name="student_photo" onChange={handleFileChange} className="hidden" accept="image/*" />
                    </label>
                 </div>
               ) : (
                 <div className="relative group">
                    <img src={preview.student} alt="student" className="w-32 h-40 object-cover border-2 border-slate-200 rounded shadow-md" />
                    <button type="button" onClick={() => clearFile("student_photo", "student")} className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-6 h-6 text-xs flex items-center justify-center shadow hover:bg-red-700 transition">×</button>
                 </div>
               )}
            </div>

            <div className="w-[75%] xl:w-[80%] pr-4 mt-6 space-y-6">
              {/* Row 1 */}
              <div className="flex flex-col sm:flex-row gap-6 w-full">
                <Input label="Full Name" name="full_name" value={formData.full_name} handleChange={handleChange} required />
                <Input label="Date of Birth" name="dob" type="date" value={formData.dob} handleChange={handleChange} />
              </div>
              {/* Row 2 */}
              <div className="flex flex-col md:flex-row gap-6 w-full">
                <Input label="Aadhaar Number" name="aadhar_no" value={formData.aadhar_no} handleChange={handleChange} required />
                <FileInput 
                  label="Aadhaar (PDF)" 
                  name="aadhar_pdf" 
                  fileObj={formData.aadhar_pdf} 
                  handleFileChange={handleFileChange} 
                  clearFile={() => clearFile("aadhar_pdf")} 
                  accept=".pdf"
                  previewUrl={preview.aadhar}
                />
                <Input label="Caste" name="caste" value={formData.caste} handleChange={handleChange} />
              </div>
            </div>
          </section>

          <section>
            <SectionTitle title="Academic Details" />
            <div className="flex flex-col md:flex-row gap-6 mt-6 w-full">
              <Input label="Admission No" name="admission_no" value={formData.admission_no} handleChange={handleChange} required />
              <Input label="Reg No" name="reg_no" value={formData.reg_no} handleChange={handleChange} />
              <Input label="Roll No" name="roll_no" value={formData.roll_no} handleChange={handleChange} />
              <Input label="Admission Date" name="admission_date" type="date" value={formData.admission_date} handleChange={handleChange} />
            </div>
            <div className="flex flex-col md:flex-row gap-6 mt-6 w-full">
              <Select label="Degree" name="degree" value={formData.degree} onChange={handleChange} options={["B.Tech", "M.Tech", "MCA", "MSc", "B.Tech + M.Tech"]} />
              <Input label="Branch" name="branch" value={formData.branch} handleChange={handleChange} />
              <Select label="Year" name="year" value={formData.year} onChange={handleChange} options={["1/4", "2/4", "3/4", "4/4", "1/2", "2/2", "1/6", "2/6", "3/6", "4/6", "5/6", "6/6"]} />
            </div>
          </section>

          <section>
            <SectionTitle title="Communication Details" />
            <div className="flex flex-col md:flex-row gap-6 mt-6 w-full">
              <Input label="Mobile Number" name="mobile" value={formData.mobile} handleChange={handleChange} />
              <Input label="Email Address" name="email" type="email" value={formData.email} handleChange={handleChange} />
            </div>
            <div className="mt-6 w-full">
              <Textarea label="Full Address" name="address" value={formData.address} handleChange={handleChange} />
            </div>
          </section>

          <section className="flex flex-col lg:flex-row gap-8 w-full">
            {/* FATHER CARD */}
            <div className="flex-1 bg-slate-50 p-6 rounded border shadow-sm">
              <SectionTitle title="Father" />
              <div className="mt-6 space-y-6">
                
                {/* Row 1 */}
                <div className="flex flex-col sm:flex-row gap-6 w-full">
                  <Input label="Father Name" name="father_name" value={formData.father_name} handleChange={handleChange} />
                  <Input label="Father Phone" name="father_phone" value={formData.father_phone} handleChange={handleChange} />
                </div>
                
                {/* Row 2 */}
                <div className="flex flex-col sm:flex-row gap-6 w-full">
                  <Input label="Father Aadhaar No" name="father_aadhar_no" value={formData.father_aadhar_no} handleChange={handleChange} />
                  <FileInput 
                    label="Aadhaar (PDF)" 
                    name="father_aadhar_pdf" 
                    fileObj={formData.father_aadhar_pdf} 
                    handleFileChange={handleFileChange} 
                    clearFile={() => clearFile("father_aadhar_pdf")} 
                    accept=".pdf"
                    previewUrl={preview.father_aadhar}  
                  />
                </div>

                {/* Photo on left, empty space on right */}
                <div className="flex flex-row gap-6 w-full">
                  <div className="flex-1 flex flex-col">
                    {!preview.father ? (
                      <FileInput label="Father Photo" name="father_photo" fileObj={formData.father_photo} handleFileChange={handleFileChange} accept="image/*" />
                    ) : (
                      <div className="relative inline-block w-max">
                        <label className="text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-tight block">Father Photo</label>
                        <img src={preview.father} className="w-16 h-20 object-cover rounded border shadow" alt="father" />
                        <button type="button" onClick={() => clearFile("father_photo", "father")} className="absolute top-6 -right-2 bg-red-500 text-white rounded-full w-5 h-5 text-[10px] flex items-center justify-center shadow">×</button>
                      </div>
                    )}
                  </div>
                  {/* Invisible flex item keeps right side perfectly blank */}
                  <div className="flex-1"></div>
                </div>

              </div>
            </div>

            {/* MOTHER CARD */}
            <div className="flex-1 bg-slate-50 p-6 rounded border shadow-sm">
              <SectionTitle title="Mother" />
              <div className="mt-6 space-y-6">
                
                {/* Row 1 */}
                <div className="flex flex-col sm:flex-row gap-6 w-full">
                  <Input label="Mother Name" name="mother_name" value={formData.mother_name} handleChange={handleChange} />
                  <Input label="Mother Phone" name="mother_phone" value={formData.mother_phone} handleChange={handleChange} />
                </div>
                
                {/* Row 2 */}
                <div className="flex flex-col sm:flex-row gap-6 w-full">
                  <Input label="Mother Aadhaar No" name="mother_aadhar_no" value={formData.mother_aadhar_no} handleChange={handleChange} />
                  <FileInput 
                    label="Aadhaar (PDF)" 
                    name="mother_aadhar_pdf" 
                    fileObj={formData.mother_aadhar_pdf} 
                    handleFileChange={handleFileChange} 
                    clearFile={() => clearFile("mother_aadhar_pdf")} 
                    accept=".pdf"
                    previewUrl={preview.mother_aadhar} 
                  />
                </div>

                {/* Photo on left, empty space on right */}
                <div className="flex flex-row gap-6 w-full">
                  <div className="flex-1 flex flex-col">
                    {!preview.mother ? (
                      <FileInput label="Mother Photo" name="mother_photo" fileObj={formData.mother_photo} handleFileChange={handleFileChange} accept="image/*" />
                    ) : (
                      <div className="relative inline-block w-max">
                        <label className="text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-tight block">Mother Photo</label>
                        <img src={preview.mother} className="w-16 h-20 object-cover rounded border shadow" alt="mother" />
                        <button type="button" onClick={() => clearFile("mother_photo", "mother")} className="absolute top-6 -right-2 bg-red-500 text-white rounded-full w-5 h-5 text-[10px] flex items-center justify-center shadow">×</button>
                      </div>
                    )}
                  </div>
                  {/* Invisible flex item keeps right side perfectly blank */}
                  <div className="flex-1"></div>
                </div>

              </div>
            </div>
          </section>

          <div className="pt-8">
            <button type="submit" className="w-full bg-[#002147] text-white font-bold py-4 rounded hover:bg-[#003366] transition shadow-lg uppercase tracking-widest text-sm">
              Save Profile
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// HELPERS
const SectionTitle = ({ title }) => <h3 className="text-[#002147] font-bold border-b border-slate-200 pb-2 uppercase text-[12px] mb-2">{title}</h3>;

const Input = ({ label, name, value, handleChange, type="text", required=false }) => (
  <div className="flex flex-col flex-1 w-full">
    <label className="text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-tight">{label}</label>
    <input type={type} name={name} value={value || ""} onChange={handleChange} required={required}
    className="border border-slate-300 rounded px-3 py-2 text-sm outline-none bg-white focus:ring-1 focus:ring-blue-400 w-full box-border"/>
  </div>
);

const Select = ({ label, name, value, onChange, options }) => (
  <div className="flex flex-col flex-1 w-full">
    <label className="text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-tight">{label}</label>
    <select name={name} value={value} onChange={onChange} className="border border-slate-300 rounded px-3 py-2 text-sm outline-none bg-white cursor-pointer w-full box-border">
      <option value="">Select Option</option>
      {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
    </select>
  </div>
);

const Textarea = ({ label, name, value, handleChange }) => (
  <div className="flex flex-col flex-1 w-full">
    <label className="text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-tight">{label}</label>
    <textarea name={name} value={value || ""} onChange={handleChange} rows="2" className="border border-slate-300 rounded px-3 py-2 text-sm outline-none bg-white resize-none w-full box-border"/>
  </div>
);

const FileInput = ({ label, name, fileObj, handleFileChange, clearFile, accept, previewUrl }) => {
  const fileName = previewUrl ? previewUrl.split('/').pop() || "Document.pdf" : "";
  const hasFile = previewUrl || fileObj;

  return (
    <div className="flex flex-col flex-1 justify-end h-full w-full">
      {label && <label className="text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-tight">{label}</label>}

      <div className={`border border-slate-300 rounded bg-slate-50 flex flex-col justify-center min-h-[38px] w-full overflow-hidden ${hasFile ? 'p-1.5' : 'p-0'}`}>

        {previewUrl && !fileObj && (
          <div className="flex justify-between items-center bg-green-50 px-2 py-1 border border-green-200 rounded">
            <a href={previewUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-green-700 hover:text-green-800 text-[10px] font-bold" title="View Document">
              <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
              </svg>
              <span className="truncate max-w-[80px]">
                {fileName.length > 10 ? fileName.substring(0, 10) + '...' : fileName}
              </span>
            </a>
            <label className="text-slate-400 text-[9px] uppercase tracking-wider font-bold cursor-pointer hover:text-slate-700 ml-1 shrink-0">
              Change
              <input type="file" name={name} onChange={handleFileChange} accept={accept} className="hidden" />
            </label>
          </div>
        )}

        {fileObj && (
          <div className="flex justify-between items-center bg-blue-50 px-2 py-1 border border-blue-200 rounded">
            <span className="flex items-center gap-1.5 text-[10px] text-blue-700 font-bold truncate max-w-[100px]">
              <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
              </svg>
              <span className="truncate">
                {fileObj.name.length > 10 ? fileObj.name.substring(0, 10) + '...' : fileObj.name}
              </span>
            </span>
            <button type="button" onClick={clearFile} className="text-red-500 hover:text-red-700 text-sm font-bold ml-1 leading-none shrink-0">×</button>
          </div>
        )}

        {!hasFile && (
          <label className="bg-[#002147] text-white text-[10px] px-3 py-2 cursor-pointer uppercase text-center font-bold w-full h-full flex flex-1 items-center justify-center transition hover:bg-[#003366] m-0">
            Browse File
            <input type="file" name={name} onChange={handleFileChange} accept={accept} className="hidden" />
          </label>
        )}
      </div>
    </div>
  );
};

export default Profile;