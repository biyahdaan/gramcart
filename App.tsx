
import React, { useState, useEffect, useRef } from 'react';
import { Language, User, Translations, UserRole } from './types';
import { CATEGORIES as INITIAL_CATEGORIES, BANNERS, GLOBAL_CATEGORIES } from './constants';
import { LanguageSwitch } from './components/LanguageSwitch';

const API_BASE_URL = "/api"; 

// --- UTILS ---
const compressImage = (base64Str: string): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width; let height = img.height;
      const max_dim = 600; 
      if (width > height) { if (width > max_dim) { height *= max_dim / width; width = max_dim; } } 
      else { if (height > max_dim) { width *= max_dim / height; height = max_dim; } }
      canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.5));
    };
  });
};

const App: React.FC = () => {
  // --- CORE STATE ---
  const [showSplash, setShowSplash] = useState(true);
  const [lang, setLang] = useState<Language>(Language.EN);
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string>('');
  const [vendorProfile, setVendorProfile] = useState<any>(null);
  const [view, setView] = useState<'home' | 'vendor-dashboard' | 'bookings' | 'my-services' | 'admin-dashboard'>('home');
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [isAdminMode, setIsAdminMode] = useState(false);
  
  // --- DATA STATE ---
  const [data, setData] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [myServices, setMyServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [adminData, setAdminData] = useState<any>(null);

  // --- FORM STATE ---
  const [authForm, setAuthForm] = useState({ identifier: '', email: '', mobile: '', password: '', name: '', role: 'user' });
  const [serviceForm, setServiceForm] = useState({ 
    _id: '', title: '', category: 'tent', rate: '', unitType: 'Per Day', description: '', images: [] as string[], inventoryList: [] as any[] 
  });
  const [bookingTarget, setBookingTarget] = useState<any>(null);
  const [bookingForm, setBookingForm] = useState({ startDate: '', endDate: '', address: '', pincode: '' });
  const [detailTarget, setDetailTarget] = useState<any>(null);
  const [otpVerify, setOtpVerify] = useState<{ id: string, input: string, correct: string } | null>(null);

  useEffect(() => {
    setTimeout(() => setShowSplash(false), 3000);
    const saved = localStorage.getItem('gramcart_session');
    if (saved) {
      try {
        const { user, token, vendor } = JSON.parse(saved);
        setUser(user); setToken(token); setVendorProfile(vendor);
        if (user.role === 'admin') setIsAdminMode(true);
      } catch (e) { localStorage.removeItem('gramcart_session'); }
    }
    fetchMarketplace();
  }, []);

  const fetchMarketplace = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/search`);
      if (res.ok) setData(await res.json());
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const fetchBookings = async () => {
    if (!user || !token) return;
    const id = user.role === 'vendor' ? vendorProfile?._id : user._id || user.id;
    if (!id) return;
    try {
      const res = await fetch(`${API_BASE_URL}/my-bookings/${user.role}/${id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setBookings(await res.json());
    } catch (e) { console.error(e); }
  };

  const fetchMyServices = async () => {
    if (!vendorProfile?._id) return;
    try {
      const res = await fetch(`${API_BASE_URL}/my-services/${vendorProfile._id}`);
      if (res.ok) setMyServices(await res.json());
    } catch (e) { console.error(e); }
  };

  const fetchAdminData = async () => {
    if (user?.role !== 'admin' && user?.role !== 'superadmin') return;
    try {
      const res = await fetch(`${API_BASE_URL}/admin/all-data`, { headers: { 'Authorization': `Bearer ${token}` }});
      if (res.ok) setAdminData(await res.json());
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    if (user && token) {
        fetchBookings();
        if (user.role === 'vendor') fetchMyServices();
        if (user.role === 'admin') fetchAdminData();
    }
  }, [user, view, token]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (authForm.identifier === "SUPERADMIN" && !isAdminMode) {
        setIsAdminMode(true);
        setAuthForm({ ...authForm, identifier: '' });
        return;
    }
    setLoading(true);

    if (isAdminMode && authMode === 'login') {
        if (authForm.password === "123") {
            const adminUser = { _id: 'admin', name: 'System Admin', role: UserRole.ADMIN };
            setUser(adminUser as any);
            setToken('admin-master-token');
            setView('admin-dashboard');
            setLoading(false);
            return;
        } else { alert("Master Password Wrong"); setLoading(false); return; }
    }

    const endpoint = authMode === 'login' ? '/login' : '/register';
    const payload = authMode === 'login' ? { identifier: authForm.identifier, password: authForm.password } : authForm;
    
    try {
        const res = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const result = await res.json();
        if (res.ok) {
            localStorage.setItem('gramcart_session', JSON.stringify(result));
            setUser(result.user);
            setToken(result.token);
            setVendorProfile(result.vendor);
            setView(result.user.role === 'vendor' ? 'vendor-dashboard' : 'home');
        } else {
            alert(result.error || "Authentication Failed");
        }
    } catch (e) { alert("Server Down or Network Error"); }
    setLoading(false);
  };

  const saveService = async () => {
    if (!vendorProfile?._id) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/services`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...serviceForm, vendorId: vendorProfile._id })
      });
      if (res.ok) {
        alert("Inventory Added Successfully!");
        setDetailTarget(null);
        fetchMyServices();
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const updateBooking = async (id: string, status: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/bookings/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (res.ok) fetchBookings();
    } catch (e) { console.error(e); }
  };

  const handleBooking = async () => {
    const userId = user?._id || user?.id;
    if (!userId || !bookingTarget) {
      alert("Please login as a customer to book.");
      return;
    }
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    try {
      const res = await fetch(`${API_BASE_URL}/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: userId,
          vendorId: bookingTarget.vendorId,
          serviceId: bookingTarget._id,
          startDate: bookingForm.startDate,
          endDate: bookingForm.endDate,
          address: bookingForm.address,
          pincode: bookingForm.pincode,
          totalAmount: bookingTarget.rate,
          otp,
          status: 'pending'
        })
      });
      if (res.ok) {
        alert("Request Sent to Vendor!");
        setBookingTarget(null);
        setView('bookings');
      }
    } catch (e) { console.error(e); }
  };

  const t = Translations[lang];

  if (showSplash) return (
    <div className="fixed inset-0 bg-[#2874f0] flex flex-col items-center justify-center z-[1000] text-white overflow-hidden">
      <div className="relative">
        <h1 className="text-6xl font-black italic tracking-tighter mb-4 animate-bounce">GramCart</h1>
        <div className="absolute -right-4 -top-2 w-4 h-4 bg-yellow-400 rounded-full animate-ping"></div>
      </div>
      <div className="w-48 h-1 bg-white/20 rounded-full overflow-hidden mt-8">
        <div className="h-full bg-white animate-progress"></div>
      </div>
      <p className="mt-8 font-black uppercase text-[10px] tracking-[0.3em] opacity-80">Hyper-Local Marketplace</p>
    </div>
  );

  if (!user) return (
    <div className="max-w-md mx-auto min-h-screen bg-[#f1f3f6] flex items-center justify-center p-6">
      <div className="bg-white w-full p-8 rounded-[3rem] shadow-2xl border border-white animate-slideUp">
        <div className="text-center mb-10">
          <h2 className="text-4xl font-black text-[#2874f0] italic tracking-tighter">GramCart</h2>
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mt-2">Connect with local experts</p>
        </div>
        <form onSubmit={handleAuth} className="space-y-4">
          {authMode === 'register' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="relative">
                <i className="fas fa-user absolute left-4 top-1/2 -translate-y-1/2 text-gray-300"></i>
                <input className="w-full bg-gray-50 p-4 pl-12 rounded-2xl font-bold text-sm outline-none focus:ring-2 ring-blue-500/20" placeholder="Full Name" onChange={e => setAuthForm({...authForm, name: e.target.value})} required />
              </div>
              <div className="relative">
                <i className="fas fa-phone absolute left-4 top-1/2 -translate-y-1/2 text-gray-300"></i>
                <input className="w-full bg-gray-50 p-4 pl-12 rounded-2xl font-bold text-sm outline-none focus:ring-2 ring-blue-500/20" placeholder="Mobile Number" onChange={e => setAuthForm({...authForm, mobile: e.target.value})} required />
              </div>
              <div className="flex gap-2 p-1.5 bg-gray-50 rounded-2xl">
                <button type="button" onClick={() => setAuthForm({...authForm, role: 'user'})} className={`flex-1 py-3 rounded-xl text-[10px] font-black tracking-widest transition-all ${authForm.role === 'user' ? 'bg-[#2874f0] text-white shadow-lg shadow-blue-500/30' : 'text-gray-400'}`}>CUSTOMER</button>
                <button type="button" onClick={() => setAuthForm({...authForm, role: 'vendor'})} className={`flex-1 py-3 rounded-xl text-[10px] font-black tracking-widest transition-all ${authForm.role === 'vendor' ? 'bg-[#2874f0] text-white shadow-lg shadow-blue-500/30' : 'text-gray-400'}`}>VENDOR</button>
              </div>
            </div>
          )}
          <div className="relative">
             <i className="fas fa-id-card absolute left-4 top-1/2 -translate-y-1/2 text-gray-300"></i>
             <input className="w-full bg-gray-50 p-4 pl-12 rounded-2xl font-bold text-sm outline-none focus:ring-2 ring-blue-500/20" placeholder={isAdminMode ? "Admin System Key" : "Email or Mobile"} value={authForm.identifier} onChange={e => setAuthForm({...authForm, identifier: e.target.value})} required />
          </div>
          <div className="relative">
             <i className="fas fa-lock absolute left-4 top-1/2 -translate-y-1/2 text-gray-300"></i>
             <input className="w-full bg-gray-50 p-4 pl-12 rounded-2xl font-bold text-sm outline-none focus:ring-2 ring-blue-500/20" type="password" placeholder="Password" onChange={e => setAuthForm({...authForm, password: e.target.value})} required />
          </div>
          <button className="w-full py-5 rounded-[1.5rem] bg-[#fb641b] text-white font-black uppercase tracking-[0.2em] shadow-xl shadow-orange-500/30 active:scale-95 transition-all text-xs">
            {loading ? <i className="fas fa-spinner fa-spin"></i> : (authMode === 'login' ? 'Proceed Login' : 'Create Account')}
          </button>
          <p onClick={() => { setAuthMode(authMode === 'login' ? 'register' : 'login'); setIsAdminMode(false); }} className="text-center text-[10px] font-black text-[#2874f0] cursor-pointer mt-6 uppercase tracking-widest opacity-80">
            {authMode === 'login' ? "New to GramCart? Join Now" : "Existing Member? Sign In"}
          </p>
        </form>
      </div>
    </div>
  );

  return (
    <div className="max-w-md mx-auto min-h-screen bg-[#f1f3f6] relative pb-24 overflow-x-hidden">
        {/* --- HEADER --- */}
        <header className="bg-[#2874f0] p-6 text-white sticky top-0 z-[500] rounded-b-[3rem] shadow-xl">
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
                    <i className="fas fa-shopping-bag"></i>
                  </div>
                  <h1 className="text-2xl font-black italic tracking-tighter">GramCart</h1>
                </div>
                <div className="flex items-center gap-4">
                    <LanguageSwitch current={lang} onChange={setLang} />
                    <button onClick={() => { localStorage.clear(); window.location.reload(); }} className="w-10 h-10 bg-red-500/20 text-white rounded-2xl backdrop-blur-md flex items-center justify-center"><i className="fas fa-power-off"></i></button>
                </div>
            </div>
            <div className="relative group">
                <input className="w-full bg-white/10 text-white placeholder:text-white/50 p-4 rounded-2xl pl-12 text-sm font-bold backdrop-blur-md border border-white/10 outline-none focus:bg-white focus:text-gray-900 focus:shadow-2xl transition-all" placeholder={t.searchPlaceholder} onChange={e => setSearchQuery(e.target.value)} />
                <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-white/50 group-focus-within:text-blue-500 transition-colors"></i>
            </div>
        </header>

        {/* --- MAIN CONTENT --- */}
        <main className="p-4 space-y-8 animate-fadeIn">
            {(view === 'admin-dashboard' || isAdminMode) && adminData && (
              <div className="space-y-6 pb-12">
                <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-blue-100">
                  <h3 className="font-black text-xs uppercase text-blue-600 mb-6 tracking-[0.2em]">Master System Logs</h3>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-blue-50 p-5 rounded-3xl text-center"><p className="text-[7px] font-black text-blue-400 mb-1">TOTAL USERS</p><p className="text-2xl font-black text-blue-600">{adminData.users?.length || 0}</p></div>
                    <div className="bg-green-50 p-5 rounded-3xl text-center"><p className="text-[7px] font-black text-green-400 mb-1">BOOKINGS</p><p className="text-2xl font-black text-green-600">{adminData.bookings?.length || 0}</p></div>
                    <div className="bg-orange-50 p-5 rounded-3xl text-center"><p className="text-[7px] font-black text-orange-400 mb-1">SERVICES</p><p className="text-2xl font-black text-orange-600">{adminData.services?.length || 0}</p></div>
                  </div>
                </div>
                <div className="bg-white rounded-[2.5rem] overflow-hidden shadow-sm border border-gray-100">
                  <div className="p-6 bg-gray-50 border-b flex justify-between items-center"><span className="text-xs font-black uppercase tracking-widest">Global Order Registry</span><i className="fas fa-sync text-blue-500 animate-spin-slow"></i></div>
                  <div className="divide-y divide-gray-50">
                    {adminData.bookings?.map((b: any) => (
                      <div key={b._id} className="p-5 flex justify-between items-center hover:bg-gray-50/50">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center font-black text-xs">{b.customerId?.name?.charAt(0)}</div>
                          <div>
                            <p className="text-[11px] font-black">{b.serviceId?.title}</p>
                            <p className="text-[9px] text-gray-400 font-bold uppercase">{b.customerId?.name} → {b.vendorId?.businessName}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-black text-blue-600">₹{b.totalAmount}</p>
                          <span className="text-[7px] font-black uppercase bg-blue-100 px-1.5 rounded-full text-blue-400">{b.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {view === 'home' && (
                <>
                    {/* Banners */}
                    <div className="flex overflow-x-auto gap-4 no-scrollbar pb-2">
                        {BANNERS.map(b => (
                            <div key={b.id} className={`${b.color} min-w-[300px] h-40 rounded-[2.5rem] p-8 text-white relative shadow-2xl overflow-hidden group active:scale-95 transition-transform`}>
                                <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all"></div>
                                <p className="text-lg font-black leading-tight max-w-[200px]">{b.text}</p>
                                <button className="mt-6 bg-white text-gray-900 px-6 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl">Explore Now</button>
                            </div>
                        ))}
                    </div>

                    {/* Categories */}
                    <section>
                      <div className="flex justify-between items-center mb-6 px-2">
                        <h3 className="font-black text-gray-900 uppercase text-xs tracking-widest">{t.categories}</h3>
                        <span className="text-[9px] font-black text-blue-600 uppercase">View All</span>
                      </div>
                      <div className="grid grid-cols-4 gap-6">
                          {INITIAL_CATEGORIES.map(cat => (
                              <button key={cat.id} onClick={() => setSearchQuery(cat.name)} className="flex flex-col items-center gap-3 group">
                                  <div className={`${cat.color} w-16 h-16 rounded-[1.8rem] flex items-center justify-center shadow-xl border-4 border-white transition-all group-active:scale-90 text-2xl`}>
                                    <i className={`fas ${cat.icon}`}></i>
                                  </div>
                                  <span className="text-[9px] font-black uppercase text-gray-500 tracking-tighter text-center line-clamp-1">{cat.name}</span>
                              </button>
                          ))}
                      </div>
                    </section>

                    {/* Marketplace */}
                    <section className="space-y-6">
                        <div className="flex justify-between items-center mb-6 px-2">
                          <h3 className="font-black text-gray-900 uppercase text-xs tracking-widest">{t.popularServices}</h3>
                          <div className="flex gap-2">
                            <div className="w-8 h-8 bg-white rounded-xl shadow-sm flex items-center justify-center text-[10px] text-gray-400"><i className="fas fa-filter"></i></div>
                          </div>
                        </div>
                        {data.map(vendor => vendor.services?.filter((s:any) => s.title.toLowerCase().includes(searchQuery.toLowerCase())).map((s: any) => (
                            <div key={s._id} className="bg-white rounded-[3rem] overflow-hidden shadow-sm border border-gray-100 mb-8 group active:scale-[0.98] transition-all">
                                <div className="h-60 relative overflow-hidden">
                                    <img src={s.images?.[0] || 'https://picsum.photos/400/300'} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                                    <div className="absolute top-6 left-6 bg-white/90 backdrop-blur-md px-4 py-2 rounded-2xl shadow-2xl flex items-center gap-2">
                                      <span className="text-xs font-black text-gray-900">₹{s.rate}</span>
                                      <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">/ {s.unitType}</span>
                                    </div>
                                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-8">
                                       <h4 className="font-black text-white text-2xl">{s.title}</h4>
                                       <p className="text-[10px] font-black text-white/70 uppercase tracking-widest mt-1"><i className="fas fa-map-marker-alt mr-2 text-blue-400"></i> {vendor.businessName}</p>
                                    </div>
                                </div>
                                <div className="p-8">
                                    <div className="flex gap-4">
                                        <button onClick={() => setDetailTarget({...s, vendorName: vendor.businessName})} className="flex-1 bg-gray-50 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest text-gray-900 border border-gray-100 hover:bg-gray-100 transition-colors">Details</button>
                                        <button onClick={() => setBookingTarget({...s, vendorId: vendor._id})} className="flex-[2] bg-[#fb641b] text-white py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl shadow-orange-500/20 active:translate-y-1 transition-all">Book Now</button>
                                    </div>
                                </div>
                            </div>
                        )))}
                    </section>
                </>
            )}

            {view === 'vendor-dashboard' && (
                <div className="space-y-8 pb-12">
                    <div className="bg-gradient-to-br from-[#2874f0] to-[#1e5ebc] p-10 rounded-[3.5rem] text-white shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl"></div>
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60 mb-2">Available Payout</p>
                        <h2 className="text-5xl font-black mb-6">₹{vendorProfile?.totalEarnings || 0}</h2>
                        <div className="flex gap-4">
                          <button className="bg-white/20 backdrop-blur-md px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-white/10">Withdraw</button>
                          <button className="bg-yellow-400 text-gray-900 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl">History</button>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <button onClick={() => setView('my-services')} className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 flex flex-col items-center gap-4 active:scale-95 transition-all">
                            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-[1.5rem] flex items-center justify-center text-3xl shadow-inner"><i className="fas fa-boxes-stacked"></i></div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">My Inventory</span>
                        </button>
                        <button onClick={() => setView('bookings')} className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 flex flex-col items-center gap-4 active:scale-95 transition-all">
                            <div className="w-16 h-16 bg-green-50 text-green-600 rounded-[1.5rem] flex items-center justify-center text-3xl shadow-inner"><i className="fas fa-calendar-check"></i></div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">New Requests</span>
                        </button>
                    </div>
                    
                    <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100">
                      <h3 className="text-[10px] font-black uppercase tracking-widest mb-4 text-gray-400">Merchant Settings</h3>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl">
                          <div className="flex items-center gap-3">
                            <i className="fas fa-wallet text-blue-500"></i>
                            <span className="text-xs font-black">Settlement UPI</span>
                          </div>
                          <span className="text-[10px] font-black text-blue-600">{vendorProfile?.upiId || 'Not Set'}</span>
                        </div>
                        <div className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl opacity-50">
                          <div className="flex items-center gap-3">
                            <i className="fas fa-store text-orange-500"></i>
                            <span className="text-xs font-black">Operating Hours</span>
                          </div>
                          <span className="text-[10px] font-black">24/7</span>
                        </div>
                      </div>
                    </div>
                </div>
            )}

            {view === 'bookings' && (
                <div className="space-y-6 pb-12">
                    <div className="flex justify-between items-center px-2">
                      <h3 className="font-black text-2xl tracking-tighter">Booking Feed</h3>
                      <button onClick={fetchBookings} className="w-10 h-10 bg-white rounded-2xl shadow-sm text-blue-600"><i className="fas fa-sync"></i></button>
                    </div>
                    {bookings.length === 0 && <div className="p-20 text-center font-black text-gray-300 uppercase text-xs tracking-widest">No active requests</div>}
                    {bookings.map(b => (
                        <div key={b._id} className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100 relative group overflow-hidden">
                            <div className={`absolute left-0 top-0 bottom-0 w-3 ${b.status === 'completed' ? 'bg-green-500' : (b.status === 'approved' ? 'bg-blue-500' : 'bg-orange-400')} transition-all group-hover:w-4`}></div>
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h4 className="font-black text-lg mb-1">{b.serviceId?.title}</h4>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest"><i className="fas fa-user-circle mr-1"></i> {user.role === 'vendor' ? b.customerId?.name : b.vendorId?.businessName}</p>
                                </div>
                                <span className={`text-[8px] font-black uppercase px-3 py-1.5 rounded-full border ${b.status === 'completed' ? 'bg-green-50 border-green-200 text-green-600' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>{b.status}</span>
                            </div>
                            <div className="flex justify-between items-center mt-6">
                                <div className="flex flex-col">
                                  <span className="text-[8px] font-black text-gray-400 uppercase mb-1">Total Payout</span>
                                  <span className="text-lg font-black text-blue-600">₹{b.totalAmount}</span>
                                </div>
                                {user.role === 'user' && b.status !== 'completed' && (
                                  <div className="flex flex-col items-end">
                                    <span className="text-[8px] font-black text-gray-400 uppercase mb-1">Release OTP</span>
                                    <span className="text-xl font-black text-orange-500 tracking-[0.2em]">{b.otp}</span>
                                  </div>
                                )}
                                {user.role === 'vendor' && b.status === 'pending' && (
                                    <button onClick={() => updateBooking(b._id, 'approved')} className="bg-blue-600 text-white px-8 py-3 rounded-2xl text-[10px] font-black uppercase shadow-lg shadow-blue-500/30">Approve Request</button>
                                )}
                                {user.role === 'vendor' && b.status === 'approved' && (
                                    <button onClick={() => setOtpVerify({ id: b._id, input: '', correct: b.otp })} className="bg-orange-500 text-white px-8 py-3 rounded-2xl text-[10px] font-black uppercase shadow-lg shadow-orange-500/30">Enter Release OTP</button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {view === 'my-services' && (
                <div className="space-y-6 pb-12">
                    <div className="flex justify-between items-center px-2">
                      <h3 className="font-black text-2xl tracking-tighter">Inventory Manager</h3>
                      <button onClick={() => setDetailTarget({ editing: true })} className="bg-[#2874f0] text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase shadow-xl shadow-blue-500/30">Add New</button>
                    </div>
                    {myServices.map(s => (
                        <div key={s._id} className="bg-white p-5 rounded-[2.5rem] flex gap-5 items-center shadow-sm border border-gray-50">
                            <div className="w-24 h-24 rounded-[1.8rem] overflow-hidden shadow-inner border border-gray-100">
                              <img src={s.images?.[0] || 'https://picsum.photos/100'} className="w-full h-full object-cover" />
                            </div>
                            <div className="flex-1">
                                <h4 className="font-black text-base text-gray-900 mb-1">{s.title}</h4>
                                <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">₹{s.rate} / {s.unitType}</p>
                                <div className="flex gap-3 mt-3">
                                  <button className="text-[10px] font-black uppercase text-gray-400 hover:text-blue-500 transition-colors">Edit</button>
                                  <button className="text-[10px] font-black uppercase text-gray-400 hover:text-red-500 transition-colors">Delete</button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </main>

        {/* --- NAV BAR --- */}
        <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-2xl border-t border-gray-100 p-5 flex justify-around items-center z-[500] max-w-md mx-auto rounded-t-[3rem] shadow-[0_-20px_50px_rgba(0,0,0,0.1)]">
            {[
                { id: 'home', icon: 'fa-house', label: 'Explore' },
                { id: 'bookings', icon: 'fa-receipt', label: 'Orders' },
                { id: (user.role === 'admin' || user.role === 'superadmin') ? 'admin-dashboard' : (user.role === 'vendor' ? 'vendor-dashboard' : 'home'), icon: 'fa-user-gear', label: 'Profile' }
            ].map(nav => (
                <button key={nav.id} onClick={() => setView(nav.id as any)} className={`flex flex-col items-center gap-1.5 transition-all relative ${view === nav.id ? 'text-[#2874f0]' : 'text-gray-400'}`}>
                    {view === nav.id && <div className="absolute -top-1 w-6 h-1 bg-blue-500 rounded-full animate-fadeIn"></div>}
                    <i className={`fas ${nav.icon} text-xl transition-transform ${view === nav.id ? 'scale-110' : ''}`}></i>
                    <span className="text-[8px] font-black uppercase tracking-[0.2em]">{nav.label}</span>
                </button>
            ))}
        </nav>

        {/* --- MODALS --- */}
        
        {/* Booking Process Modal */}
        {bookingTarget && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-lg z-[2000] flex items-end justify-center">
                <div className="bg-white w-full max-w-md rounded-t-[3.5rem] p-10 animate-slideUp max-h-[90vh] overflow-y-auto">
                    <div className="flex justify-between items-center mb-8">
                        <div>
                          <h3 className="text-2xl font-black tracking-tighter">Secure Booking</h3>
                          <p className="text-[10px] font-black uppercase text-gray-400 mt-1">Direct request to {bookingTarget.vendorName}</p>
                        </div>
                        <button onClick={() => setBookingTarget(null)} className="w-12 h-12 bg-gray-50 rounded-2xl text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"><i className="fas fa-times"></i></button>
                    </div>
                    <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Start Date</label>
                            <input className="w-full bg-gray-50 p-5 rounded-2xl font-black text-sm outline-none border border-transparent focus:border-blue-500/30" type="date" onChange={e => setBookingForm({...bookingForm, startDate: e.target.value})} />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-gray-400 ml-1">End Date</label>
                            <input className="w-full bg-gray-50 p-5 rounded-2xl font-black text-sm outline-none border border-transparent focus:border-blue-500/30" type="date" onChange={e => setBookingForm({...bookingForm, endDate: e.target.value})} />
                          </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Full Delivery Address</label>
                            <textarea className="w-full bg-gray-50 p-6 rounded-[2rem] font-black text-sm outline-none min-h-[120px] border border-transparent focus:border-blue-500/30" placeholder="Street, Landmark, Village..." onChange={e => setBookingForm({...bookingForm, address: e.target.value})} />
                        </div>
                        <div className="bg-blue-50 p-6 rounded-[2.5rem] flex justify-between items-center">
                          <div className="flex flex-col">
                            <span className="text-[8px] font-black text-blue-400 uppercase tracking-widest">Estimated Amount</span>
                            <span className="text-2xl font-black text-blue-600">₹{bookingTarget.rate}</span>
                          </div>
                          <i className="fas fa-shield-check text-blue-300 text-3xl opacity-50"></i>
                        </div>
                        <button onClick={handleBooking} className="w-full bg-[#fb641b] text-white py-6 rounded-[2rem] font-black uppercase tracking-[0.2em] shadow-2xl shadow-orange-500/30 active:scale-95 transition-all text-xs">Request Availability</button>
                    </div>
                </div>
            </div>
        )}

        {/* Inventory Add/Edit Modal */}
        {detailTarget?.editing && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-lg z-[2000] flex items-center justify-center p-4">
                <div className="bg-white w-full max-w-md rounded-[3.5rem] p-10 animate-scaleIn max-h-[90vh] overflow-y-auto">
                    <div className="flex justify-between items-center mb-8">
                        <h3 className="text-2xl font-black tracking-tighter">Update Inventory</h3>
                        <button onClick={() => setDetailTarget(null)} className="w-10 h-10 bg-gray-50 rounded-2xl text-gray-400"><i className="fas fa-times"></i></button>
                    </div>
                    <div className="space-y-5">
                        <div className="grid grid-cols-2 gap-4">
                           <div className="space-y-2">
                              <label className="text-[10px] font-black uppercase text-gray-400">Title</label>
                              <input className="w-full bg-gray-50 p-5 rounded-2xl font-black text-sm outline-none" placeholder="Waterproof Tent" onChange={e => setServiceForm({...serviceForm, title: e.target.value})} />
                           </div>
                           <div className="space-y-2">
                              <label className="text-[10px] font-black uppercase text-gray-400">Category</label>
                              <select className="w-full bg-gray-50 p-5 rounded-2xl font-black text-sm outline-none appearance-none" onChange={e => setServiceForm({...serviceForm, category: e.target.value})}>
                                {INITIAL_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                              </select>
                           </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                           <div className="space-y-2">
                              <label className="text-[10px] font-black uppercase text-gray-400">Rate (₹)</label>
                              <input className="w-full bg-gray-50 p-5 rounded-2xl font-black text-sm outline-none" type="number" placeholder="5000" onChange={e => setServiceForm({...serviceForm, rate: e.target.value})} />
                           </div>
                           <div className="space-y-2">
                              <label className="text-[10px] font-black uppercase text-gray-400">Unit</label>
                              <select className="w-full bg-gray-50 p-5 rounded-2xl font-black text-sm outline-none" onChange={e => setServiceForm({...serviceForm, unitType: e.target.value})}>
                                <option>Per Day</option><option>Per Service</option><option>Fixed</option>
                              </select>
                           </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-gray-400">Gallery (Base64)</label>
                            <input type="file" multiple className="w-full text-xs font-bold" onChange={async (e) => {
                               if (e.target.files) {
                                  const base64s = await Promise.all(Array.from(e.target.files).map(async f => {
                                    const reader = new FileReader();
                                    return new Promise<string>((res) => {
                                      reader.onload = async () => res(await compressImage(reader.result as string));
                                      reader.readAsDataURL(f);
                                    });
                                  }));
                                  setServiceForm({...serviceForm, images: base64s});
                               }
                            }} />
                        </div>
                        <button onClick={saveService} className="w-full bg-[#2874f0] text-white py-6 rounded-[2rem] font-black uppercase tracking-[0.2em] shadow-xl mt-6 active:scale-95 transition-all text-xs">Publish Inventory</button>
                    </div>
                </div>
            </div>
        )}

        {/* OTP Verify Modal */}
        {otpVerify && (
           <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[3000] flex items-center justify-center p-8">
              <div className="bg-white w-full rounded-[3.5rem] p-10 text-center animate-scaleIn">
                  <div className="w-20 h-20 bg-orange-50 text-orange-500 rounded-[2rem] flex items-center justify-center text-3xl mx-auto mb-6"><i className="fas fa-key"></i></div>
                  <h3 className="text-2xl font-black tracking-tighter mb-2">Release Payout</h3>
                  <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-8 leading-relaxed">Enter the 4-digit code provided<br/>by the customer to finish.</p>
                  <input className="w-full bg-gray-50 p-6 rounded-3xl text-3xl font-black tracking-[0.5em] text-center outline-none border-4 border-transparent focus:border-orange-200" maxLength={4} type="tel" onChange={e => setOtpVerify({...otpVerify, input: e.target.value})} />
                  <div className="flex gap-4 mt-8">
                    <button onClick={() => setOtpVerify(null)} className="flex-1 py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest text-gray-400 bg-gray-50">Cancel</button>
                    <button onClick={() => {
                       if (otpVerify.input === otpVerify.correct) {
                         updateBooking(otpVerify.id, 'completed');
                         setOtpVerify(null);
                         alert("Payout Released Successfully!");
                       } else alert("Invalid OTP Code");
                    }} className="flex-[2] py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest text-white bg-orange-500 shadow-xl shadow-orange-500/30">Verify & Settle</button>
                  </div>
              </div>
           </div>
        )}

        <style>{`
          .no-scrollbar::-webkit-scrollbar { display: none; }
          .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
          @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
          @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
          @keyframes scaleIn { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
          @keyframes progress { 0% { width: 0%; } 100% { width: 100%; } }
          .animate-slideUp { animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1); }
          .animate-fadeIn { animation: fadeIn 0.4s ease-out; }
          .animate-scaleIn { animation: scaleIn 0.5s cubic-bezier(0.16, 1, 0.3, 1); }
          .animate-progress { animation: progress 3s linear; }
          .animate-spin-slow { animation: spin 3s linear infinite; }
        `}</style>
    </div>
  );
};

export default App;
