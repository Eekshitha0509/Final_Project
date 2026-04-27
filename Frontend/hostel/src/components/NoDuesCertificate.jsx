import React, { useState, useRef } from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import watermark from "../assets/watermark.jpg";
import { toast } from 'react-toastify';
import { useNavigate } from "react-router-dom";

const STUDENT_API = 'http://127.0.0.1:8000/api/student/';
const APP_API = 'http://127.0.0.1:8000/api/app/';

const NoDuesCertificate = () => {
  const navigate = useNavigate();
  const certificateRef = useRef();

  const [studentId, setStudentId] = useState("");
  const [searchType, setSearchType] = useState("admission_no");
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // ✅ ADDED STATE
  const [months, setMonths] = useState("");

  // --- FETCH STUDENT ---
  const fetchStudent = async () => {
    if (!studentId) return toast.warn("Please enter an Admission or Registration Number");

    setLoading(true);
    setLoaded(false);

    try {
      const searchParam = searchType === "admission_no" ? "admission_no" : "roll_no";
      const response = await fetch(
        `${STUDENT_API}get-student-profile/?${searchParam}=${encodeURIComponent(studentId)}`
      );

      if (!response.ok) {
        setStudent(null);
      } else {
        const data = await response.json();
        setStudent(data);
      }

      setLoaded(true);
    } catch (error) {
      console.error("Error:", error);
      setStudent(null);
      setLoaded(true);
    } finally {
      setLoading(false);
    }
  };

  // --- CHECK NO DUES ---
  const checkNoDues = async () => {
    if (!months) {
      toast.warn("Please enter months stayed");
      return;
    }

    try {
      // Get the token from localStorage (student token)
      const token = localStorage.getItem("access_token");
      
      if (!token) {
        toast.error("Please login again. Session expired.");
        return;
      }

      // 🔹 update months
      const updateRes = await fetch(
        STUDENT_API + 'update-months/',
        {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({
            months: Number(months),
          }),
        }
      );

      if (!updateRes.ok) {
        if (updateRes.status === 401) {
          toast.error("Session expired. Please login again.");
          return;
        }
        throw new Error("Failed to update months");
      }

      // 🔹 check dues
      const res = await fetch(
        `${APP_API}check-no-dues/`
      );

      if (!res.ok) {
        throw new Error("Failed to fetch dues");
      }

      const data = await res.json();

      if (!data.is_no_dues) {
        toast.warn(`Pending dues\nPaid: ₹${data.total_paid}\nRequired: ₹${data.required_amount}`);
        return;
      }

      generatePDF();

    } catch (error) {
      console.error(error);
      toast.error("Error processing request");
    }
  };

  const getDegreeLabel = (degree) => {
    if (!degree) return "B.Tech";
    const d = String(degree).toLowerCase();
    if (d === "b.tech" || d === "btech" || d === "1") return "B.Tech";
    if (d === "m.tech" || d === "mtech" || d === "2") return "M.Tech";
    if (d === "msc" || d === "m.sc" || d === "3") return "M.Sc";
    return degree;
};

  // --- PDF GENERATION ---
  const generatePDF = async () => {
    const canvas = await html2canvas(certificateRef.current, { scale: 2 });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");

    const imgWidth = 190;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    pdf.addImage(imgData, "PNG", 10, 10, imgWidth, imgHeight);

    const blobURL = pdf.output("bloburl");
    window.open(blobURL, "_blank");

    try {
      await fetch(STUDENT_API + 'save-certificate/', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          admission_no: student?.admission_no || "N/A",
          reg_no: studentId,
          student_name: student?.full_name || "Day Scholar",
          certificate_type: "nodues",
        }),
      });
    } catch (error) {
      console.error("Failed to save audit record:", error);
    }
  };

  return (
    <div className="flex flex-col items-center min-h-screen bg-gray-100 p-10 font-sans">
      <h2 className="text-3xl font-bold mb-6 text-slate-800">
        No Dues Certificate
      </h2>

      {/* Control Panel */}
      <div className="bg-white shadow-xl rounded-2xl p-8 mb-10 w-150 border border-slate-100">
        
        <div className="flex flex-col gap-4">

          <div className="flex gap-4 mb-4">
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

          <div className="flex items-center gap-4">
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
              {loading ? "Searching..." : "Load Details"}
            </button>
          </div>

          {/* ✅ ADDED INPUT */}
          <input
            type="number"
            placeholder="Enter months stayed (Admin)"
            value={months}
            onChange={(e) => setMonths(e.target.value)}
            className="border border-slate-200 rounded-xl p-4 shadow-sm focus:ring-2 focus:ring-blue-400 outline-none"
          />

        </div>
      </div>

      {/* CERTIFICATE PREVIEW AREA */}
      {loaded && (
        <>
          <div
            ref={certificateRef}
            className="relative w-200 bg-white border border-black p-16 text-black leading-14 overflow-hidden shadow-2xl"
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
              No Dues Certificate
            </div>

            <div className="text-lg">
              {student ? (
                <>
                  <p>
                    This is to certify that Mr.{" "}
                    <span className="font-bold border-b border-dotted inline-block px-4 min-w-50 text-center">
                      {student.full_name}
                    </span>{" "}
                    Reg. No{" "}
                    <span className="font-bold border-b border-dotted inline-block px-4 min-w-37.5 text-center">
                      {student.reg_no}
                    </span>
                  </p>
                  <p>
                    Class{" "}
                    <span className="font-bold border-b border-dotted inline-block px-4 min-w-30 text-center">
                      {student.class_yr}
                    </span>
                    degree{" "}
                    <span className="font-bold border-b border-dotted inline-block px-4 min-w-30 text-center">
                      {getDegreeLabel(student.degree)}
                    </span>
                    Branch{" "}
                    <span className="font-bold border-b border-dotted inline-block px-4 min-w-37.5 text-center">
                      {student.branch}
                    </span>
                  </p>
                  <p className="mt-8">
                    It is certified that the above student has cleared all hostel dues and no dues are pending against him as per hostel records.
                  </p>
                </>
              ) : (
                <>
                  <p>
                    This is to certify that the student bearing Registration Number{" "}
                    <span className="font-bold border-b border-dotted inline-block px-4 min-w-50 text-center">
                      {studentId}
                    </span>
                  </p>
                  <p className="mt-5">
                    is a Day Scholar of AU College of Engineering. As per hostel records, no dues are pending.
                  </p>
                </>
              )}
            </div>

            <div className="flex justify-between mt-24">
              <div className="font-medium text-lg">
                Date: {new Date().toLocaleDateString()}
              </div>
              <div className="text-center">
                <p className="font-black text-lg">CHIEF WARDEN</p>
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-col items-center">
            <button
              onClick={checkNoDues}
              className="bg-slate-900 hover:bg-black text-white px-12 py-5 rounded-2xl font-black uppercase tracking-widest shadow-2xl transition-all active:scale-95"
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
        </>
      )}
    </div>
  );
};

export default NoDuesCertificate;