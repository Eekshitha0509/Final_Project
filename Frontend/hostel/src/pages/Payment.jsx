// Frontend/hostel/src/pages/Payment.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const APP_API = 'http://127.0.0.1:8000/api/app/';

const Payment = () => {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [booking, setBooking] = useState(null);
  const [error, setError] = useState(null);
  const [amount, setAmount] = useState('0');

  useEffect(() => {
    fetchBookingDetails();
  }, []);

  const fetchBookingDetails = async () => {
    try {
      const token = localStorage.getItem('access');
      if (!token) {
        alert('Please login first');
        navigate('/login/student');
        return;
      }
      
      const response = await axios.get(APP_API + 'my-booking/', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('Booking response:', response.data);
      
      if (response.data.status === 'confirmed') {
        const b = response.data.booking || {};
        setBooking(b);
        setAmount(b.price_per_semester || b.amount || '10000');
      } else if (response.data.status === 'pending') {
        const b = response.data;
        setBooking({ id: b.booking_id, room_number: 'Booking ' + b.booking_id });
        setAmount(b.amount || '10000');
      } else {
        alert('No booking found');
        navigate('/homepage');
      }
    } catch (err) {
      console.error('Error:', err);
      alert('Failed to load booking');
      navigate('/homepage');
    }
  };

  // Load Razorpay script
  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
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

  const handlePayment = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('access');
      const bookingIdToUse = bookingId || booking?.id;
      
      // Create Razorpay order
      const orderResponse = await axios.post(
        APP_API + 'create-razorpay-order/',
        { booking_id: bookingIdToUse },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (!orderResponse.data.success) {
        setError(orderResponse.data.error || 'Failed to create order');
        setLoading(false);
        return;
      }
      
      const orderData = orderResponse.data;
      
      // Load Razorpay
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        setError('Failed to load payment gateway');
        setLoading(false);
        return;
      }
      
      // Open Razorpay with test mode
      const options = {
        key: orderData.key_id,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'Hostel Management System',
        description: `Room ${booking?.room_number || bookingIdToUse}`,
        order_id: orderData.order_id,
        prefill: {
          name: orderData.student_name || '',
          email: orderData.student_email || '',
          contact: orderData.student_phone || ''
        },
        theme: {
          color: '#3399cc'
        },
        handler: async (response) => {
          // Payment successful - verify
          try {
            const verifyResponse = await axios.post(
              APP_API + 'verify-razorpay-payment/',
              {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature
              },
              { headers: { Authorization: `Bearer ${token}` } }
            );
            
            if (verifyResponse.data.success) {
              alert('Payment successful! Room booked.');
              navigate('/homepage');
            } else {
              alert('Payment verification failed');
            }
          } catch (err) {
            alert('Payment verification error');
          }
        }
      };
      
      // Open Razorpay checkout
      const rzp = window.Razorpay(options);
      rzp.open();
      
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/homepage');
  };

  if (!booking) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="max-w-md mx-auto bg-white rounded-xl shadow-lg p-6">
        <h1 className="text-2xl font-bold text-[#002147] mb-6">Payment</h1>
        
        <div className="bg-slate-50 p-4 rounded-lg mb-6">
          <p className="text-sm text-slate-500">Room</p>
          <p className="text-xl font-bold">{booking?.room_number || 'N/A'}</p>
        </div>
        
        <div className="bg-slate-50 p-4 rounded-lg mb-6">
          <p className="text-sm text-slate-500">Amount</p>
          <p className="text-2xl font-bold text-green-600">₹{amount}</p>
        </div>
        
        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4">
            {error}
          </div>
        )}
        
        <button
          onClick={handlePayment}
          disabled={loading}
          className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg"
        >
          {loading ? 'Processing...' : 'Pay ₹' + amount}
        </button>
        
        <button
          onClick={handleCancel}
          className="w-full mt-3 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-lg"
        >
          Cancel
        </button>
        
        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <p className="text-xs text-blue-800">
            <strong>Test Mode:</strong> Use card 4111 1111 1111 1111, any future expiry, any CVV
          </p>
        </div>
      </div>
    </div>
  );
};

export default Payment;