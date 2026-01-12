
import React, { useState, useEffect } from 'react';
import { Language, UserRole, User, Translation, Translations, Vendor, Booking } from './types';
import { CATEGORIES, MOCK_VENDORS, BANNERS } from './constants';
import { LanguageSwitch } from './components/LanguageSwitch';
import { VendorCard } from './components/VendorCard';

const App: React.FC = () => {
  const [lang, setLang] = useState<Language>(Language.EN);
  const [user, setUser] = useState<User | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'register' | null>('login');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('home');
  const [bookings, setBookings] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const t = Translations[lang];

  // Real API Call Function
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const endpoint = authMode === 'login' ? '/api/login' : '/api/register';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      
      if (data.user) {
        setUser(data.user);
        setAuthMode(null);
        localStorage.setItem('user', JSON.stringify(data.user));
      } else {
        alert(data.error || "Kuch galat hua!");
      }
    } catch (err) {
      alert("Server connect nahi ho pa raha. Vercel deploy karein!");
    } finally {
      setIsLoading(false);
    }
  };

  if (authMode && !user) {
    return (
      <div className="max-w-md mx-auto min-h-screen bg-blue-600 flex flex-col p-8 justify-center">
        <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl">
          <h1 className="text-3xl font-black text-blue-600 mb-2 italic">GramCart</h1>
          <p className="text-gray-400 text-xs mb-8 font-bold uppercase tracking-widest">Rural Market Login</p>
          
          <form onSubmit={handleAuth} className="space-y-4">
            {authMode === 'register' && (
              <input required type="text" placeholder="Apna Naam" className="w-full bg-gray-50 border p-4 rounded-2xl outline-none" onChange={e => setFormData({...formData, name: e.target.value})} />
            )}
            <input required type="email" placeholder="Email Address" className="w-full bg-gray-50 border p-4 rounded-2xl outline-none" onChange={e => setFormData({...formData, email: e.target.value})} />
            <input required type="password" placeholder="Password" className="w-full bg-gray-50 border p-4 rounded-2xl outline-none" onChange={e => setFormData({...formData, password: e.target.value})} />
            <button className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black shadow-lg">
              {isLoading ? "Connecting to DB..." : authMode.toUpperCase()}
            </button>
          </form>
          <button onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')} className="w-full mt-6 text-gray-400 text-xs font-bold uppercase">
            {authMode === 'login' ? "Naya Account Banayein" : "Pehle se account hai? Login"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-blue-600 p-6 rounded-b-[2rem] shadow-xl">
        <div className="flex justify-between items-center text-white mb-4">
          <h1 className="text-2xl font-black italic">GramCart</h1>
          <LanguageSwitch current={lang} onChange={setLang} />
        </div>
        <div className="relative">
          <input type="text" placeholder={t.searchPlaceholder} className="w-full p-4 rounded-2xl shadow-inner outline-none text-sm" />
          <i className="fas fa-search absolute right-4 top-4 text-blue-600"></i>
        </div>
      </div>

      {/* Categories */}
      <div className="p-6">
        <h2 className="font-black text-gray-800 mb-4">{t.categories}</h2>
        <div className="grid grid-cols-4 gap-4">
          {CATEGORIES.map(cat => (
            <div key={cat.id} className="flex flex-col items-center gap-1">
              <div className={`${cat.color} w-14 h-14 rounded-2xl flex items-center justify-center text-xl`}>
                <i className={`fas ${cat.icon}`}></i>
              </div>
              <span className="text-[10px] font-bold text-gray-500">{cat.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Vendors */}
      <div className="px-6">
        <h2 className="font-black text-gray-800 mb-4">{t.popularServices}</h2>
        <div className="space-y-4">
          {MOCK_VENDORS.map(v => (
            <VendorCard key={v.id} vendor={v} t={t} />
          ))}
        </div>
      </div>

      {/* Navbar */}
      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white h-16 flex items-center justify-around border-t shadow-2xl">
        <i className="fas fa-home text-blue-600"></i>
        <i className="fas fa-calendar-alt text-gray-300"></i>
        <i className="fas fa-user text-gray-300" onClick={() => setUser(null)}></i>
      </div>
    </div>
  );
};

export default App;
