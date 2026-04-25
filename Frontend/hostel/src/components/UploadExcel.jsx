import React, { useState } from "react";

function UploadExcel() {
  const [studentFile, setStudentFile] = useState(null);
  const [billingFile, setBillingFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const APP_API = 'http://127.0.0.1:8000/api/app/';

  // Student Upload
  const uploadStudent = async () => {
    if (!studentFile) return alert("Select student file");

    setLoading(true);
    const formData = new FormData();
    formData.append("file", studentFile);

    try {
      const res = await fetch(`${APP_API}upload-excel/`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      setResult({ type: 'student', data });
      alert(data.message || "Student data uploaded successfully!");
    } catch (error) {
      alert("Error uploading student data: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Billing Upload
  const uploadBilling = async () => {
    if (!billingFile) return alert("Select billing file");

    setLoading(true);
    const formData = new FormData();
    formData.append("file", billingFile);

    try {
      const res = await fetch(`${APP_API}upload-billing-excel/`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      setResult({ type: 'billing', data });
      alert(data.message || "Billing data uploaded successfully!");
    } catch (error) {
      alert("Error uploading billing data: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="bg-gradient-to-r from-[#002147] to-[#003366] p-6 text-white">
          <h2 className="text-2xl font-bold">Excel Data Upload</h2>
          <p className="text-sm opacity-90 mt-1">Upload student and billing data</p>
        </div>

        <div className="p-6 space-y-6">
          {/* Student Upload */}
          <div className="border-2 border-dashed border-blue-300 rounded-xl p-6 bg-blue-50">
            <h3 className="text-lg font-bold text-blue-800 mb-3">📚 Upload Student Data</h3>
            <p className="text-sm text-blue-600 mb-3">Upload META Hostel Excel file with student details and monthly payments</p>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => setStudentFile(e.target.files[0])}
              className="mb-3 w-full text-sm"
              disabled={loading}
            />
            <button
              onClick={uploadStudent}
              disabled={loading || !studentFile}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition disabled:opacity-50"
            >
              {loading ? "Uploading..." : "Upload Student Data"}
            </button>
          </div>

          {/* Billing Upload */}
          <div className="border-2 border-dashed border-green-300 rounded-xl p-6 bg-green-50">
            <h3 className="text-lg font-bold text-green-800 mb-3">💰 Upload Billing Rates</h3>
            <p className="text-sm text-green-600 mb-3">Upload Excel with columns: MONTH, DAYS, MESS_CHARGE, DATE</p>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => setBillingFile(e.target.files[0])}
              className="mb-3 w-full text-sm"
              disabled={loading}
            />
            <button
              onClick={uploadBilling}
              disabled={loading || !billingFile}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 rounded-lg transition disabled:opacity-50"
            >
              {loading ? "Uploading..." : "Upload Billing Data"}
            </button>
          </div>

          {/* Results Summary */}
          {result && (
            <div className={`p-4 rounded-xl ${result.data.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              <h4 className="font-bold mb-2">Upload Summary:</h4>
              {result.type === 'student' && (
                <>
                  <p>📊 Students Processed: {result.data.students_processed || 0}</p>
                  <p>✨ New Students Created: {result.data.students_created || 0}</p>
                  <p>💰 Payments Created: {result.data.payments_created || 0}</p>
                  {result.data.errors && result.data.errors.length > 0 && (
                    <div className="mt-2">
                      <p className="font-semibold">Errors:</p>
                      <ul className="text-xs list-disc pl-4">
                        {result.data.errors.slice(0, 5).map((err, i) => (
                          <li key={i}>{err}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}
              {result.type === 'billing' && (
                <>
                  <p>📋 Billing Records Uploaded: {result.data.count || 0}</p>
                  <p>📁 File saved: {result.data.file_path}</p>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default UploadExcel;