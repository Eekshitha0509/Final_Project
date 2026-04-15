import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

function MessFeePayment() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [scriptLoaded, setScriptLoaded] = useState(false);

  const [formData, setFormData] = useState({
    student_name: "",
    roll_no: "",
    room_no: "",
    class_yr: "",
    department: "",
    date: "",
    month: "",
    amount: "3000",
    payment_mode: "Online",
    purpose: "Mess Fee"
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  // ✅ DYNAMIC RAZORPAY SCRIPT LOADER (Fixes the error!)
  const loadRazorpayScript = () => {
    return new Promise((resolve, reject) => {
      // Check if already loaded
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

  // ✅ VERIFY PAYMENT WITH BACKEND
  const verifyPayment = async (paymentResponse, studentData) => {
    try {
      const res = await axios.post("http://127.0.0.1:8000/hostel/verify-payment/", {
        razorpay_order_id: paymentResponse.razorpay_order_id,
        razorpay_payment_id: paymentResponse.razorpay_payment_id,
        razorpay_signature: paymentResponse.razorpay_signature,
        roll_no: studentData.roll_no 
      });

      if (res.data.status === "success") {
        alert("✅ Payment Verified Successfully!");
        
        // Download receipt
        if (res.data.receipt_id) {
          await handleDownloadPDF(res.data.receipt_id);
        }
        
        // Reset form
        setFormData({
          student_name: "",
          roll_no: "",
          room_no: "",
          class_yr: "",
          department: "",
          date: "",
          month: "",
          amount: "3000",
          payment_mode: "Online",
          purpose: "Mess Fee"
        });
        
        // Navigate to success page or dashboard
        setTimeout(() => {
          navigate("/dashboard");
        }, 2000);
      }
    } catch (err) {
      console.error("Verification Error:", err.response?.data);
      alert("Payment was successful, but server verification failed. Please contact support.");
    }
  };

  // ✅ DOWNLOAD PDF RECEIPT
  const handleDownloadPDF = async (receiptId) => {
    try {
      const response = await axios.get(`http://127.0.0.1:8000/hostel/receipt/${receiptId}/`, {
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

  // ✅ MAIN SUBMIT HANDLER
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.student_name || !formData.roll_no || !formData.month || !formData.date) {
      alert("Please fill all required fields");
      return;
    }
    
    setLoading(true);

    try {
      // Step 1: Load Razorpay script dynamically (FIXES THE ERROR!)
      await loadRazorpayScript();
      
      // Double check Razorpay is available
      if (!window.Razorpay) {
        throw new Error("Razorpay SDK failed to load. Please refresh and try again.");
      }

      // Step 2: Save payment details to backend
      console.log("📝 Saving payment details...");
      const saveResponse = await axios.post(
        "http://127.0.0.1:8000/hostel/mess-payment/",
        formData
      );
      
      console.log("✅ Payment details saved:", saveResponse.data);

      // Step 3: Create Razorpay order
      console.log("💰 Creating Razorpay order...");
      const orderRes = await axios.post("http://127.0.0.1:8000/hostel/create-order/", { 
        amount: parseInt(formData.amount),
        roll_no: formData.roll_no
      });
      
      const orderData = orderRes.data;
      console.log("✅ Order created:", orderData);

      // Step 4: Prepare Razorpay options
      const options = {
        key: "rzp_test_SPwdd9NISZKvHz", // Your Razorpay Key ID
        amount: orderData.amount,
        currency: orderData.currency || "INR",
        name: "Andhra University",
        description: `Mess Fee Payment - ${formData.month} ${new Date().getFullYear()}`,
        order_id: orderData.id,
        prefill: {
          name: formData.student_name,
          email: `${formData.roll_no}@au.edu.in`,
          contact: "9999999999"
        },
        notes: {
          roll_no: formData.roll_no,
          month: formData.month,
          room_no: formData.room_no
        },
        theme: {
          color: "#002147"
        },
        handler: async function (paymentResponse) {
          console.log("💳 Payment received:", paymentResponse);
          await verifyPayment(paymentResponse, formData);
          setLoading(false);
        },
        modal: {
          ondismiss: () => {
            console.log("Payment modal closed by user");
            setLoading(false);
            alert("Payment cancelled. You can try again anytime.");
          },
          escape: false,
          backdropclose: false
        }
      };

      // Step 5: Open Razorpay checkout
      const razorpay = new window.Razorpay(options);
      
      // Handle payment failure
      razorpay.on('payment.failed', function (response) {
        console.error("Payment failed:", response.error);
        alert(`Payment failed: ${response.error.description || "Please try again"}`);
        setLoading(false);
      });
      
      razorpay.open();
      
    } catch (error) {
      console.error("❌ Payment error:", error);
      
      // User-friendly error messages
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
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl border overflow-hidden">
        {/* University Header with Branding */}
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
                  onChange={handleChange}
                  required
                  className="border border-slate-300 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-[#002147] focus:border-transparent bg-slate-50"
                  placeholder="Enter your full name"
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
                  onChange={handleChange}
                  required
                  className="border border-slate-300 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-[#002147] focus:border-transparent bg-slate-50"
                  placeholder="Enter your roll number"
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
                  onChange={handleChange}
                  className="border border-slate-300 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-[#002147] focus:border-transparent bg-slate-50"
                  placeholder="Enter room number"
                />
              </div>
              
              <div className="flex flex-col">
                <label className="text-xs font-bold text-slate-600 mb-2 uppercase tracking-tight">
                  Class/Year <span className="text-red-500">*</span>
                </label>
                <select
                  name="class_yr"
                  value={formData.class_yr}
                  onChange={handleChange}
                  required
                  className="border border-slate-300 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-[#002147] bg-slate-50"
                >
                  <option value="">Select Year</option>
                  <option value="1st Year">1st Year</option>
                  <option value="2nd Year">2nd Year</option>
                  <option value="3rd Year">3rd Year</option>
                  <option value="4th Year">4th Year</option>
                </select>
              </div>
              
              <div className="flex flex-col">
                <label className="text-xs font-bold text-slate-600 mb-2 uppercase tracking-tight">
                  Department
                </label>
                <select
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  className="border border-slate-300 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-[#002147] bg-slate-50"
                >
                  <option value="">Select Department</option>
                  <option value="CSE">Computer Science Engineering</option>
                  <option value="ECE">Electronics & Communication</option>
                  <option value="EEE">Electrical & Electronics</option>
                  <option value="MECH">Mechanical Engineering</option>
                  <option value="CIVIL">Civil Engineering</option>
                </select>
              </div>
            </div>
          </div>

          {/* Payment Details Section */}
          <div>
            <h3 className="text-[#002147] font-black border-b-2 border-[#002147] pb-2 uppercase text-sm tracking-widest mb-6">
              2. Payment Details
            </h3>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="flex flex-col">
                <label className="text-xs font-bold text-slate-600 mb-2 uppercase tracking-tight">
                  Month <span className="text-red-500">*</span>
                </label>
                <select 
                  name="month" 
                  value={formData.month} 
                  onChange={handleChange} 
                  className="border border-slate-300 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-[#002147] bg-slate-50"
                  required
                >
                  <option value="">Select Month</option>
                  <option value="January">January</option>
                  <option value="February">February</option>
                  <option value="March">March</option>
                  <option value="April">April</option>
                  <option value="May">May</option>
                  <option value="June">June</option>
                  <option value="July">July</option>
                  <option value="August">August</option>
                  <option value="September">September</option>
                  <option value="October">October</option>
                  <option value="November">November</option>
                  <option value="December">December</option>
                </select>
              </div>
              
              <div className="flex flex-col">
                <label className="text-xs font-bold text-slate-600 mb-2 uppercase tracking-tight">
                  Amount (INR) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="amount"
                  value={formData.amount}
                  onChange={handleChange}
                  required
                  className="border border-slate-300 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-[#002147] bg-slate-100 font-bold"
                  placeholder="Amount"
                />
                <p className="text-xs text-slate-500 mt-1">Standard Mess Fee: ₹3000/month</p>
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
              <div className="flex justify-between py-2">
                <span className="text-slate-600 font-bold">Total Amount:</span>
                <span className="font-bold text-lg text-[#002147]">₹{formData.amount || "0"}/-</span>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-[#002147] to-[#003366] hover:from-[#003366] hover:to-[#004488] text-white font-black py-4 rounded-xl shadow-lg transition-all uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02]"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing Payment...
                </span>
              ) : (
                `Proceed to Pay ₹${formData.amount}`
              )}
            </button>
            <p className="text-center text-xs text-slate-500 mt-4">
              🔒 Secure payment powered by Razorpay. Your payment information is encrypted and secure.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}

export default MessFeePayment;