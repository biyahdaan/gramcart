
import React, { useState, useEffect } from 'react';
import { Language, User, Translations, UserRole, Translation } from './types';
import { CATEGORIES, MOCK_VENDORS, BANNERS } from './constants';
import { LanguageSwitch } from './components/LanguageSwitch';
import { VendorCard } from './components/VendorCard';

const API_BASE_URL = "https://biyahdaan.onrender.com";

const App: React.FC = () => {
  const [lang, setLang] = useState<Language>(Language.EN);
  const [user, setUser] = useState<User | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'vendor-setup' | null>('login');
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', password: '', role: UserRole.USER });
  const [vendorData, setVendorData] = useState({ businessName: '', category: 'tent', description: '', serviceArea: 25, price: 0 });
  
  const t = Translations[lang];

  useEffect(() => {
    const savedUser = localStorage.getItem('gramcart_user');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        setUser(parsed);
        setAuthMode(null);
      } catch (e) {
        localStorage.removeItem('gramcart_user');
      }
    }
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const endpoint = authMode === 'login' ? '/api/login' : '/api/register';
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setUser(data.user);
        localStorage.setItem('gramcart_user', JSON.stringify(data.user));
        localStorage.setItem('gramcart_token', data.token);
        
        if (data.user.role === UserRole.VENDOR && authMode === 'register') {
          setAuthMode('vendor-setup');
        } else {
          setAuthMode(null);
        }
      } else {
        alert(data.error || "Action failed.");
      }
    } catch (err) {
      alert("Cannot connect to server.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVendorRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      // Accessing _id as allowed by updated User interface in types.ts
      const userId = user?.id || user?._id;
      const response = await fetch(`${API_BASE_URL}/api/register-vendor`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('gramcart_token')}`
        },
        body: JSON.stringify({ ...vendorData, userId })
      });
      
      if (response.ok) {
        alert("Vendor Profile Created Successfully!");
        setAuthMode(null);
      } else {
        const data = await response.json();
        alert(data.error || "Profile setup failed.");
      }
    } catch (err) {
      alert("Error connecting to server.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('gramcart_user');
    localStorage.removeItem('gramcart_token');
    setUser(null);
    setAuthMode('login');
  };

  if (authMode === 'vendor-setup') {
    return (
      <div className="max-w-md mx-auto min-h-screen bg-purple-600 flex flex-col p-8 justify-center font-sans">
        <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl">
          <h1 className="text-2xl font-black text-purple-600 mb-2">Vendor Details</h1>
          <p className="text-gray-400 text-[10px] mb-6 font-black uppercase tracking-widest">Setup your rural business</p>
          <form onSubmit={handleVendorRegister} className="space-y-3">
            <input required type="text" placeholder="Business Name" className="w-full bg-gray-50 border p-4 rounded-2xl" onChange={e => setVendorData({...vendorData, businessName: e.target.value})} />
            <select className="w-full bg-gray-50 border p-4 rounded-2xl" onChange={e => setVendorData({...vendorData, category: e.target.value})}>
              <option value="tent">Tent House</option>
              <option value="dj">DJ & Sound</option>
              <option value="catering">Catering</option>
              <option value="electric">Lighting</option>
            </select>
            <textarea required placeholder="Description (Service Details)" className="w-full bg-gray-50 border p-4 rounded-2xl" onChange={e => setVendorData({...vendorData, description: e.target.value})} />
            <div className="flex gap-2">
               <input required type="number" placeholder="Area (KM)" className="w-1/2 bg-gray-50 border p-4 rounded-2xl" onChange={e => setVendorData({...vendorData, serviceArea: parseInt(e.target.value)})} />
               <input required type="number" placeholder="Base Price (₹)" className="w-1/2 bg-gray-50 border p-4 rounded-2xl" onChange={e => setVendorData({...vendorData, price: parseInt(e.target.value)})} />
            </div>
            <button disabled={isLoading} className="w-full bg-purple-600 text-white py-4 rounded-2xl font-black shadow-lg">
              {isLoading ? "Saving..." : "START SELLING"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (authMode && !user) {
    return (
      <div className="max-w-md mx-auto min-h-screen bg-blue-600 flex flex-col p-8 justify-center font-sans">
        <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl">
          <h1 className="text-3xl font-black text-blue-600 mb-2 italic">GramCart</h1>
          <p className="text-gray-400 text-[10px] mb-8 font-black uppercase tracking-widest">Rural Market {authMode.toUpperCase()}</p>
          
          <form onSubmit={handleAuth} className="space-y-4">
            {authMode === 'register' && (
              <>
                <input required type="text" placeholder="Full Name" className="w-full bg-gray-50 border border-gray-100 p-4 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500" onChange={e => setFormData({...formData, name: e.target.value})} />
                <div className="flex bg-gray-100 p-1 rounded-2xl mb-2">
                  <button type="button" onClick={() => setFormData({...formData, role: UserRole.USER})} className={`flex-1 py-2 rounded-xl text-xs font-black ${formData.role === UserRole.USER ? 'bg-white text-blue-600 shadow' : 'text-gray-400'}`}>USER</button>
                  <button type="button" onClick={() => setFormData({...formData, role: UserRole.VENDOR})} className={`flex-1 py-2 rounded-xl text-xs font-black ${formData.role === UserRole.VENDOR ? 'bg-white text-purple-600 shadow' : 'text-gray-400'}`}>VENDOR</button>
                </div>
              </>
            )}
            <input required type="email" placeholder="Email Address" className="w-full bg-gray-50 border border-gray-100 p-4 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500" onChange={e => setFormData({...formData, email: e.target.value})} />
            <input required type="password" placeholder="Password" className="w-full bg-gray-50 border border-gray-100 p-4 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500" onChange={e => setFormData({...formData, password: e.target.value})} />
            <button disabled={isLoading} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black shadow-lg active:scale-95 transition-all">
              {isLoading ? "Connecting..." : authMode.toUpperCase()}
            </button>
          </form>
          
          <button onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')} className="w-full mt-6 text-gray-400 text-[10px] font-black uppercase tracking-widest">
            {authMode === 'login' ? "Create New Account" : "Back to Login"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto min-h-screen bg-gray-50 pb-20 font-sans">
      <div className="bg-blue-600 p-6 rounded-b-[2.5rem] shadow-xl">
        <div className="flex justify-between items-center text-white mb-6">
          <div className="flex items-center gap-2">
            <i className="fas fa-tractor text-xl"></i>
            <h1 className="text-2xl font-black italic tracking-tighter">GramCart</h1>
          </div>
          <LanguageSwitch current={lang} onChange={setLang} />
        </div>
        <div className="relative">
          <input type="text" placeholder={t.searchPlaceholder} className="w-full p-4 pl-12 rounded-2xl shadow-inner outline-none text-sm" />
          <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-blue-600 opacity-50"></i>
        </div>
      </div>

      <div className="p-6">
        <h2 className="font-black text-gray-900 mb-5 flex items-center gap-2 text-lg">
           <div className="w-1 h-5 bg-blue-600 rounded-full"></div>
           {t.categories}
        </h2>
        <div className="grid grid-cols-4 gap-4">
          {CATEGORIES.map(cat => (
            <div key={cat.id} className="flex flex-col items-center gap-2">
              <div className={`${cat.color} w-16 h-16 rounded-3xl flex items-center justify-center text-2xl shadow-sm`}>
                <i className={`fas ${cat.icon}`}></i>
              </div>
              <span className="text-[10px] font-black text-gray-500 uppercase tracking-tighter text-center">
                {/* Translation type is now imported correctly above */}
                {lang === Language.HI ? t[cat.id as keyof Translation] || cat.name : cat.name}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="px-6 mb-8 flex gap-4 overflow-x-auto no-scrollbar">
        {BANNERS.map(b => (
          <div key={b.id} className={`${b.color} min-w-[80%] p-6 rounded-3xl text-white shadow-lg`}>
            <h3 className="font-black text-lg leading-tight">{b.text}</h3>
            <p className="text-[10px] mt-2 font-bold uppercase opacity-75">Limited Village Offer</p>
          </div>
        ))}
      </div>

      <div className="px-6">
        <div className="flex justify-between items-end mb-6">
          <h2 className="font-black text-gray-900 text-lg flex items-center gap-2">
             <div className="w-1 h-5 bg-blue-600 rounded-full"></div>
             {t.popularServices}
          </h2>
          <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-md">{t.nearby}</span>
        </div>
        <div className="space-y-6">
          {MOCK_VENDORS.map(v => (
            <VendorCard key={v.id} vendor={v} t={t} />
          ))}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/80 backdrop-blur-md h-20 flex items-center justify-around border-t border-gray-100 shadow-2xl z-50 px-8 rounded-t-3xl">
        <button className="text-blue-600"><i className="fas fa-home text-xl"></i></button>
        <button className="text-gray-300"><i className="fas fa-calendar-check text-xl"></i></button>
        <button onClick={handleLogout} className="text-gray-300"><i className="fas fa-sign-out-alt text-xl"></i></button>
      </div>
      
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};

export default App;