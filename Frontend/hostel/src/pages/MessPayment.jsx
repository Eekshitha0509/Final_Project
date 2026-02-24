import { useState } from "react";
import jsPDF from "jspdf";

function MessPayment() {

  const [formData, setFormData] = useState({
    name: "",
    admission: "",
    branch: "",
    year: "",
    amount: "",
    reference: "",
    date: "",
    month: ""
  });

  // Input Change Handler
  function handleChange(e){
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  }

  // ⭐ Receipt Generator Function
  const generateReceipt = () => {

    const doc = new jsPDF();

    doc.setFontSize(16);
    doc.text("Hostel Mess Payment Receipt", 20, 20);

    doc.setFontSize(12);

    doc.text("Student Name : " + formData.name, 20, 40);
    doc.text("Admission No : " + formData.admission, 20, 50);
    doc.text("Branch : " + formData.branch, 20, 60);
    doc.text("Year : " + formData.year, 20, 70);
    doc.text("Amount Paid : ₹" + formData.amount, 20, 80);
    doc.text("Reference No : " + formData.reference, 20, 90);
    doc.text("Month : " + formData.month, 20, 100);
    doc.text("Payment Date : " + formData.date, 20, 110);

    doc.save("Mess_Receipt.pdf");
  };

  // Submit Handler
  async function handleSubmit(e){
    e.preventDefault();

    alert("Payment Successful!");

    generateReceipt();
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">

      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">

        {/* Header */}
        <div className="bg-[#002147] p-6 text-center text-white">
          <h2 className="text-lg font-bold text-yellow-500 uppercase tracking-wider">
            Hostel Mess Portal
          </h2>
          <p className="text-sm opacity-80 mt-1">
            Mess Payment Form
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-8 space-y-6">

          <input name="name" placeholder="Student Name"
            onChange={handleChange}
            className="w-full border-b-2 border-slate-200 focus:border-blue-500 outline-none py-2 uppercase text-sm"
          />

          <input name="admission" placeholder="Admission Number"
            onChange={handleChange}
            className="w-full border-b-2 border-slate-200 focus:border-blue-500 outline-none py-2 text-sm"
          />

          <input name="branch" placeholder="Branch"
            onChange={handleChange}
            className="w-full border-b-2 border-slate-200 focus:border-blue-500 outline-none py-2 text-sm"
          />

          <input name="year" placeholder="Year"
            onChange={handleChange}
            className="w-full border-b-2 border-slate-200 focus:border-blue-500 outline-none py-2 text-sm"
          />

          <input name="amount" placeholder="Amount Paid"
            onChange={handleChange}
            className="w-full border-b-2 border-slate-200 focus:border-blue-500 outline-none py-2 text-sm"
          />

          <input name="reference" placeholder="Reference Number"
            onChange={handleChange}
            className="w-full border-b-2 border-slate-200 focus:border-blue-500 outline-none py-2 text-sm"
          />

          <input type="date" name="date"
            onChange={handleChange}
            className="w-full border-b-2 border-slate-200 focus:border-blue-500 outline-none py-2 text-sm"
          />

          <select name="month"
            onChange={handleChange}
            className="w-full border-b-2 border-slate-200 focus:border-blue-500 outline-none py-2 text-sm bg-transparent"
          >
            <option value="">Select Month</option>
            <option>January</option>
            <option>February</option>
            <option>March</option>
            <option>April</option>
            <option>May</option>
            <option>June</option>
            <option>July</option>
            <option>August</option>
            <option>September</option>
            <option>October</option>
            <option>November</option>
            <option>December</option>
          </select>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full bg-[#002147] hover:bg-blue-900 text-white font-bold py-4 rounded-xl border-b-4 border-yellow-500 active:border-b-0 transition-all uppercase tracking-widest shadow-lg"
          >
            Submit Payment
          </button>

        </form>
      </div>
    </div>
  );
}

export default MessPayment;