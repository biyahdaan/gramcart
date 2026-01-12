
import React, { useState, useEffect } from 'react';
import { Language, User, Translations, UserRole, Translation, Vendor as VendorType, Booking } from './types';
import { CATEGORIES, BANNERS } from './constants';
import { LanguageSwitch } from './components/LanguageSwitch';
import { VendorCard } from './components/VendorCard';

const API_BASE_URL = "https://biyahdaan.onrender.com";

const App: React.FC = () => {
  const [lang, setLang] = useState<Language>(Language.EN);
  const [user, setUser] = useState<User | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'vendor-setup' | null>('login');
  const [view, setView] = useState<'home' | 'bookings' | 'vendor-dashboard'>('home');
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [vendors, setVendors] = useState<VendorType[]>([]);
  const [myBookings, setMyBookings] = useState<Booking[]>([]);
  const [userCoords, setUserCoords] = useState<{ lat: number, lng: number } | null>(null);
  
  // Vendor Dashboard State
  const [vendorStats, setVendorStats] = useState<any>(null);
  const [otpInputs, setOtpInputs] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({ name: '', email: '', password: '', role: UserRole.USER });
  const [vendorData, setVendorData] = useState({ 
    businessName: '', category: 'tent', description: '', serviceArea: 25, price: 0, lat: 0, lng: 0
  });
  
  const t = Translations[lang];

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setUserCoords(coords);
          fetchVendors('', coords);
          setVendorData(prev => ({ ...prev, lat: coords.lat, lng: coords.lng }));
        },
        () => fetchVendors('')
      );
    } else fetchVendors('');

    const savedUser = localStorage.getItem('gramcart_user');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        setUser(parsed);
        setAuthMode(null);
        if (parsed.role === UserRole.VENDOR) setView('vendor-dashboard');
      } catch (e) {
        localStorage.removeItem('gramcart_user');
      }
    }
  }, []);

  const fetchVendors = async (query: string, coords: { lat: number, lng: number } | null = userCoords) => {
    try {
      let url = `${API_BASE_URL}/api/search-vendors?q=${encodeURIComponent(query)}`;
      if (coords) url += `&lat=${coords.lat}&lng=${coords.lng}`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setVendors(data.map((v: any) => ({
          id: v._id, name: v.businessName, category: v.category, rating: v.rating,
          price: v.price, distance: 0, image: v.image, verified: v.verified, description: v.description
        })));
      }
    } catch (err) {}
  };

  const fetchVendorDashboard = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/vendor/dashboard`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('gramcart_token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        setVendorStats(data);
      }
    } catch (err) {} finally { setIsLoading(false); }
  };

  const handleCompleteBooking = async (bookingId: string) => {
    const otp = otpInputs[bookingId];
    if (!otp) return alert("Please enter OTP from customer");
    try {
      const response = await fetch(`${API_BASE_URL}/api/vendor/complete-booking`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('gramcart_token')}`
        },
        body: JSON.stringify({ bookingId, otp })
      });
      if (response.ok) {
        alert("Payment Released! Booking Completed.");
        fetchVendorDashboard();
      } else {
        const d = await response.json();
        alert(d.error || "Verification failed");
      }
    } catch (err) {}
  };

  const handleBook = async (vendor: VendorType) => {
    if (!user) return setAuthMode('login');
    if (!confirm(`Book ${vendor.name} for ₹${vendor.price}?`)) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/book-service`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('gramcart_token')}`
        },
        body: JSON.stringify({ vendorId: vendor.id, vendorName: vendor.name, amount: vendor.price })
      });
      if (res.ok) {
        alert("Success! OTP is in My Bookings.");
        setView('bookings');
        fetchMyBookings();
      }
    } catch (err) {}
  };

  const fetchMyBookings = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/my-bookings`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('gramcart_token')}` }
      });
      if (response.ok) setMyBookings(await response.json());
    } catch (err) {} finally { setIsLoading(false); }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const endpoint = authMode === 'login' ? '/api/login' : '/api/register';
      const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (res.ok) {
        setUser(data.user);
        localStorage.setItem('gramcart_user', JSON.stringify(data.user));
        localStorage.setItem('gramcart_token', data.token);
        if (data.user.role === UserRole.VENDOR) {
            setAuthMode(null);
            setView('vendor-dashboard');
            fetchVendorDashboard();
        } else {
            setAuthMode(null);
            setView('home');
        }
      } else alert(data.error);
    } catch (err) {} finally { setIsLoading(false); }
  };

  const handleLogout = () => {
    localStorage.clear();
    setUser(null);
    setAuthMode('login');
  };

  if (authMode && !user) {
    return (
      <div className="max-w-md mx-auto min-h-screen bg-blue-600 flex flex-col p-8 justify-center font-sans">
        <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl">
          <h1 className="text-3xl font-black text-blue-600 mb-2 italic">GramCart</h1>
          <p className="text-gray-400 text-[10px] mb-8 font-black uppercase tracking-widest">Village Marketplace {authMode.toUpperCase()}</p>
          <form onSubmit={handleAuth} className="space-y-4">
            {authMode === 'register' && (
              <>
                <input required type="text" placeholder="Full Name" className="w-full bg-gray-50 border p-4 rounded-2xl" onChange={e => setFormData({...formData, name: e.target.value})} />
                <div className="flex bg-gray-100 p-1 rounded-2xl mb-2">
                  <button type="button" onClick={() => setFormData({...formData, role: UserRole.USER})} className={`flex-1 py-2 rounded-xl text-xs font-black ${formData.role === UserRole.USER ? 'bg-white shadow' : 'text-gray-400'}`}>USER</button>
                  <button type="button" onClick={() => setFormData({...formData, role: UserRole.VENDOR})} className={`flex-1 py-2 rounded-xl text-xs font-black ${formData.role === UserRole.VENDOR ? 'bg-white shadow' : 'text-gray-400'}`}>VENDOR</button>
                </div>
              </>
            )}
            <input required type="email" placeholder="Email Address" className="w-full bg-gray-50 border p-4 rounded-2xl" onChange={e => setFormData({...formData, email: e.target.value})} />
            <input required type="password" placeholder="Password" className="w-full bg-gray-50 border p-4 rounded-2xl" onChange={e => setFormData({...formData, password: e.target.value})} />
            <button className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black shadow-lg">{isLoading ? "Wait..." : authMode.toUpperCase()}</button>
          </form>
          <button onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')} className="w-full mt-6 text-gray-400 text-[10px] font-black uppercase">
            {authMode === 'login' ? "Create Account" : "Back to Login"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto min-h-screen bg-gray-50 pb-20 font-sans">
      <div className={`${user?.role === UserRole.VENDOR ? 'bg-purple-600' : 'bg-blue-600'} p-6 rounded-b-[2.5rem] shadow-xl`}>
        <div className="flex justify-between items-center text-white mb-6">
          <div className="flex items-center gap-2">
            <i className="fas fa-tractor text-xl"></i>
            <h1 className="text-2xl font-black italic tracking-tighter">GramCart</h1>
          </div>
          <LanguageSwitch current={lang} onChange={setLang} />
        </div>
        
        {view === 'home' && (
          <input type="text" value={searchQuery} onChange={(e) => {setSearchQuery(e.target.value); fetchVendors(e.target.value);}} placeholder={t.searchPlaceholder} className="w-full p-4 pl-12 rounded-2xl outline-none text-sm shadow-inner" />
        )}
        
        {view === 'vendor-dashboard' && (
          <div className="text-white">
            <h2 className="text-lg font-black uppercase tracking-widest opacity-80 mb-1">Earnings</h2>
            <div className="text-4xl font-black">₹{vendorStats?.totalEarnings || 0}</div>
          </div>
        )}
      </div>

      {view === 'vendor-dashboard' && (
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
             <div className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100">
               <p className="text-[10px] font-black text-gray-400 uppercase">Bookings</p>
               <p className="text-xl font-black">{vendorStats?.bookings?.length || 0}</p>
             </div>
             <div className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100">
               <p className="text-[10px] font-black text-gray-400 uppercase">Delivered</p>
               <p className="text-xl font-black text-green-600">{vendorStats?.deliveredCount || 0}</p>
             </div>
          </div>

          <h3 className="font-black text-gray-900 pt-4">Active Jobs</h3>
          {vendorStats?.bookings?.filter((b:any) => b.status !== 'delivered').map((b: any) => (
            <div key={b._id} className="bg-white p-5 rounded-3xl border border-purple-100 shadow-sm">
               <div className="flex justify-between items-start mb-3">
                 <p className="font-black text-gray-800">Booking #{b._id.slice(-4)}</p>
                 <span className="bg-purple-50 text-purple-600 text-[10px] font-black px-2 py-1 rounded-full">₹{b.amount}</span>
               </div>
               <div className="space-y-3">
                 <input 
                   type="text" 
                   maxLength={4} 
                   placeholder="Enter Customer OTP" 
                   className="w-full bg-gray-50 border p-3 rounded-xl text-center font-black tracking-widest"
                   onChange={(e) => setOtpInputs({...otpInputs, [b._id]: e.target.value})}
                 />
                 <button 
                   onClick={() => handleCompleteBooking(b._id)}
                   className="w-full bg-purple-600 text-white py-3 rounded-xl font-black text-xs uppercase"
                 >Verify & Complete</button>
               </div>
            </div>
          ))}
        </div>
      )}

      {view === 'home' && (
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-4 gap-4">
            {CATEGORIES.map(cat => (
              <div key={cat.id} className="flex flex-col items-center gap-2 cursor-pointer" onClick={() => fetchVendors(cat.id)}>
                <div className={`${cat.color} w-14 h-14 rounded-2xl flex items-center justify-center text-xl shadow-sm`}><i className={`fas ${cat.icon}`}></i></div>
                <span className="text-[9px] font-black text-gray-500 uppercase text-center">{lang === Language.HI ? t[cat.id as keyof Translation] || cat.name : cat.name}</span>
              </div>
            ))}
          </div>
          <div className="space-y-4">
            {vendors.map(v => <VendorCard key={v.id} vendor={v} t={t} onBook={handleBook} />)}
          </div>
        </div>
      )}

      {view === 'bookings' && (
        <div className="p-6 space-y-4">
          {myBookings.map(b => (
            <div key={b.id} className="bg-white p-5 rounded-[2rem] shadow-sm border border-gray-100">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-black text-gray-800">{b.vendorName}</h3>
                  <span className={`text-[10px] font-black px-2 py-1 rounded-full uppercase ${b.status === 'delivered' ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'}`}>
                    {b.status}
                  </span>
                </div>
                {b.status !== 'delivered' && (
                    <div className="bg-blue-50 p-4 rounded-2xl border border-dashed border-blue-200 text-center">
                        <p className="text-[10px] text-blue-400 font-black uppercase mb-1">Service Completion OTP</p>
                        <p className="text-blue-600 font-black text-2xl tracking-[0.5em]">{b.otp}</p>
                    </div>
                )}
            </div>
          ))}
        </div>
      )}

      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/90 backdrop-blur-md h-20 flex items-center justify-around border-t shadow-2xl z-50 px-4 rounded-t-3xl">
        <button className={view === 'home' ? 'text-blue-600' : 'text-gray-300'} onClick={() => setView('home')}><i className="fas fa-search text-xl"></i></button>
        <button className={view === 'bookings' ? 'text-blue-600' : 'text-gray-300'} onClick={() => {setView('bookings'); fetchMyBookings();}}><i className="fas fa-list text-xl"></i></button>
        {user?.role === UserRole.VENDOR && (
          <button className={view === 'vendor-dashboard' ? 'text-purple-600' : 'text-gray-300'} onClick={() => {setView('vendor-dashboard'); fetchVendorDashboard();}}><i className="fas fa-chart-line text-xl"></i></button>
        )}
        <button onClick={handleLogout} className="text-gray-300"><i className="fas fa-power-off text-xl"></i></button>
      </div>
    </div>
  );
};

export default App;
