
import React, { useState, useEffect } from 'react';
import { Language, User, Translations, UserRole, Translation } from './types';
import { CATEGORIES } from './constants';
import { LanguageSwitch } from './components/LanguageSwitch';

const API_BASE_URL = "https://biyahdaan.onrender.com";

const App: React.FC = () => {
  const [lang, setLang] = useState<Language>(Language.EN);
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<'home' | 'vendor-dashboard' | 'bookings'>('home');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const t = Translations[lang];

  useEffect(() => {
    fetchData();
    const saved = localStorage.getItem('gramcart_user');
    if (saved) setUser(JSON.parse(saved));
  }, []);

  const fetchData = async (cat: string = '') => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/search?cat=${cat}`);
      if (res.ok) setData(await res.json());
    } catch (e) {} finally { setLoading(false); }
  };

  return (
    <div className="max-w-md mx-auto min-h-screen bg-gray-50 pb-24 font-sans">
      <header className={`p-6 rounded-b-[2.5rem] shadow-xl text-white ${view === 'vendor-dashboard' ? 'bg-purple-600' : 'bg-blue-600'}`}>
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-black italic">GramCart</h1>
          <LanguageSwitch current={lang} onChange={setLang} />
        </div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar py-2">
          {CATEGORIES.map(c => (
            <button key={c.id} onClick={() => fetchData(c.id)} className="bg-white/20 px-4 py-2 rounded-full whitespace-nowrap text-[10px] font-bold uppercase">
              {lang === Language.HI ? t[c.id as keyof Translation] || c.name : c.name}
            </button>
          ))}
        </div>
      </header>

      <main className="p-6">
        {view === 'home' && (
          <div className="space-y-6">
            {data.map(vendor => (
              <div key={vendor._id} className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100 p-5">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-black text-gray-800 text-lg flex items-center gap-2">
                      {vendor.businessName}
                      {vendor.isVerified && <i className="fas fa-check-circle text-blue-500 text-sm"></i>}
                    </h3>
                    <div className="flex items-center gap-1 text-xs text-green-600 font-bold">
                      <i className="fas fa-star"></i> {vendor.rating} ({vendor.reviewsCount} reviews)
                    </div>
                  </div>
                  <span className="text-[10px] font-black bg-gray-100 px-2 py-1 rounded text-gray-400">2.4 KM</span>
                </div>

                {/* Combos / Shaadi Packages */}
                {vendor.combos?.length > 0 && (
                  <div className="mb-4 space-y-2">
                    <p className="text-[10px] font-black text-purple-600 uppercase">Special Wedding Packages</p>
                    {vendor.combos.map((combo: any) => (
                      <div key={combo._id} className="bg-purple-50 p-3 rounded-2xl border border-purple-100 flex justify-between items-center">
                        <div>
                          <p className="text-xs font-black text-purple-900">{combo.title}</p>
                          <p className="text-[9px] text-purple-400 font-bold line-through">₹{combo.originalPrice}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-black text-purple-600">₹{combo.discountPrice}</p>
                          <span className="text-[8px] bg-purple-600 text-white px-1 rounded font-bold uppercase">VALUE DEAL</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Individual Services */}
                <div className="space-y-3">
                  <p className="text-[10px] font-black text-gray-400 uppercase">Individual Services</p>
                  {vendor.services?.map((s: any) => (
                    <div key={s._id} className="flex justify-between items-center bg-gray-50 p-3 rounded-2xl">
                      <span className="text-xs font-bold text-gray-700">{s.title || s.category.toUpperCase()}</span>
                      <span className="text-xs font-black text-blue-600">₹{s.pricePerDay}/day</span>
                    </div>
                  ))}
                </div>

                <button className="w-full mt-5 bg-blue-600 text-white py-4 rounded-2xl font-black text-xs uppercase shadow-lg active:scale-95 transition-all">
                  Book Shaadi Package
                </button>
              </div>
            ))}
          </div>
        )}

        {view === 'vendor-dashboard' && (
          <div className="space-y-6">
            <div className="bg-purple-700 text-white p-6 rounded-[2rem] shadow-xl">
              <p className="text-xs font-bold opacity-60 uppercase">Business Dashboard</p>
              <h2 className="text-2xl font-black mt-1">Manage Services</h2>
              <div className="mt-4 grid grid-cols-2 gap-4">
                <div className="bg-white/10 p-4 rounded-2xl">
                  <p className="text-[10px] font-bold">Total Orders</p>
                  <p className="text-xl font-black">24</p>
                </div>
                <div className="bg-white/10 p-4 rounded-2xl">
                  <p className="text-[10px] font-bold">Earnings</p>
                  <p className="text-xl font-black">₹84,200</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100">
               <h3 className="font-black text-gray-800 mb-4">Inventory & Services</h3>
               <button className="w-full bg-gray-50 border-2 border-dashed border-gray-200 py-4 rounded-2xl text-xs font-bold text-gray-400">
                 + ADD NEW SERVICE (Tent, DJ, etc)
               </button>
            </div>

            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100">
               <h3 className="font-black text-gray-800 mb-4">Combo Offer (Shaadi Package)</h3>
               <div className="space-y-3">
                 <input placeholder="Package Name" className="w-full bg-gray-50 p-4 rounded-xl text-sm outline-none" />
                 <input placeholder="Discount Price (₹)" className="w-full bg-gray-50 p-4 rounded-xl text-sm outline-none" />
                 <button className="w-full bg-purple-600 text-white py-4 rounded-xl font-black text-xs uppercase">Create Value Deal</button>
               </div>
            </div>
          </div>
        )}
      </main>

      {/* Persistent Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/90 backdrop-blur-md h-20 flex items-center justify-around border-t shadow-2xl z-50 rounded-t-3xl px-8">
        <button onClick={() => setView('home')} className={view === 'home' ? 'text-blue-600' : 'text-gray-300'}>
          <i className="fas fa-search text-xl"></i>
        </button>
        <button onClick={() => setView('bookings')} className={view === 'bookings' ? 'text-blue-600' : 'text-gray-300'}>
          <i className="fas fa-calendar-alt text-xl"></i>
        </button>
        <button onClick={() => setView('vendor-dashboard')} className={view === 'vendor-dashboard' ? 'text-purple-600' : 'text-gray-300'}>
          <i className="fas fa-store text-xl"></i>
        </button>
      </nav>

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};

export default App;
