// Frontend/hostel/src/pages/Payment.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const Payment = () => {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [booking, setBooking] = useState(null);
  const [error, setError] = useState(null);

  console.log("1. Payment component rendered");
  console.log("2. bookingId from URL:", bookingId);

  useEffect(() => {
    console.log("3. useEffect triggered");
    fetchBookingDetails();
  }, [bookingId]);

  const fetchBookingDetails = async () => {
    console.log("4. fetchBookingDetails started");
    try {
      const token = localStorage.getItem('access');
      console.log("5. Token exists:", !!token);
      
      const response = await axios.get('http://127.0.0.1:8000/api/my-booking/', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log("6. API Response:", response.data);
      
      if (response.data && !response.data.message) {
        console.log("7. Setting booking data");
        setBooking(response.data);
      } else {
        console.log("8. No active booking message:", response.data.message);
        alert('No active booking found. Please book a room first.');
        navigate('/homepage');
      }
    } catch (error) {
      console.error('9. Error fetching booking:', error);
      console.error('9a. Error response:', error.response);
      alert('Failed to load booking details');
    }
  };

  // Function to load Razorpay script
  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      // Check if script already exists
      if (document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]')) {
        resolve(true);
        return;
      }
      
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  // Main payment handler - integrated with Razorpay
  const handlePayment = async () => {
    console.log("10. Pay button clicked - Starting Razorpay integration");
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('access');
      const bookingIdToUse = bookingId || booking?.id;
      const amountInPaise = Math.round((booking?.room?.price_per_semester || 13000) * 100);
      
      console.log("11. Creating Razorpay order with amount:", amountInPaise);
      
      // Step 1: Create Razorpay order on backend
      const orderResponse = await axios.post(
        'http://127.0.0.1:8000/api/create-razorpay-order/',
        { booking_id: bookingIdToUse },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log("12. Order created successfully:", orderResponse.data);

      if (!orderResponse.data.order_id) {
  throw new Error('Failed to create order');
}

      // Step 2: Load Razorpay script
      const isScriptLoaded = await loadRazorpayScript();
      if (!isScriptLoaded) {
        throw new Error('Failed to load Razorpay SDK. Please check your internet connection.');
      }

      // Step 3: Configure Razorpay options (matching the HTML/JS structure)
      const options = {
        "key": orderResponse.data.key_id,  // Your Razorpay Key ID
        "amount": orderResponse.data.amount,  // Amount in paise
        "currency": orderResponse.data.currency,  // INR
        "name": "Hostel Management System",  // Your business name
        "description": `Hostel Room Booking - Room ${booking?.room_number || 'N/A'}`,
        "image": "https://your-logo-url.com/logo.png",  // Optional: Add your logo URL
        "order_id": orderResponse.data.order_id,  // Order ID from backend
        "callback_url": "http://127.0.0.1:8000/api/verify-razorpay-payment/",  // Verification endpoint
        "prefill": {
          "name": orderResponse.data.student_name || '',
          "email": orderResponse.data.student_email || '',
          "contact": orderResponse.data.student_phone || ''
        },
        "notes": {
          "address": "Hostel Management System",
          "booking_id": orderResponse.data.booking_id
        },
        "theme": {
          "color": "#3399cc"
        },
        "handler": async (response) => {
          // This handles the payment success callback
          console.log("13. Payment success response:", response);
          
          try {
            // Verify payment with backend
            const verifyResponse = await axios.post(
              'http://127.0.0.1:8000/api/verify-razorpay-payment/',
              {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature
              },
              {
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                }
              }
            );

            console.log("14. Payment verified:", verifyResponse.data);

            if (verifyResponse.data.success) {
              alert('✅ Payment successful! Your room has been confirmed.');
              navigate('/homepage');
            } else {
              throw new Error('Payment verification failed');
            }
          } catch (error) {
            console.error("15. Verification error:", error);
            setError('Payment verification failed. Please contact support.');
            alert('Payment verification failed. Please contact support.');
          }
        }
      };

      console.log("15. Opening Razorpay checkout with options:", options);
      
      // Step 4: Open Razorpay checkout
      const razorpay = new window.Razorpay(options);
      
      // Handle payment modal close
      razorpay.on('payment.failed', function(response) {
        console.error("Payment failed:", response.error);
        setError(`Payment failed: ${response.error.description || 'Please try again'}`);
        alert(`Payment failed: ${response.error.description || 'Please try again'}`);
        setLoading(false);
      });
      
      razorpay.open();
      
    } catch (error) {
      console.error("16. Payment error:", error);
      setError(error.message || 'Payment failed. Please try again.');
      alert(`Payment failed: ${error.message || 'Please try again'}`);
    } finally {
      setLoading(false);
    }
  };

  console.log("Current booking state:", booking);

  if (!booking) {
    console.log("Showing loading spinner");
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading booking details...</p>
        </div>
      </div>
    );
  }

  const amount = booking.room?.price_per_semester || 13000;

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-8 text-center">
            <h1 className="text-2xl font-bold text-white mb-2">Complete Payment</h1>
            <p className="text-blue-100">Secure payment via Razorpay</p>
          </div>
          
          <div className="p-6">
            {/* Booking Summary */}
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Booking Details</h2>
              
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-600">Block</span>
                  <span className="font-semibold">{booking.block_name}</span>
                </div>
                
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-600">Floor</span>
                  <span className="font-semibold">
                    {booking.floor_number === 0 ? 'Ground' : booking.floor_number}
                  </span>
                </div>
                
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-600">Room No</span>
                  <span className="font-semibold">{booking.room_number}</span>
                </div>
                
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-600">Capacity</span>
                  <span className="font-semibold">{booking.room?.capacity || 4} sharing</span>
                </div>
                
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-600">Price</span>
                  <span className="font-semibold text-green-600 text-xl">₹{amount}</span>
                </div>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {/* Payment Button - This is your main Pay button */}
            <button
              id="rzp-button1"
              onClick={handlePayment}
              disabled={loading}
              className={`w-full py-3 rounded-lg font-semibold text-white transition-all ${
                loading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </span>
              ) : (
                `Pay ₹${amount}`
              )}
            </button>
            
            <button
              onClick={() => {
                console.log("Cancel button clicked");
                navigate('/homepage');
              }}
              className="w-full mt-3 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-all"
            >
              Cancel
            </button>

            {/* Razorpay Information */}
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs text-blue-800">
                <strong>🔒 Secure Payment by Razorpay</strong><br />
                Test Card: 4111 1111 1111 1111 | Any expiry | Any CVV
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Payment;