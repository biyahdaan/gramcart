
import React, { useState, useEffect } from 'react';
import { Language, User, Translations, UserRole, Translation } from './types';
import { CATEGORIES } from './constants';
import { LanguageSwitch } from './components/LanguageSwitch';

const API_BASE_URL = "https://biyahdaan.onrender.com/api"; 

const App: React.FC = () => {
  const [lang, setLang] = useState<Language>(Language.EN);
  const [user, setUser] = useState<User | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [view, setView] = useState<'home' | 'vendor-dashboard' | 'bookings'>('home');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Forms
  const [authForm, setAuthForm] = useState({ identifier: '', email: '', mobile: '', password: '', name: '', role: 'user' });
  const [serviceForm, setServiceForm] = useState({
    title: '', category: 'tent', rate: '', unitType: 'Per Day', duration: '1 Day', itemsIncluded: ''
  });

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
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const endpoint = authMode === 'login' ? '/login' : '/register';
    const payload = authMode === 'login' 
      ? { identifier: authForm.identifier, password: authForm.password } 
      : { name: authForm.name, email: authForm.email, mobile: authForm.mobile, password: authForm.password, role: authForm.role };
    
    try {
      const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await res.json();
      if (res.ok) {
        localStorage.setItem('gramcart_user', JSON.stringify(result.user));
        setUser(result.user);
        setView(result.user.role === 'vendor' ? 'vendor-dashboard' : 'home');
      } else { alert(result.error); }
    } catch (err) { alert("Server Connection Error"); } finally { setLoading(false); }
  };

  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const vendorData = data.find(v => v.userId === user?._id || v._id === user?.id);
      const res = await fetch(`${API_BASE_URL}/services`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...serviceForm,
          vendorId: vendorData?._id,
          itemsIncluded: serviceForm.itemsIncluded.split(',').map(i => i.trim()),
          rate: Number(serviceForm.rate)
        })
      });
      if (res.ok) {
        alert("Service Added Successfully!");
        setServiceForm({ title: '', category: 'tent', rate: '', unitType: 'Per Day', duration: '1 Day', itemsIncluded: '' });
        fetchData();
      }
    } catch (e) { alert("Error adding service"); } finally { setLoading(false); }
  };

  if (!user) {
    return (
      <div className="max-w-md mx-auto min-h-screen bg-blue-600 flex items-center justify-center p-6 font-sans">
        <div className="bg-white w-full p-8 rounded-[2.5rem] shadow-2xl">
          <div className="text-center mb-6">
            <h1 className="text-4xl font-black text-blue-600 italic">GramCart</h1>
            <p className="text-gray-400 font-bold text-[10px] uppercase tracking-[0.2em] mt-2">Verified Rural Marketplace</p>
          </div>
          
          <form onSubmit={handleAuth} className="space-y-3">
            {authMode === 'register' ? (
              <>
                <input placeholder="Full Name" className="w-full bg-gray-50 p-4 rounded-2xl ring-2 ring-gray-100 outline-none focus:ring-blue-500"
                  onChange={e => setAuthForm({...authForm, name: e.target.value})} required />
                <input placeholder="Email Address" type="email" className="w-full bg-gray-50 p-4 rounded-2xl ring-2 ring-gray-100 outline-none focus:ring-blue-500"
                  onChange={e => setAuthForm({...authForm, email: e.target.value})} required />
                <input placeholder="Mobile Number" type="tel" className="w-full bg-gray-50 p-4 rounded-2xl ring-2 ring-gray-100 outline-none focus:ring-blue-500"
                  onChange={e => setAuthForm({...authForm, mobile: e.target.value})} required />
              </>
            ) : (
              <input placeholder="Email or Mobile" className="w-full bg-gray-50 p-4 rounded-2xl ring-2 ring-gray-100 outline-none focus:ring-blue-500"
                onChange={e => setAuthForm({...authForm, identifier: e.target.value})} required />
            )}
            <input placeholder="Password" type="password" className="w-full bg-gray-50 p-4 rounded-2xl ring-2 ring-gray-100 outline-none focus:ring-blue-500"
              onChange={e => setAuthForm({...authForm, password: e.target.value})} required />
            
            {authMode === 'register' && (
              <div className="flex gap-2 p-1 bg-gray-50 rounded-2xl">
                {['user', 'vendor'].map(r => (
                  <button key={r} type="button" onClick={() => setAuthForm({...authForm, role: r})}
                    className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${authForm.role === r ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400'}`}>
                    {r}
                  </button>
                ))}
              </div>
            )}

            <button disabled={loading} className="w-full py-4 rounded-2xl font-black text-white bg-blue-600 shadow-xl active:scale-95 transition-all">
              {loading ? '...' : (authMode === 'login' ? 'LOGIN' : 'CREATE ACCOUNT')}
            </button>
          </form>

          <p className="text-center mt-6 text-[10px] font-black text-gray-400 uppercase cursor-pointer" onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}>
            {authMode === 'login' ? "New here? Join GramCart" : "Back to Login"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto min-h-screen bg-gray-50 pb-24 font-sans">
      <header className={`p-6 rounded-b-[2.5rem] shadow-xl text-white ${view === 'vendor-dashboard' ? 'bg-purple-600' : 'bg-blue-600'}`}>
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-black italic">GramCart</h1>
          <LanguageSwitch current={lang} onChange={setLang} />
        </div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar py-2">
          <button onClick={() => fetchData('')} className="bg-white/20 px-4 py-2 rounded-full whitespace-nowrap text-[10px] font-bold">All</button>
          {CATEGORIES.map(c => (
            <button key={c.id} onClick={() => fetchData(c.id)} className="bg-white/20 px-4 py-2 rounded-full whitespace-nowrap text-[10px] font-bold uppercase">{c.name}</button>
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
                      {vendor.businessName} {vendor.isVerified && <i className="fas fa-check-circle text-blue-500 text-xs"></i>}
                    </h3>
                    <span className="text-[10px] text-gray-400 font-bold uppercase">Nearby Vendor</span>
                  </div>
                  <div className="bg-green-50 text-green-600 px-3 py-1 rounded-full text-[10px] font-black">
                    <i className="fas fa-star"></i> {vendor.rating}
                  </div>
                </div>

                <div className="space-y-3">
                  {vendor.services?.map((s: any) => (
                    <div key={s._id} className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-black text-gray-700">{s.title || s.category.toUpperCase()}</span>
                        <span className="text-sm font-black text-blue-600">₹{s.rate} <span className="text-[10px] text-gray-400">/{s.unitType}</span></span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <span className="text-[9px] bg-white px-2 py-1 rounded-md text-gray-500 font-bold"><i className="fas fa-clock mr-1"></i>{s.duration}</span>
                        {s.itemsIncluded?.map((item: string, idx: number) => (
                          <span key={idx} className="text-[9px] bg-blue-50 px-2 py-1 rounded-md text-blue-600 font-bold border border-blue-100">{item}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <button className="w-full mt-4 bg-blue-600 text-white py-4 rounded-2xl font-black text-[10px] uppercase shadow-lg shadow-blue-200">Book Full Package</button>
              </div>
            ))}
          </div>
        )}

        {view === 'vendor-dashboard' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100">
              <h3 className="text-xs font-black text-purple-600 uppercase mb-4 tracking-widest">Add New Service</h3>
              <form onSubmit={handleAddService} className="space-y-3">
                <input placeholder="Service Title (e.g. Wedding Tent)" className="w-full bg-gray-50 p-4 rounded-2xl outline-none"
                  value={serviceForm.title} onChange={e => setServiceForm({...serviceForm, title: e.target.value})} required />
                
                <div className="grid grid-cols-2 gap-3">
                  <select className="bg-gray-50 p-4 rounded-2xl outline-none text-xs font-bold" value={serviceForm.category}
                    onChange={e => setServiceForm({...serviceForm, category: e.target.value})}>
                    {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <select className="bg-gray-50 p-4 rounded-2xl outline-none text-xs font-bold" value={serviceForm.unitType}
                    onChange={e => setServiceForm({...serviceForm, unitType: e.target.value})}>
                    <option>Per Day</option><option>Per Piece</option><option>Per Sq Ft</option><option>Per Meter</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <input placeholder="Rate (Rs)" type="number" className="bg-gray-50 p-4 rounded-2xl outline-none"
                    value={serviceForm.rate} onChange={e => setServiceForm({...serviceForm, rate: e.target.value})} required />
                  <input placeholder="Duration (e.g. 2 Days)" className="bg-gray-50 p-4 rounded-2xl outline-none"
                    value={serviceForm.duration} onChange={e => setServiceForm({...serviceForm, duration: e.target.value})} required />
                </div>

                <textarea placeholder="Items Included (Chairs, Stage, Lights - separate by comma)" className="w-full bg-gray-50 p-4 rounded-2xl outline-none h-24"
                  value={serviceForm.itemsIncluded} onChange={e => setServiceForm({...serviceForm, itemsIncluded: e.target.value})} required />

                <button disabled={loading} className="w-full bg-purple-600 text-white py-4 rounded-2xl font-black text-[10px] uppercase shadow-xl">
                  {loading ? 'SAVING...' : 'PUBLISH SERVICE'}
                </button>
              </form>
            </div>
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/90 backdrop-blur-md h-20 flex items-center justify-around border-t shadow-2xl z-50 rounded-t-[2.5rem] px-8">
        <button onClick={() => setView('home')} className={`p-3 rounded-2xl transition-all ${view === 'home' ? 'text-blue-600 bg-blue-50' : 'text-gray-300'}`}><i className="fas fa-home text-xl"></i></button>
        {user.role === 'vendor' && (
          <button onClick={() => setView('vendor-dashboard')} className={`p-3 rounded-2xl transition-all ${view === 'vendor-dashboard' ? 'text-purple-600 bg-purple-50' : 'text-gray-300'}`}><i className="fas fa-store text-xl"></i></button>
        )}
        <button onClick={() => { localStorage.clear(); setUser(null); }} className="p-3 text-red-400"><i className="fas fa-power-off text-xl"></i></button>
      </nav>
    </div>
  );
};

export default App;
