import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const APP_API = 'http://127.0.0.1:8000/api/app/';
const STUDENT_API = 'http://127.0.0.1:8000/api/student/';

function MessFeePayment() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [studentFound, setStudentFound] = useState(false);
  const [searchId, setSearchId] = useState("");
  const [searchType, setSearchType] = useState("admission_no");
  const [billingRates, setBillingRates] = useState({});
  const [availableMonths, setAvailableMonths] = useState([]);
  const [checkingMonth, setCheckingMonth] = useState(false); // Add loading state for month check

  const [formData, setFormData] = useState({
    student_name: "",
    roll_no: "",
    admission_no: "",
    reg_no: "",
    room_no: "",
    class_yr: "",
    department: "",
    date: "",
    month: "",
    days: "",
    amount: "3000",
    payment_mode: "Online",
    purpose: "Mess Fee"
  });

  // Fetch billing rates from database when component mounts
  useEffect(() => {
    fetchAllBillingRates();
  }, []);

  const fetchAllBillingRates = async () => {
    try {
      const response = await axios.get(APP_API + 'get-all-billing-rates/');
      if (response.data.success) {
        const rates = {};
        const months = [];
        response.data.data.forEach(rate => {
          rates[rate.month] = {
            days: rate.days,
            amount: rate.mess_charge,
            electric_charge: rate.electric_charge,
            service_charge: rate.service_charge,
            net_demand: rate.net_demand
          };
          months.push(rate.month);
        });
        setBillingRates(rates);
        setAvailableMonths(months);
        console.log("✅ Billing rates loaded:", rates);
      }
    } catch (error) {
      console.error("Error fetching billing rates:", error);
    }
  };

  // ✅ ADD THIS FUNCTION - Check if month already paid
  const checkMonthAlreadyPaid = async (roll_no, month) => {
    if (!roll_no || !month) return false;
    
    try {
      const response = await axios.get(
        `${APP_API}check-month-paid/?roll_no=${roll_no}&month=${month}`
      );
      return response.data.paid === true;
    } catch (error) {
      console.error("Error checking month paid:", error);
      return false;
    }
  };

  // Fetch student details
  const fetchStudentDetails = async () => {
    if (!searchId) {
      alert('Please enter Admission or Registration number');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.get(
        `${STUDENT_API}get-student-profile/?${searchType}=${searchId}`
      );
      
      const studentData = response.data;
      
      if (studentData && !studentData.error) {
        setFormData({
          ...formData,
          admission_no: studentData.admission_no,
          reg_no: studentData.reg_no,
          student_name: studentData.full_name,
          roll_no: studentData.roll_no || studentData.reg_no,
          room_no: studentData.room_no || studentData.room,
          class_yr: studentData.class_yr,
          department: studentData.branch || studentData.department
        });
        setStudentFound(true);
      } else {
        alert('Student not found');
        setStudentFound(false);
      }
    } catch (error) {
      console.error('Error fetching student:', error);
      alert('Student not found. Please check the number.');
      setStudentFound(false);
    } finally {
      setLoading(false);
    }
  };

  // ✅ UPDATED handleMonthChange - Now checks for duplicate payments
  const handleMonthChange = async (e) => {
    const selectedMonth = e.target.value;
    
    if (!selectedMonth) return;
    
    // Check if already paid
    if (formData.roll_no) {
      setCheckingMonth(true);
      const alreadyPaid = await checkMonthAlreadyPaid(formData.roll_no, selectedMonth);
      setCheckingMonth(false);
      
      if (alreadyPaid) {
        alert(`❌ You have already paid for ${selectedMonth}. Duplicate payment not allowed.`);
        setFormData({
          ...formData,
          month: "",
          days: "",
          amount: ""
        });
        return;
      }
    }
    
    const rate = billingRates[selectedMonth];
    
    if (rate) {
      setFormData({
        ...formData,
        month: selectedMonth,
        days: rate.days,
        amount: rate.amount.toString()
      });
      console.log(`✅ Auto-filled: ${rate.days} days, ₹${rate.amount} for ${selectedMonth}`);
    } else {
      setFormData({
        ...formData,
        month: selectedMonth,
        days: "",
        amount: ""
      });
      alert(`⚠️ No billing rate found for ${selectedMonth}. Please contact admin.`);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  // Load Razorpay script
  const loadRazorpayScript = () => {
    return new Promise((resolve, reject) => {
      if (window.Razorpay) {
        console.log("✅ Razorpay SDK already loaded");
        setScriptLoaded(true);
        resolve(true);
        return;
      }
      
      console.log("🔄 Loading Razorpay SDK...");
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      
      script.onload = () => {
        console.log("✅ Razorpay SDK loaded successfully");
        setScriptLoaded(true);
        resolve(true);
      };
      
      script.onerror = () => {
        console.error("❌ Failed to load Razorpay SDK");
        reject(new Error("Failed to load Razorpay SDK. Please check your internet connection."));
      };
      
      document.body.appendChild(script);
    });
  };

  // Verify payment
  const verifyPayment = async (paymentResponse, studentData) => {
    try {
      const res = await axios.post(APP_API + 'verify-payment/', {
        razorpay_order_id: paymentResponse.razorpay_order_id,
        razorpay_payment_id: paymentResponse.razorpay_payment_id,
        razorpay_signature: paymentResponse.razorpay_signature,
        roll_no: studentData.roll_no,
        student_name: studentData.student_name,
        room_no: studentData.room_no,
        class_yr: studentData.class_yr,
        month: studentData.month,
        amount: parseInt(studentData.amount),
        days: studentData.days
      });

      if (res.data.status === "success") {
        const paymentTime = res.data.payment_time || 'Just now';
        const daysPaid = res.data.days || studentData.days;
        
        alert(`✅ Payment Verified Successfully!\n\nReceipt No: ${res.data.receipt_id}\nPayment Time: ${paymentTime}\nDays: ${daysPaid}`);
        
        if (res.data.receipt_id) {
          await handleDownloadPDF(res.data.receipt_id);
        }
        
        // Reset form
        setFormData({
          student_name: "",
          roll_no: "",
          admission_no: "",
          reg_no: "",
          room_no: "",
          class_yr: "",
          department: "",
          date: "",
          month: "",
          days: "",
          amount: "3000",
          payment_mode: "Online",
          purpose: "Mess Fee"
        });
        setStudentFound(false);
        setSearchId("");
        
        setTimeout(() => {
          navigate("/homepage");
        }, 2000);
      }
    } catch (err) {
      console.error("Verification Error:", err.response?.data);
      alert("Payment was successful, but server verification failed. Please contact support.");
    }
  };

  // Download PDF receipt
  const handleDownloadPDF = async (receiptId) => {
    try {
      const response = await axios.get(`${APP_API}receipt/${receiptId}/`, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `AU_Mess_Receipt_${receiptId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      
      alert("📄 Receipt downloaded successfully!");
    } catch (error) {
      console.error("Error downloading PDF:", error);
      alert("Could not download the receipt right now. Please contact administration.");
    }
  };

  // Main submit handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.student_name || !formData.roll_no || !formData.month || !formData.date) {
      alert("Please fill all required fields");
      return;
    }
    
    if (!formData.days || !formData.amount) {
      alert("Please select a valid month with billing rates");
      return;
    }
    
    setLoading(true);

    try {
      await loadRazorpayScript();
      
      if (!window.Razorpay) {
        throw new Error("Razorpay SDK failed to load. Please refresh and try again.");
      }

      // Double check payment not already made (for race condition)
      const alreadyPaid = await checkMonthAlreadyPaid(formData.roll_no, formData.month);
      if (alreadyPaid) {
        alert(`❌ Payment for ${formData.month} already exists. Cannot process duplicate.`);
        setLoading(false);
        return;
      }

      // Save payment details to backend
      console.log("📝 Saving payment details...");
      const saveResponse = await axios.post(
        STUDENT_API + 'mess-payment/',
        {
          student_name: formData.student_name,
          roll_no: formData.roll_no,
          room_no: formData.room_no,
          class_yr: formData.class_yr,
          date: formData.date,
          month: formData.month,
          amount: parseInt(formData.amount),
          days: formData.days,
          payment_mode: "Online",
          purpose: "Mess Fee"
        }
      );
      
      console.log("✅ Payment details saved:", saveResponse.data);

      // Create Razorpay order
      console.log("💰 Creating Razorpay order...");
      const orderRes = await axios.post(APP_API + 'create-order/', { 
        amount: parseInt(formData.amount),
        roll_no: formData.roll_no
      });
      
      const orderData = orderRes.data;
      console.log("✅ Order created:", orderData);

      // Razorpay options
      const options = {
        key: "rzp_test_SPwdd9NISZKvHz",
        amount: orderData.amount,
        currency: orderData.currency || "INR",
        name: "Andhra University",
        description: `Mess Fee Payment - ${formData.month} (${formData.days} days)`,
        order_id: orderData.id,
        prefill: {
          name: formData.student_name,
          email: `${formData.roll_no}@au.edu.in`,
          contact: "9999999999"
        },
        notes: {
          roll_no: formData.roll_no,
          month: formData.month,
          days: formData.days,
          room_no: formData.room_no
        },
        theme: {
          color: "#002147"
        },
        handler: async function (paymentResponse) {
          console.log("💳 Payment received:", paymentResponse);
          await verifyPayment(paymentResponse, {
            ...formData,
            amount: formData.amount
          });
          setLoading(false);
        },
        modal: {
          ondismiss: () => {
            console.log("Payment modal closed by user");
            setLoading(false);
            alert("Payment cancelled. You can try again anytime.");
          }
        }
      };

      const razorpay = new window.Razorpay(options);
      
      razorpay.on('payment.failed', function (response) {
        console.error("Payment failed:", response.error);
        alert(`Payment failed: ${response.error.description || "Please try again"}`);
        setLoading(false);
      });
      
      razorpay.open();
      
    } catch (error) {
      console.error("❌ Payment error:", error);
      
      if (error.message.includes("Razorpay SDK")) {
        alert("Unable to load payment gateway. Please check your internet connection and refresh the page.");
      } else if (error.response?.status === 500) {
        alert("Server error. Please try again later.");
      } else if (error.response?.data?.error) {
        alert(error.response.data.error);
      } else {
        alert(error.message || "Payment failed. Please try again.");
      }
      
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 py-10 px-4">
      <div className="max-w-5xl mx-auto bg-white shadow-2xl rounded-lg border-t-8 border-[#002147] relative px-6">
        {/* University Header */}
        <div className="bg-gradient-to-r from-[#002147] to-[#003366] p-6 text-center text-white">
          <h1 className="text-lg font-bold text-yellow-400 uppercase tracking-widest">Andhra University</h1>
          <h2 className="text-xl font-black uppercase mt-1">College of Engineering (A) Hostel</h2>
          <p className="text-sm mt-2 opacity-90">Official Mess Fee Payment Portal</p>
          <div className="mt-3 flex justify-center gap-4 text-xs">
            <span className="bg-yellow-500 text-[#002147] px-3 py-1 rounded-full font-bold">Secure Payment</span>
            <span className="bg-green-500 text-white px-3 py-1 rounded-full font-bold">Razorpay Verified</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          
          {/* Student Search Section */}
          {!studentFound ? (
            <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
              <h3 className="text-[#002147] font-black uppercase text-sm tracking-widest mb-4">
                Find Your Details
              </h3>
              <div className="flex gap-4 mb-4">
                <button
                  type="button"
                  onClick={() => setSearchType('admission_no')}
                  className={`px-4 py-2 rounded-lg font-medium ${
                    searchType === 'admission_no' 
                      ? 'bg-[#002147] text-white' 
                      : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  Admission Number
                </button>
                <button
                  type="button"
                  onClick={() => setSearchType('reg_no')}
                  className={`px-4 py-2 rounded-lg font-medium ${
                    searchType === 'reg_no' 
                      ? 'bg-[#002147] text-white' 
                      : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  Registration Number
                </button>
              </div>
              <div className="flex gap-4">
                <input
                  type="text"
                  placeholder={searchType === 'admission_no' ? 'Enter Admission Number' : 'Enter Registration Number'}
                  value={searchId}
                  onChange={(e) => setSearchId(e.target.value)}
                  className="flex-1 px-4 py-3 border rounded-xl focus:ring-2 focus:ring-[#002147] outline-none"
                />
                <button
                  type="button"
                  onClick={fetchStudentDetails}
                  disabled={loading}
                  className="bg-[#002147] text-white px-6 py-3 rounded-xl font-semibold hover:bg-[#003366] transition"
                >
                  {loading ? 'Searching...' : 'Fetch Details'}
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Student Information Section */}
              <div>
                <h3 className="text-[#002147] font-black border-b-2 border-[#002147] pb-2 uppercase text-sm tracking-widest mb-6">
                  1. Student Information
                </h3>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="flex flex-col">
                    <label className="text-xs font-bold text-slate-600 mb-2 uppercase tracking-tight">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="student_name"
                      value={formData.student_name}
                      readOnly
                      className="border border-slate-300 rounded-lg px-4 py-3 bg-slate-100"
                    />
                  </div>
                  
                  <div className="flex flex-col">
                    <label className="text-xs font-bold text-slate-600 mb-2 uppercase tracking-tight">
                      Roll Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="roll_no"
                      value={formData.roll_no}
                      readOnly
                      className="border border-slate-300 rounded-lg px-4 py-3 bg-slate-100"
                    />
                  </div>
                  
                  <div className="flex flex-col">
                    <label className="text-xs font-bold text-slate-600 mb-2 uppercase tracking-tight">
                      Room Number
                    </label>
                    <input
                      type="text"
                      name="room_no"
                      value={formData.room_no}
                      readOnly
                      className="border border-slate-300 rounded-lg px-4 py-3 bg-slate-100"
                    />
                  </div>
                  
                  <div className="flex flex-col">
                    <label className="text-xs font-bold text-slate-600 mb-2 uppercase tracking-tight">
                      Class/Year <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="class_yr"
                      value={formData.class_yr}
                      readOnly
                      className="border border-slate-300 rounded-lg px-4 py-3 bg-slate-100"
                    />
                  </div>
                </div>
              </div>

              {/* Payment Details Section with Auto-fetch */}
              <div>
                <h3 className="text-[#002147] font-black border-b-2 border-[#002147] pb-2 uppercase text-sm tracking-widest mb-6">
                  2. Payment Details
                </h3>
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="flex flex-col">
                    <label className="text-xs font-bold text-slate-600 mb-2 uppercase tracking-tight">
                      Select Month <span className="text-red-500">*</span>
                    </label>
                    <select 
                      name="month" 
                      value={formData.month} 
                      onChange={handleMonthChange} 
                      className="border border-slate-300 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-[#002147] bg-slate-50"
                      required
                      disabled={checkingMonth}
                    >
                      <option value="">Select Month</option>
                      {availableMonths.map((month, index) => (
                        <option key={index} value={month}>{month}</option>
                      ))}
                    </select>
                    {checkingMonth && (
                      <p className="text-xs text-slate-500 mt-1">Checking payment status...</p>
                    )}
                  </div>
                  
                  <div className="flex flex-col">
                    <label className="text-xs font-bold text-slate-600 mb-2 uppercase tracking-tight">
                      Number of Days <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="days"
                      value={formData.days}
                      readOnly
                      className="border border-slate-300 rounded-lg px-4 py-3 bg-slate-100 font-semibold"
                      placeholder="Auto-filled from database"
                    />
                  </div>
                  
                  <div className="flex flex-col">
                    <label className="text-xs font-bold text-slate-600 mb-2 uppercase tracking-tight">
                      Amount (INR) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      name="amount"
                      value={formData.amount}
                      readOnly
                      className="border border-slate-300 rounded-lg px-4 py-3 bg-slate-100 font-bold text-lg text-[#002147]"
                      placeholder="Auto-filled from database"
                    />
                  </div>
                  
                  <div className="flex flex-col">
                    <label className="text-xs font-bold text-slate-600 mb-2 uppercase tracking-tight">
                      Payment Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      name="date"
                      value={formData.date}
                      onChange={handleChange}
                      required
                      className="border border-slate-300 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-[#002147] bg-slate-50"
                    />
                  </div>
                </div>
              </div>

              {/* Payment Summary */}
              <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
                <h3 className="text-[#002147] font-bold mb-4">Payment Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between py-2 border-b border-slate-200">
                    <span className="text-slate-600">Student Name:</span>
                    <span className="font-semibold">{formData.student_name || "—"}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-200">
                    <span className="text-slate-600">Roll Number:</span>
                    <span className="font-semibold">{formData.roll_no || "—"}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-200">
                    <span className="text-slate-600">Month:</span>
                    <span className="font-semibold">{formData.month || "—"}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-200">
                    <span className="text-slate-600">Number of Days:</span>
                    <span className="font-semibold">{formData.days || "—"} days</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-slate-600 font-bold">Total Amount:</span>
                    <span className="font-bold text-lg text-[#002147]">₹{formData.amount || "0"}/-</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setStudentFound(false);
                    setSearchId('');
                    setFormData({
                      student_name: "",
                      roll_no: "",
                      admission_no: "",
                      reg_no: "",
                      room_no: "",
                      class_yr: "",
                      department: "",
                      date: "",
                      month: "",
                      days: "",
                      amount: "3000",
                      payment_mode: "Online",
                      purpose: "Mess Fee"
                    });
                  }}
                  className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition"
                >
                  Search Another Student
                </button>
                <button
                  type="submit"
                  disabled={loading || !formData.month}
                  className="flex-1 bg-gradient-to-r from-[#002147] to-[#003366] hover:from-[#003366] hover:to-[#004488] text-white font-black py-3 rounded-xl shadow-lg transition-all uppercase tracking-widest disabled:opacity-50"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing...
                    </span>
                  ) : (
                    `Proceed to Pay ₹${formData.amount}`
                  )}
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
}

export default MessFeePayment;