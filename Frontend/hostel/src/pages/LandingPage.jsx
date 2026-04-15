import React, { useState } from 'react';
import StudentLog from '../components/StudentLog';
import WardenLog from '../components/WardenLog';
import AdminLog from '../components/AdminLog';

function LandingPage() {
    // Start with 'null' so no form is visible initially
    const [view, setView] = useState(null);

    const btnStyle = "w-48 bg-black hover:bg-blue-700 text-white font-bold py-4 px-6 rounded-xl border-b-4 border-yellow-500 active:border-b-0 transition-all uppercase tracking-widest shadow-lg";

    return (
        <div className='flex flex-col items-center justify-center min-h-[60vh] p-10'>
            
            {/* Show this ONLY if no role is selected */}
            {!view && (
                <div className="flex flex-col items-center gap-10 animate-fadeIn">
                    <h2 className="text-3xl font-black text-slate-800 uppercase tracking-tighter">
                        Select Your <span className="text-blue-700">Role</span>
                    </h2>
                    <div className='flex flex-wrap justify-center gap-8'>
                        <button 
                            className={btnStyle} 
                            onClick={() => setView('Student')}
                        >
                            Student
                        </button>
                        <button 
                            className={btnStyle} 
                            onClick={() => setView('Warden')}
                        >
                            Warden
                        </button>
                        <button 
                            className={btnStyle} 
                            onClick={() => setView('Admin')}
                        >
                            Admin
                        </button>
                    </div>
                </div>
            )}

            {/* Show the Form and a "Back" button if a role IS selected */}
            {view && (
                <div className="w-full flex flex-col items-center gap-6 animate-slideUp">
                    {/* Dynamically render the component based on selected role */}
                    {view === 'Student' && <StudentLog />}
                    {view === 'Warden' && <WardenLog />}
                    {view === 'Admin' && <AdminLog />}

                    {/* Back button to return to role selection */}
                    <button 
                        onClick={() => setView(null)}
                        className="flex items-center gap-2 text-slate-400 font-bold hover:text-blue-700 transition-colors uppercase text-xs tracking-widest mt-4"
                    >
                        <svg 
                            xmlns="http://www.w3.org/2000/svg" 
                            fill="none" 
                            viewBox="0 0 24 24" 
                            strokeWidth={2.5} 
                            stroke="currentColor" 
                            className="w-4 h-4"
                        >
                            <path 
                                strokeLinecap="round" 
                                strokeLinejoin="round" 
                                d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" 
                            />
                        </svg>
                        Back to Roles
                    </button>
                </div>
            )}
        </div>
    );
}

export default LandingPage;