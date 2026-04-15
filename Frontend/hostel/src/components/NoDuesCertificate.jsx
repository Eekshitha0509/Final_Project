import React, { useState, useRef } from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import watermark from "../assets/watermark.jpg";

const NoDuesCertificate = () => {
  const certificateRef = useRef();

  const [studentId, setStudentId] = useState("");
  const [searchType, setSearchType] = useState("reg_no");
  const [loading, setLoading] = useState(false);
  const [student, setStudent] = useState({
    full_name: "",
    reg_no: "",
    branch: "",
    class_yr: "",
    degree: "",
    address: "",
    admission_no: "",
    block: "",
    room_no: ""
  });

  // Helper function for degree label
  const getDegreeLabel = (degree) => {
    if (degree == 1) return "B.Tech";
    if (degree == 2) return "M.Tech";
    if (degree == 3) return "MCA";
    if (degree == 4) return "MBA";
    return degree || "_____";
  };

  // --- FETCH STUDENT WITH HOSTEL DETAILS ---
  const fetchStudent = async () => {
    if (!studentId) return alert("Please enter Admission or Registration Number");
    setLoading(true);
    try {
      // First fetch student profile
      const response = await fetch(`http://127.0.0.1:8000/hostel/get-student-profile/?${searchType}=${studentId}`);
      if (!response.ok) throw new Error("Student not found");
      
      const data = await response.json();
      console.log("Student data:", data);
      
      // Then fetch hostel allocation details
      let hostelBlock = "Not Assigned";
      let hostelRoom = "Not Assigned";
      
      try {
        const hostelResponse = await fetch(`http://127.0.0.1:8000/hostel/get-student-hostel/?reg_no=${data.reg_no || studentId}`);
        if (hostelResponse.ok) {
          const hostelData = await hostelResponse.json();
          console.log("Hostel data:", hostelData);
          hostelBlock = hostelData.block_name || hostelData.block || "Not Assigned";
          hostelRoom = hostelData.room_number || hostelData.room_no || "Not Assigned";
        }
      } catch (hostelError) {
        console.log("No hostel allocation found:", hostelError);
      }
      
      setStudent({
        full_name: data.full_name || "",
        reg_no: data.reg_no || "",
        branch: data.branch || "",
        class_yr: data.class_yr || "",
        degree: data.degree || "",
        address: data.address || "",
        admission_no: data.admission_no || "",
        block: hostelBlock,
        room_no: hostelRoom
      });
    } catch (error) {
      console.error("Error:", error);
      alert("Student record not found in database.");
    } finally {
      setLoading(false);
    }
  };

  // --- CHECK NO DUES ---
  const checkNoDues = async () => {
    if (!student.full_name) return alert("Please load student details first.");

    try {
      // Check if student has any dues
      const res = await fetch(
        `http://127.0.0.1:8000/hostel/check-no-dues/?reg_no=${student.reg_no}`
      );

      if (!res.ok) {
        throw new Error("Failed to fetch dues");
      }

      const data = await res.json();

      if (!data.is_no_dues) {
        alert(
          `⚠️ Pending dues\nPaid: ₹${data.total_paid}\nRequired: ₹${data.required_amount}`
        );
        return;
      }

      // If no dues, generate certificate
      await generatePDF();

      // Save record
      try {
        await fetch("http://127.0.0.1:8000/hostel/save-certificate-record/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            admission_no: student.admission_no,
            reg_no: student.reg_no,
            student_name: student.full_name,
            certificate_type: "nodues"
          }),
        });
      } catch (error) {
        console.error("Failed to save audit record:", error);
      }

    } catch (error) {
      console.error(error);
      alert("Error processing request");
    }
  };

  // --- GENERATE PDF ---
  const generatePDF = async () => {
    const canvas = await html2canvas(certificateRef.current, { scale: 2 });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");

    const imgWidth = 190;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    pdf.addImage(imgData, "PNG", 10, 10, imgWidth, imgHeight);

    const blobURL = pdf.output("bloburl");
    window.open(blobURL, "_blank");
  };

  return (
    <div className="flex flex-col items-center min-h-screen bg-gray-100 p-10 font-sans">
      <h2 className="text-3xl font-bold mb-6 text-slate-800">No Dues Certificate</h2>

      {/* Control Panel */}
      <div className="bg-white shadow-xl rounded-2xl p-8 mb-10 w-[600px] border border-slate-100">
        {/* Search Type Toggle Buttons */}
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
            className="flex-1 border border-slate-200 rounded-xl p-4 shadow-sm focus:ring-2 focus:ring-blue-400 outline-none"
          />
          <button
            onClick={fetchStudent}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl font-bold transition-all disabled:opacity-50"
          >
            {loading ? "Searching..." : "Load Profile"}
          </button>
        </div>

        {/* Display loaded student info with hostel details */}
        {student.full_name && (
          <div className="mt-4 p-4 bg-green-50 rounded-xl">
            <p className="text-sm font-semibold text-green-800">
              ✅ Loaded: {student.full_name} (Reg No: {student.reg_no})
            </p>
            <p className="text-sm text-green-700 mt-1">
              🏠 Hostel: {student.block !== "Not Assigned" ? student.block : "Not Allocated"} | 
              Room: {student.room_no !== "Not Assigned" ? student.room_no : "Not Allocated"}
            </p>
          </div>
        )}
      </div>

      {/* CERTIFICATE PREVIEW AREA */}
      <div
        ref={certificateRef}
        className="relative w-[800px] bg-white border border-black p-16 text-black leading-[3.5rem] overflow-hidden"
      >
        {/* Watermark */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <img src={watermark} alt="Watermark" className="w-[350px] opacity-10" />
        </div>

        {/* Header */}
        <div className="text-center mb-10">
          <img src={watermark} alt="University Logo" className="w-24 mx-auto mb-4" />
          <h1 className="text-3xl font-black">ANDHRA UNIVERSITY</h1>
          <p className="text-lg font-bold">
            A.U. COLLEGE OF ENGINEERING (A), VISAKHAPATNAM <br />
            SELF-SUPPORT HOSTELS
          </p>
        </div>

        {/* Title */}
        <div className="text-center font-bold underline text-2xl mb-12 uppercase">
          No Dues Certificate
        </div>

        {/* Content */}
        <div className="text-lg">
          <p>
            This is to certify that Mr./Ms.{" "}
            <span className="font-bold border-b border-dotted inline-block px-4 min-w-[200px] text-center">
              {student.full_name || "____________________"}
            </span> 
            Reg. No{" "}
            <span className="font-bold border-b border-dotted inline-block px-4 min-w-[150px] text-center">
              {student.reg_no || "__________"}
            </span>
          </p>
          <p>
            Class{" "}
            <span className="font-bold border-b border-dotted inline-block px-4 min-w-[120px] text-center">
              {student.class_yr || "__________"}
            </span>
            Degree{" "}
            <span className="font-bold border-b border-dotted inline-block px-4 min-w-[120px] text-center">
              {getDegreeLabel(student.degree)}
            </span>
            Branch{" "}
            <span className="font-bold border-b border-dotted inline-block px-4 min-w-[150px] text-center">
              {student.branch || "__________"}
            </span>
          </p>
          <p>
            is a boarder of AU Engineering College Hostels. 
            Hostel Block{" "}
            <span className="font-bold border-b border-dotted inline-block px-4 min-w-[100px] text-center">
              {student.block && student.block !== "Not Assigned" ? student.block : "_____"}
            </span> 
            Room No{" "}
            <span className="font-bold border-b border-dotted inline-block px-4 min-w-[100px] text-center">
              {student.room_no && student.room_no !== "Not Assigned" ? student.room_no : "_____"}
            </span>
          </p>
          
          <p className="mt-8 font-bold">Address of the Candidate:</p>
          <div className="border border-dotted border-black p-4 min-h-[100px] leading-snug italic">
            {student.address || "__________________________________________________________________"}
          </div>
          
          <p className="mt-8 font-bold text-center">
            It is certified that the above student has cleared all hostel dues 
            and no dues are pending as per hostel records.
          </p>
        </div>

        {/* Footer */}
        <div className="flex justify-between mt-24">
          <div className="font-medium text-lg">Date: {new Date().toLocaleDateString()}</div>
          <div className="text-center">
            <p className="font-black text-lg">CHIEF WARDEN</p>
          </div>
        </div>
      </div>

      {/* Generate Button */}
      <button
        onClick={checkNoDues}
        className="mt-12 bg-blue-600 hover:bg-blue-700 text-white px-12 py-5 rounded-2xl font-black uppercase tracking-widest shadow-2xl transition-all active:scale-95"
      >
        Generate No Dues Certificate
      </button>
    </div>
  );
};

export default NoDuesCertificate;