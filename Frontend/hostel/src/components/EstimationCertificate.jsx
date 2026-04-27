import React, { useState, useRef } from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import watermark from "../assets/watermark.jpg";
import { toast } from 'react-toastify';
import { useNavigate } from "react-router-dom";

const STUDENT_API = 'http://127.0.0.1:8000/api/student/';

const EstimationSlip = () => {
  const navigate = useNavigate();
  const certificateRef = useRef();

  const [studentId, setStudentId] = useState("");
  const [searchType, setSearchType] = useState("admission_no");
  const [loading, setLoading] = useState(false);

  // Admin inputs for the fee amounts
  const [admissionFee, setAdmissionFee] = useState(0);
  const [messFee, setMessFee] = useState(0);

  const [student, setStudent] = useState({
    full_name: "",
    reg_no: "",
    branch: "",
    class_yr: "",
    block: "",
    room_no: "",
    admission_no: ""
  });

  const fetchStudent = async () => {
    if (!studentId) return toast.warn("Please enter Admission or Registration Number");
    setLoading(true);
    try {
      // First fetch student profile
      const searchParam = searchType === "admission_no" ? "admission_no" : "roll_no";
      const response = await fetch(`${STUDENT_API}get-student-profile/?${searchParam}=${encodeURIComponent(studentId)}`);
      if (!response.ok) throw new Error("Student not found");
      
      const data = await response.json();
      console.log("Student data:", data);
      
      // Get hostel details from the response itself
      const hostelBlock = data.block || "Not Assigned";
      const hostelRoom = data.room_no || "Not Assigned";
      
      setStudent({
        full_name: data.full_name || "",
        reg_no: data.reg_no || "",
        branch: data.branch || "",
        class_yr: data.class_yr || "",
        block: hostelBlock,
        room_no: hostelRoom,
        admission_no: data.admission_no || ""
      });
    } catch (error) {
      console.error("Error:", error);
      toast.error("Student record not found in database.");
    } finally {
      setLoading(false);
    }
  };

  const generatePDF = async () => {
    if (!student.full_name) return toast.warn("Please load student details first.");

    const printWindow = window.open('', '_blank');
    if (!printWindow) return toast.warn("Please allow popups for this site.");
    
    printWindow.document.write('<p style="font-family:sans-serif; text-align:center; margin-top:50px;">Generating Print Preview... Please wait.</p>');

    try {
      const canvas = await html2canvas(certificateRef.current, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");

      const imgWidth = 190;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      pdf.addImage(imgData, "PNG", 10, 10, imgWidth, imgHeight);

      const blobURL = pdf.output("bloburl");
      printWindow.location.href = blobURL;

      await fetch(STUDENT_API + 'save-certificate/', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          admission_no: student.admission_no,
          reg_no: student.reg_no,
          student_name: student.full_name,
          certificate_type: "estimation"
        }),
      });
    } catch (error) {
      console.error("PDF Error:", error);
      printWindow.close();
      toast.error("Error generating PDF. Ensure no special CSS filters are active.");
    }
  };

  return (
    <div className="flex flex-col items-center min-h-screen bg-gray-100 p-10 font-sans">
      <h2 className="text-3xl font-bold mb-6 text-slate-800">Hostel Fee Estimation Certificate</h2>

      {/* Control Panel */}
      <div className="bg-white shadow-xl rounded-2xl p-8 mb-10 w-150 border border-slate-100">
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setSearchType("admission_no")}
            className={`px-4 py-2 rounded-lg font-bold transition-all text-sm ${
              searchType === "admission_no" 
                ? "bg-blue-600 text-white shadow-md" 
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            Search by Admission Number
          </button>
          <button
            onClick={() => setSearchType("reg_no")}
            className={`px-4 py-2 rounded-lg font-bold transition-all text-sm ${
              searchType === "reg_no" 
                ? "bg-blue-600 text-white shadow-md" 
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            Search by Registration Number
          </button>
        </div>

        <div className="flex items-center gap-4 mb-6">
          <input
            type="text"
            placeholder={searchType === "admission_no" ? "Enter Admission Number..." : "Enter Registration Number..."}
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            className="flex-1 border border-slate-200 rounded-xl p-4 shadow-sm outline-none"
          />
          <button
            onClick={fetchStudent}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl font-bold transition-all disabled:opacity-50"
          >
            {loading ? "Searching..." : "Load Profile"}
          </button>
        </div>

        {/* Show loaded student info with hostel details */}
        {student.full_name && (
          <div className="mt-4 p-4 bg-green-50 rounded-xl">
            <p className="text-sm font-semibold text-green-800">
              ✅ Loaded: {student.full_name} (Reg No: {student.reg_no})
            </p>
            <p className="text-sm text-green-700 mt-1">
              🏠 Hostel: {student.block === "Not Assigned" ? "Not Allocated" : student.block} | 
              Room: {student.room_no === "Not Assigned" ? "Not Allocated" : student.room_no}
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-6 pt-4 border-t border-slate-100">
          <div>
            <label htmlFor="admissionFee" className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Admission Fee (₹)</label>
            <input
              id="admissionFee"
              type="number"
              value={admissionFee}
              onChange={(e) => setAdmissionFee(e.target.value)}
              className="w-full border border-slate-200 rounded-xl p-3 bg-slate-50 font-bold outline-none"
            />
          </div>
          <div>
            <label htmlFor="messFee" className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Monthly Mess Fee (₹)</label>
            <input
              id="messFee"
              type="number"
              value={messFee}
              onChange={(e) => setMessFee(e.target.value)}
              className="w-full border border-slate-200 rounded-xl p-3 bg-slate-50 font-bold outline-none"
            />
          </div>
        </div>
      </div>

      {/* CERTIFICATE PREVIEW AREA */}
      <div
        ref={certificateRef}
        className="relative w-200 bg-white border border-black p-16 text-black leading-14 overflow-hidden"
      >
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <img src={watermark} alt="Watermark" className="w-87.5 opacity-10" />
        </div>

        <div className="text-center mb-10">
          <img src={watermark} alt="University Logo" className="w-24 mx-auto mb-4" />
          <h1 className="text-3xl font-black">ANDHRA UNIVERSITY</h1>
          <p className="text-lg font-bold">
            A.U. COLLEGE OF ENGINEERING (A), VISAKHAPATNAM <br />
            SELF-SUPPORT HOSTELS (BOYS)
          </p>
        </div>

        <div className="text-center font-bold underline text-2xl mb-12 uppercase">
          Hostel Fee Estimation Certificate
        </div>

        <div className="text-lg">
          <p>
            Name:{" "}
            <span className="font-bold border-b border-dotted inline-block px-4 min-w-75 text-center">
              {student.full_name || "____________________"}
            </span>
          </p>
          <p>
            Reg. No{" "}
            <span className="font-bold border-b border-dotted inline-block px-4 min-w-37.5 text-center">
              {student.reg_no || "__________"}
            </span>
          </p>
          <p>
            Class{" "}
            <span className="font-bold border-b border-dotted inline-block px-4 min-w-30 text-center">
              {student.class_yr || "__________"}
            </span> 
            Branch{" "}
            <span className="font-bold border-b border-dotted inline-block px-4 min-w-37.5 text-center">
              {student.branch || "__________"}
            </span>
          </p>
          <p>
            Hostel Block{" "}
            <span className="font-bold border-b border-dotted inline-block px-4 min-w-25 text-center">
              {student.block && student.block !== "Not Assigned" ? student.block : "_____"}
            </span> 
            Room No{" "}
            <span className="font-bold border-b border-dotted inline-block px-4 min-w-25 text-center">
              {student.room_no && student.room_no !== "Not Assigned" ? student.room_no : "_____"}
            </span>
          </p>

          <div className="mt-12 space-y-4">
             <p className="font-bold underline italic">Fee Estimation Details:</p>
             <p>1. Admission & Maintenance Fee (Annual): <span className="font-bold">₹ {admissionFee} /-</span></p>
             <p>2. Mess Fee (Per Month): <span className="font-bold">₹ {messFee} /-</span></p>
          </div>
        </div>

        <div className="flex justify-between mt-24">
          <div className="font-medium text-lg">Date: {new Date().toLocaleDateString()}</div>
          <div className="text-center">
            <p className="font-black text-lg">CHIEF WARDEN</p>
          </div>
        </div>
      </div>

      <button
        onClick={generatePDF}
        className="mt-12 bg-blue-600 hover:bg-blue-700 text-white px-12 py-5 rounded-2xl font-black uppercase tracking-widest shadow-2xl transition-all active:scale-95"
      >
        Open Print Preview
      </button>
      <button
        onClick={() => navigate("/adminpanel", { state: { tab: "certificates" } })}
        className="mt-4 flex items-center gap-2 text-blue-600 hover:text-blue-800 font-semibold"
      >
        ← Back to Certificates
      </button>
    </div>
  );
};

export default EstimationSlip;