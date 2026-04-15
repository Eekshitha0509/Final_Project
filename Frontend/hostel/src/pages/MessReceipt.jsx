import React from "react";
import { useLocation, useNavigate } from "react-router-dom";

function MessReceipt() {
  const location = useLocation();
  const navigate = useNavigate();
  const data = location.state;

  if (!data || !data.transaction_id) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <button onClick={() => navigate("/mess-payment")} className="text-blue-600 underline font-bold">
          No receipt data found. Return to Payment.
        </button>
      </div>
    );
  }

  // Points to your Django API: path('receipt/<str:receipt_id>/', views.download_receipt)
  const pdfUrl = `http://127.0.0.1:8000/hostel/receipt/${data.transaction_id}/`;

  return (
    <div className="min-h-screen bg-gray-200 p-4 md:p-8 flex flex-col items-center">
      
      {/* 🔹 MAIN PAGE CONTAINER WITH BORDER */}
      <div className="w-full max-w-5xl bg-white shadow-2xl border-[3px] border-[#002147] p-2 rounded-sm flex flex-col h-[90vh]">
        
        {/* 🔹 INNER DECORATIVE BORDER */}
        <div className="border border-gray-300 flex-grow flex flex-col overflow-hidden">
          
          {/* 🔹 HEADER IMAGE AREA */}
          <div className="w-full bg-white border-b-2 border-[#002147]">
            {/* Replace 'header_edited.png' with your actual edited image path */}
            <img 
              src="/assets/logo.png" 
              alt="Andhra University Header" 
              className="w-full h-auto object-contain max-h-[120px]"
              onError={(e) => { e.target.src = "https://via.placeholder.com/1000x120?text=PLACE+YOUR+EDITED+HEADER+IMAGE+HERE"; }}
            />
          </div>

          {/* 🔹 NAVIGATION TOOLBAR */}
          <div className="bg-gray-100 px-6 py-3 flex justify-between items-center border-b border-gray-200">
            <div>
              <span className="text-[10px] font-bold uppercase text-gray-500 tracking-widest block">Transaction ID</span>
              <span className="text-sm font-black text-[#002147]">{data.transaction_id}</span>
            </div>
            
            <div className="flex gap-3">
              <button 
                onClick={() => window.open(pdfUrl, '_blank')}
                className="text-xs font-bold text-blue-700 hover:underline"
              >
                Open in New Tab
              </button>
              <button 
                onClick={() => navigate("/homepage")}
                className="bg-[#002147] text-white px-5 py-2 rounded-md text-xs font-bold hover:bg-blue-900 transition uppercase tracking-wider"
              >
                Close Receipt
              </button>
            </div>
          </div>

          {/* 🔹 PDF VIEWER (THE "CODE" YOU PROVIDED) */}
          <div className="flex-grow relative bg-gray-500">
            <object
              data={pdfUrl}
              type="application/pdf"
              className="w-full h-full border-none"
            >
              <div className="flex flex-col items-center justify-center h-full text-white p-6 text-center">
                <p className="mb-4 font-semibold">Native PDF Viewer not supported in this browser.</p>
                <a 
                  href={pdfUrl} 
                  download 
                  className="bg-yellow-400 text-[#002147] px-8 py-3 rounded-lg font-bold shadow-lg"
                >
                  Download Official PDF
                </a>
              </div>
            </object>
          </div>
        </div>
      </div>
      
      {/* Footer hint */}
      <p className="mt-4 text-gray-500 text-[10px] uppercase tracking-[0.2em]">
        Official Document Viewer • Andhra University Engineering Hostels
      </p>
    </div>
  );
}

export default MessReceipt;