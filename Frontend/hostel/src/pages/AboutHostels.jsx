import React from 'react';

const rules = [
  {
    title: "ADMISSION RULES",
    items: [
      "Admission will be given only for a period of one academic year at a time.",
      "Readmission will be given only on settlement of all previous arrears."
    ]
  },
  {
    title: "ATTENDANCE & MESS",
    items: [
      "If a Boarder is absent continuously for a week to the mess without taking permission from the Chief Warden, his hostel admission stands cancelled.",
      "Mess charges should be paid regularly by 15th of every month.",
      "Remission of mess charges will be allowed only, if written permission of concerned Chief Warden is obtained for being absent on Medical grounds and out station project work."
    ]
  },
  {
    title: "ROOM RULES",
    items: [
      "All Outgoing students should hand over their rooms to the Hostel Office.",
      "Unauthorized change of Block, Room or Mess are treated as misconduct.",
      "Rooms and Mess Cards are not transferable.",
      "Guests/Non-boarders including blood relations are not allowed."
    ]
  },
  {
    title: "PROPERTY & SAFETY",
    items: [
      "The Hostel Office should be informed immediately if there is any change of address for Communications.",
      "The inmates are solely responsible for the safe keeping of their belongings and the furniture and fittings provided in the rooms. All the inmates are advised not to keep any valuables in the rooms.",
      "If any Hostel property issued to the students for their use or enjoyment is lost or damaged, the cost of replacement or repair will be recovered from the concerned students.",
      "Members should not indulge in any activity which may cause inconvenience, embarrassment or disturbance to or hurt the feeling of others."
    ]
  },
  {
    title: "MISCONDUCT",
    items: [
      "If any student found involved in Ragging / any other misconduct his admission will be cancelled.",
      "Rs. 100/- may be charged for Duplicate I.D. Card."
    ]
  },
  {
    title: "TIMINGS",
    items: [
      "All the 1st year students are informed that, they have to be present in the block by 7.30 P.M. (Gate closed) and morning main gate will be opened by 6 A.M.",
      "For remaining all the students except 1st year students the main gate will be closed by 11 P.M. and will be opened by 6.00 A.M.",
      "SS 5 AMP Power Point provided for charging Cell Phone and Laptop only.",
      "Admission to the Hostels will be cancelled or imposed a fine of Rs. 10,000/- or both if, the inmate is found, misusing of power supply like using heaters and cooking in the Hostel Room etc."
    ]
  }
];

const antiRagging = [
  "Cancellation of Admission",
  "Suspension from attending classes",
  "Withholding / withdrawing scholarships, fellowship and other benefits",
  "Debarring from appearing for any Test / Examination or other evaluation process",
  "Withholding Results",
  "Debarring from Representing the Institute in any National or International Meet, Tournament, Youth Festival etc.",
  "Suspension, Expulsion from the Hostel",
  "Rusticating from the Institute for periods varying from 1 to 2 Academic Years",
  "Expulsion from the Institution and Consequent Debarring from Admission to any other Institution",
  "Fine up to Rs. 50,000/-",
  "Rigorous Imprisonment up to three years (by Court of Law), etc."
];

const generalUndertaking = [
  "I will not MISUSE common facilities including Electricity and Water",
  "I will use my own BUCKET & MUG for bathing and washing etc.",
  "Due to COVID-19, I will arrange / maintain my own PLATE, WATER GLASS & COFFEE GLASS.",
  "I WILL NOT WASTE THE FOOD on my plate, what I have been given / taken.",
  "I will maintain HYGIENE and encourage others to do the same in hostel rooms / premises.",
  "I will support and participate in the 'SWACH BHARAT' programme."
];

function AboutHostels() {
  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-[#002147] text-center mb-2">
          RULES AND REGULATIONS
        </h1>
        <p className="text-center text-slate-500 mb-8">
          AU SELF SUPPORTED HOSTELS
        </p>

        {/* Main Rules */}
        <div className="space-y-6 mb-10">
          {rules.map((section, index) => (
            <div key={index} className="bg-white rounded-xl shadow-md overflow-hidden">
              <div className="bg-[#002147] px-6 py-3">
                <h2 className="text-lg font-bold text-white">{section.title}</h2>
              </div>
              <div className="p-6">
                <ul className="space-y-3">
                  {section.items.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <span className="text-yellow-500 mt-1">•</span>
                      <span className="text-slate-700">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>

        {/* Anti-Ragging Policy */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden mb-10">
          <div className="bg-red-700 px-6 py-3">
            <h2 className="text-lg font-bold text-white">ANNEXURE: UNDERTAKING & ANTI-RAGGING POLICY</h2>
          </div>
          <div className="p-6">
            <p className="text-slate-700 mb-4">
              By continuing, the student undertakes that they are aware of the system of punishment in case of ragging other students. If involved in any manner, the student is liable for any punishment, including:
            </p>
            <ul className="space-y-2">
              {antiRagging.map((item, index) => (
                <li key={index} className="flex items-start gap-3">
                  <span className="text-red-600 mt-1">●</span>
                  <span className="text-slate-700">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* General Undertaking */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="bg-green-700 px-6 py-3">
            <h2 className="text-lg font-bold text-white">GENERAL UNDERTAKING</h2>
          </div>
          <div className="p-6">
            <p className="text-slate-700 mb-4">
              Additionally, the student agrees to the following:
            </p>
            <ul className="space-y-2">
              {generalUndertaking.map((item, index) => (
                <li key={index} className="flex items-start gap-3">
                  <span className="text-green-600 mt-1">✓</span>
                  <span className="text-slate-700">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <p className="text-center text-slate-400 text-sm mt-8">
          All students must adhere to these rules and regulations
        </p>
      </div>
    </div>
  );
}

export default AboutHostels;