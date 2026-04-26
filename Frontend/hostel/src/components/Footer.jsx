import React from 'react';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-[#002147] text-white py-4 mt-auto border-t-2 border-slate-700">
      <div className="max-w-6xl mx-auto px-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-center">
        &copy; {currentYear} AU Hostels. All Rights Reserved.
      </div>
    </footer>
  );
};

export default Footer;