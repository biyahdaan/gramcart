
import React, { useState, useEffect } from 'react';
import { Language, User, Translations, UserRole, Translation } from './types';
import { CATEGORIES } from './constants';
import { LanguageSwitch } from './components/LanguageSwitch';

// IMPORTANT: Replace this with your actual Render backend URL if not hosting frontend and backend on the same domain.
const API_BASE_URL = "https://biyahdaan.onrender.com/api"; 

const App: React.FC = () => {
  const [lang, setLang] = useState<Language>(Language.EN);
  const [user, setUser] = useState<User | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [view, setView] = useState<'home' | 'vendor-dashboard' | 'bookings'>('home');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [authForm, setAuthForm] = useState({ email: '', password: '', name: '', role: 'user' });

  const t = Translations[lang];

  useEffect(() => {
    const saved = localStorage.getItem('gramcart_user');
    if (saved) {
      const parsedUser = JSON.parse(saved);
      setUser(parsedUser);
      if (parsedUser.role === 'vendor') setView('vendor-dashboard');
    }
    fetchData();
  }, []);

  const fetchData = async (cat: string = '') => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/search?cat=${cat}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (e) {
      console.error("Fetch Data Error:", e);
    } finally { setLoading(false); }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const endpoint = authMode === 'login' ? '/login' : '/register';
    
    try {
      console.log(`Attempting to connect to: ${API_BASE_URL}${endpoint}`);
      const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authForm)
      });
      
      const result = await res.json();
      
      if (res.ok) {
        localStorage.setItem('gramcart_user', JSON.stringify(result.user));
        localStorage.setItem('gramcart_token', result.token);
        setUser(result.user);
        if (result.user.role === 'vendor') setView('vendor-dashboard');
        else setView('home');
      } else {
        alert(result.error || "Authentication Failed. Please check your credentials.");
      }
    } catch (err) {
      console.error("Detailed Auth Error:", err);
      alert("SERVER CONNECTION ERROR: Backend is not responding. Please make sure " + API_BASE_URL + " is online.");
    } finally { setLoading(false); }
  };

  if (!user) {
    return (
      <div className="max-w-md mx-auto min-h-screen bg-blue-600 flex items-center justify-center p-6 font-sans">
        <div className="bg-white w-full p-8 rounded-[2.5rem] shadow-2xl">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-black text-blue-600 italic">GramCart</h1>
            <p className="text-gray-400 font-bold text-xs uppercase tracking-widest mt-2">Rural Marketplace</p>
          </div>
          
          <form onSubmit={handleAuth} className="space-y-4">
            {authMode === 'register' && (
              <input 
                placeholder="Full Name" 
                className="w-full bg-gray-50 p-4 rounded-2xl border-none outline-none ring-2 ring-gray-100 focus:ring-blue-500 transition-all text-gray-800"
                onChange={e => setAuthForm({...authForm, name: e.target.value})}
                required
              />
            )}
            <input 
              placeholder="Email" 
              type="email"
              className="w-full bg-gray-50 p-4 rounded-2xl border-none outline-none ring-2 ring-gray-100 focus:ring-blue-500 transition-all text-gray-800"
              onChange={e => setAuthForm({...authForm, email: e.target.value})}
              required
            />
            <input 
              placeholder="Password" 
              type="password"
              className="w-full bg-gray-50 p-4 rounded-2xl border-none outline-none ring-2 ring-gray-100 focus:ring-blue-500 transition-all text-gray-800"
              onChange={e => setAuthForm({...authForm, password: e.target.value})}
              required
            />
            
            {authMode === 'register' && (
              <div className="flex gap-4 p-2 bg-gray-50 rounded-2xl">
                <button 
                  type="button"
                  onClick={() => setAuthForm({...authForm, role: 'user'})}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${authForm.role === 'user' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400'}`}
                >Customer</button>
                <button 
                  type="button"
                  onClick={() => setAuthForm({...authForm, role: 'vendor'})}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${authForm.role === 'vendor' ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-400'}`}
                >Vendor</button>
              </div>
            )}

            <button 
              disabled={loading}
              className={`w-full py-4 rounded-2xl font-black text-white shadow-xl transform active:scale-95 transition-all ${loading ? 'opacity-50' : ''} ${authForm.role === 'vendor' ? 'bg-purple-600' : 'bg-blue-600'}`}
            >
              {loading ? <i className="fas fa-circle-notch fa-spin"></i> : (authMode === 'login' ? 'LOGIN' : 'CREATE ACCOUNT')}
            </button>
          </form>

          <p 
            className="text-center mt-6 text-xs font-bold text-gray-400 uppercase cursor-pointer hover:text-blue-600"
            onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
          >
            {authMode === 'login' ? "New here? Sign Up" : "Already have an account? Login"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto min-h-screen bg-gray-50 pb-24 font-sans">
      <header className={`p-6 rounded-b-[2.5rem] shadow-xl text-white transition-colors duration-500 ${view === 'vendor-dashboard' ? 'bg-purple-600' : 'bg-blue-600'}`}>
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-black italic">GramCart</h1>
          <LanguageSwitch current={lang} onChange={setLang} />
        </div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar py-2">
          <button onClick={() => fetchData('')} className="bg-white/20 px-4 py-2 rounded-full whitespace-nowrap text-[10px] font-bold uppercase">All</button>
          {CATEGORIES.map(c => (
            <button key={c.id} onClick={() => fetchData(c.id)} className="bg-white/20 px-4 py-2 rounded-full whitespace-nowrap text-[10px] font-bold uppercase">
              {lang === Language.HI ? t[c.id as keyof Translation] || c.name : c.name}
            </button>
          ))}
        </div>
      </header>

      <main className="p-6">
        {loading && <div className="text-center py-10"><i className="fas fa-spinner fa-spin text-blue-600 text-2xl"></i></div>}
        
        {view === 'home' && (
          <div className="space-y-6">
            {data.length === 0 && !loading && (
              <div className="text-center py-20 bg-white rounded-[2rem] border border-dashed border-gray-200">
                <i className="fas fa-store-slash text-4xl text-gray-200 mb-4"></i>
                <p className="text-gray-400 font-bold text-sm uppercase">No Vendors Found Nearby</p>
              </div>
            )}
            {data.map(vendor => (
              <div key={vendor._id} className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100 p-5">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-black text-gray-800 text-lg flex items-center gap-2">
                      {vendor.businessName}
                      {vendor.isVerified && <i className="fas fa-check-circle text-blue-500 text-sm"></i>}
                    </h3>
                    <div className="flex items-center gap-1 text-xs text-green-600 font-bold">
                      <i className="fas fa-star"></i> {vendor.rating || 5}
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  {vendor.services?.length > 0 ? (
                    vendor.services.map((s: any) => (
                      <div key={s._id} className="flex justify-between items-center bg-gray-50 p-3 rounded-2xl">
                        <span className="text-xs font-bold text-gray-700">{s.title || s.category.toUpperCase()}</span>
                        <span className="text-xs font-black text-blue-600">₹{s.pricePerDay}/day</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-[10px] text-gray-400 italic">No services listed yet</p>
                  )}
                </div>

                <button className="w-full mt-5 bg-blue-600 text-white py-4 rounded-2xl font-black text-xs uppercase shadow-lg active:scale-95 transition-all">
                  Book Now
                </button>
              </div>
            ))}
          </div>
        )}

        {view === 'vendor-dashboard' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="bg-purple-700 text-white p-6 rounded-[2rem] shadow-xl">
              <p className="text-xs font-bold opacity-60 uppercase">Business Dashboard</p>
              <h2 className="text-2xl font-black mt-1">Hello, {user.name}</h2>
              <div className="mt-4 grid grid-cols-2 gap-4">
                <div className="bg-white/10 p-4 rounded-2xl">
                  <p className="text-[10px] font-bold">Today's Orders</p>
                  <p className="text-xl font-black">0</p>
                </div>
                <div className="bg-white/10 p-4 rounded-2xl">
                  <p className="text-[10px] font-bold">Total Earnings</p>
                  <p className="text-xl font-black">₹0</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 text-center">
               <h3 className="font-black text-gray-800 mb-2 text-sm uppercase">Quick Setup</h3>
               <p className="text-xs text-gray-400 mb-6">Start by adding your services so customers can find you.</p>
               <button className="w-full bg-purple-50 border-2 border-dashed border-purple-200 py-6 rounded-[2rem] text-xs font-black text-purple-400 hover:bg-purple-100 transition-all">
                 <i className="fas fa-plus-circle mb-2 text-xl block"></i>
                 ADD YOUR FIRST SERVICE
               </button>
            </div>
          </div>
        )}
      </main>

      {/* Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/90 backdrop-blur-md h-20 flex items-center justify-around border-t shadow-2xl z-50 rounded-t-[2.5rem] px-8">
        <button onClick={() => setView('home')} className={`p-3 rounded-2xl transition-all ${view === 'home' ? 'text-blue-600 bg-blue-50' : 'text-gray-300'}`}>
          <i className="fas fa-home text-xl"></i>
        </button>
        <button onClick={() => setView('bookings')} className={`p-3 rounded-2xl transition-all ${view === 'bookings' ? 'text-blue-600 bg-blue-50' : 'text-gray-300'}`}>
          <i className="fas fa-calendar-check text-xl"></i>
        </button>
        {user.role === 'vendor' && (
          <button onClick={() => setView('vendor-dashboard')} className={`p-3 rounded-2xl transition-all ${view === 'vendor-dashboard' ? 'text-purple-600 bg-purple-50' : 'text-gray-300'}`}>
            <i className="fas fa-store text-xl"></i>
          </button>
        )}
        <button onClick={() => { localStorage.clear(); setUser(null); }} className="p-3 text-red-300 hover:text-red-500">
          <i className="fas fa-power-off text-xl"></i>
        </button>
      </nav>

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fadeIn { animation: fadeIn 0.4s ease-out; }
      `}</style>
    </div>
  );
};

export default App;
