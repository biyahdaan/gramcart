
import React, { useState, useEffect, useRef } from 'react';
import { Language, User, Translations, UserRole, Translation } from './types';
import { CATEGORIES, BANNERS } from './constants';
import { LanguageSwitch } from './components/LanguageSwitch';

const API_BASE_URL = "https://biyahdaan.onrender.com/api"; 

const PRESETS: Record<string, string[]> = {
  dj: ['2 Bass', '4 Tops', 'Sharpy Lights', 'Smoke Machine', 'LED Wall', 'Mixer Console', 'JBL Speakers'],
  tent: ['200 Chairs', 'Waterproof Pandal', 'VIP Stage', 'Red Carpet', 'Sofa Set', 'Entrance Gate'],
  catering: ['Breakfast', 'Lunch', 'Full Buffet', 'Chinese Stall', 'South Indian Stall', 'Waiters (x5)'],
  electric: ['Generator', 'Halogen Lights', 'Decorative Serial Lights', 'Tower Lights']
};

const App: React.FC = () => {
  const [lang, setLang] = useState<Language>(Language.EN);
  const [user, setUser] = useState<User | null>(null);
  const [vendorProfile, setVendorProfile] = useState<any>(null);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [view, setView] = useState<'home' | 'vendor-dashboard' | 'bookings' | 'my-services' | 'vendor-settings'>('home');
  const [data, setData] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [myServices, setMyServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isListening, setIsListening] = useState(false);
  
  const [bookingTarget, setBookingTarget] = useState<any>(null);
  const [detailTarget, setDetailTarget] = useState<any>(null); 
  const [reviewTarget, setReviewTarget] = useState<any>(null);
  
  const [authForm, setAuthForm] = useState({ identifier: '', email: '', mobile: '', password: '', name: '', role: 'user' });
  const [serviceForm, setServiceForm] = useState({
    title: '', category: 'tent', rate: '', unitType: 'Per Day', duration: '1 Day', 
    itemsIncluded: [] as string[], images: [] as string[], contactNumber: '', _id: '', customItem: ''
  });
  const [bookingForm, setBookingForm] = useState({ startDate: '', endDate: '', address: '' });
  const [upiForm, setUpiForm] = useState({ upiId: '', advancePercent: 10 });
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const proofInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('gramcart_user');
    if (saved) {
      try {
        const parsedUser = JSON.parse(saved);
        setUser(parsedUser);
        if (parsedUser?.role === 'vendor') {
            setView('vendor-dashboard');
            fetchVendorProfile(parsedUser._id || parsedUser.id);
        }
      } catch (e) {
        localStorage.removeItem('gramcart_user');
      }
    }
    fetchData();
  }, []);

  const fetchVendorProfile = async (userId: string) => {
    try {
        const res = await fetch(`${API_BASE_URL}/search`);
        const allVendors = await res.json();
        const v = allVendors.find((vend: any) => vend.userId === userId);
        if (v) {
            setVendorProfile(v);
            setUpiForm({ upiId: v.upiId || '', advancePercent: v.advancePercent || 10 });
        }
    } catch (e) {}
  };

  useEffect(() => {
    if (user) {
      fetchBookings();
      if (user.role === UserRole.VENDOR) fetchMyServices();
    }
  }, [user, view]);

  const fetchData = async (cat: string = '') => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/search?cat=${cat}`);
      if (res.ok) {
        let results = await res.json();
        setData(results);
      }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const startVoiceSearch = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice Search not supported.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = lang === Language.HI ? 'hi-IN' : 'en-US';
    recognition.start();
    setIsListening(true);
    recognition.onresult = (event: any) => {
      setSearchQuery(event.results[0][0].transcript);
      setIsListening(false);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
  };

  const handleAdvanceUpload = (e: React.ChangeEvent<HTMLInputElement>, bookingId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = async () => {
      setLoading(true);
      try {
        await fetch(`${API_BASE_URL}/bookings/${bookingId}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ advanceProof: reader.result, status: 'advance_paid' })
        });
        alert("Advance receipt sent to vendor!");
        fetchBookings();
      } catch (e) { alert("Upload failed"); } finally { setLoading(false); }
    };
    reader.readAsDataURL(file);
  };

  const submitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
        await fetch(`${API_BASE_URL}/bookings/${reviewTarget}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ review: reviewForm, status: 'reviewed' })
        });
        alert("Thank you for your review! Order Closed.");
        setReviewTarget(null);
        fetchBookings();
    } catch (e) { alert("Review failed"); } finally { setLoading(false); }
  };

  const updateUpi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    try {
        const res = await fetch(`${API_BASE_URL}/vendor-profile/${user._id || user.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(upiForm)
        });
        if (res.ok) {
            alert("Settings Updated!");
            fetchVendorProfile(user._id || user.id);
            setView('vendor-dashboard');
        }
    } catch (e) { alert("Update failed"); } finally { setLoading(false); }
  };

  const deleteService = async (serviceId: string) => {
    if (!window.confirm("Delete this listing?")) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/services/${serviceId}`, { method: 'DELETE' });
      if (res.ok) { alert("Deleted!"); fetchMyServices(); fetchData(); }
    } catch (e) { alert("Delete failed"); } finally { setLoading(false); }
  };

  const fetchBookings = async () => {
    if (!user) return;
    try {
      const res = await fetch(`${API_BASE_URL}/my-bookings/${user.role}/${user._id || user.id}`);
      if (res.ok) setBookings(await res.json());
    } catch (e) {}
  };

  const fetchMyServices = async () => {
    if (!user || user.role !== UserRole.VENDOR) return;
    try {
      const vendorsRes = await fetch(`${API_BASE_URL}/search`);
      const allVendors = await vendorsRes.json();
      const v = allVendors.find((vend: any) => vend.userId === (user._id || user.id));
      if (v) {
        const res = await fetch(`${API_BASE_URL}/my-services/${v._id}`);
        if (res.ok) setMyServices(await res.json());
      }
    } catch (e) {}
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => setServiceForm(prev => ({ ...prev, images: [...prev.images, reader.result as string].slice(0, 5) }));
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => setServiceForm(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== index) }));

  const updateBookingStatus = async (bookingId: string, payload: any) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/bookings/${bookingId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) { fetchBookings(); }
    } catch (e) { alert("Update failed"); } finally { setLoading(false); }
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
        if (result.user.role === 'vendor') fetchVendorProfile(result.user._id || result.user.id);
        setView(result.user.role === 'vendor' ? 'vendor-dashboard' : 'home');
      } else { alert(result.error || "Auth Error"); }
    } catch (err) { alert("Error"); } finally { setLoading(false); }
  };

  const togglePresetItem = (item: string) => {
    const exists = serviceForm.itemsIncluded.includes(item);
    setServiceForm({ ...serviceForm, itemsIncluded: exists ? serviceForm.itemsIncluded.filter(i => i !== item) : [...serviceForm.itemsIncluded, item] });
  };

  const handleAddOrUpdateService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    try {
      const vendorsRes = await fetch(`${API_BASE_URL}/search`);
      const allVendors = await vendorsRes.json();
      const v = allVendors.find((vend: any) => vend.userId === (user._id || user.id));
      const method = serviceForm._id ? 'PUT' : 'POST';
      const endpoint = serviceForm._id ? `/services/${serviceForm._id}` : '/services';
      const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...serviceForm, vendorId: v?._id, rate: Number(serviceForm.rate) })
      });
      if (res.ok) {
        setServiceForm({ title: '', category: 'tent', rate: '', unitType: 'Per Day', duration: '1 Day', itemsIncluded: [], images: [], contactNumber: '', _id: '', customItem: '' });
        fetchMyServices(); fetchData(); setView('my-services');
      }
    } catch (e) {} finally { setLoading(false); }
  };

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    try {
      const vendorsRes = await fetch(`${API_BASE_URL}/search`);
      const allVendors = await vendorsRes.json();
      const targetVendor = allVendors.find((v: any) => v.services.some((s: any) => s._id === bookingTarget._id));
      const diff = new Date(bookingForm.endDate).getTime() - new Date(bookingForm.startDate).getTime();
      const days = Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
      const res = await fetch(`${API_BASE_URL}/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...bookingForm, customerId: user._id || user.id, vendorId: targetVendor?._id, serviceId: bookingTarget._id, totalAmount: bookingTarget.rate * days })
      });
      if (res.ok) { setBookingTarget(null); setView('bookings'); }
    } catch (e) {} finally { setLoading(false); }
  };

  // Stepper Component
  const Stepper = ({ status }: { status: string }) => {
    const steps = ['pending', 'approved', 'advance_paid', 'completed'];
    const currentIndex = steps.indexOf(status);
    
    return (
      <div className="flex items-center justify-between w-full mb-8 mt-2 px-2 relative">
        <div className="absolute top-[14px] left-0 right-0 h-[2px] bg-gray-100 z-0"></div>
        {steps.map((step, index) => {
          const isActive = index === currentIndex;
          const isCompleted = index < currentIndex || status === 'reviewed';
          return (
            <div key={step} className="flex flex-col items-center z-10 flex-1 relative">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-500 border-4 border-white shadow-sm ${
                isCompleted ? 'bg-green-500 text-white' : isActive ? 'bg-[#2874f0] text-white scale-110' : 'bg-gray-200 text-gray-400'
              } ${isActive ? 'animate-pulse' : ''}`}>
                {isCompleted ? <i className="fas fa-check text-[10px]"></i> : <span className="text-[10px] font-black">{index + 1}</span>}
              </div>
              <span className={`text-[7px] mt-2 font-black uppercase text-center ${isActive ? 'text-[#2874f0]' : isCompleted ? 'text-green-600' : 'text-gray-300'}`}>
                {step.replace('_', ' ')}
              </span>
              {index < steps.length - 1 && (
                 <div className={`absolute top-[14px] left-[50%] w-full h-[2px] -z-10 ${index < currentIndex ? 'bg-green-500' : 'bg-gray-100'}`}></div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  if (!user) {
    return (
      <div className="max-w-md mx-auto min-h-screen bg-[#2874f0] flex items-center justify-center p-6">
        <div className="bg-white w-full p-8 rounded-2xl shadow-2xl">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-black text-[#2874f0] italic">GramCart</h1>
          </div>
          <form onSubmit={handleAuth} className="space-y-4">
            {authMode === 'register' && (
              <><input placeholder="Name" className="w-full bg-gray-50 p-4 rounded-xl border" onChange={e => setAuthForm({...authForm, name: e.target.value})} required /><input placeholder="Mobile" className="w-full bg-gray-50 p-4 rounded-xl border" onChange={e => setAuthForm({...authForm, mobile: e.target.value})} required /></>
            )}
            <input placeholder="Email or Mobile" className="w-full bg-gray-50 p-4 rounded-xl border" onChange={e => setAuthForm({...authForm, identifier: e.target.value})} required />
            <input placeholder="Password" type="password" className="w-full bg-gray-50 p-4 rounded-xl border" onChange={e => setAuthForm({...authForm, password: e.target.value})} required />
            {authMode === 'register' && (
              <div className="flex gap-2 p-1 bg-gray-50 rounded-xl">
                {['user', 'vendor'].map(r => (
                  <button key={r} type="button" onClick={() => setAuthForm({...authForm, role: r})} className={`flex-1 py-2 rounded-lg text-xs font-bold ${authForm.role === r ? 'bg-[#2874f0] text-white' : 'text-gray-400'}`}>{r.toUpperCase()}</button>
                ))}
              </div>
            )}
            <button className="w-full py-4 rounded-xl font-bold text-white bg-[#fb641b] shadow-lg">{loading ? '...' : (authMode === 'login' ? 'Login' : 'Sign Up')}</button>
          </form>
          <p className="text-center mt-6 text-xs text-[#2874f0] cursor-pointer" onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}>{authMode === 'login' ? "New User? Create Account" : "Back to Login"}</p>
        </div>
      </div>
    );
  }

  const filteredData = data.filter(v => 
    v.businessName?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    v.services?.some((s: any) => s.title?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="max-w-md mx-auto min-h-screen bg-[#f1f3f6] pb-24 relative overflow-x-hidden">
      <header className="bg-[#2874f0] p-4 text-white sticky top-0 z-[100] shadow-md">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-3"><i className="fas fa-bars"></i><h1 className="text-xl font-black italic">GramCart</h1></div>
          <LanguageSwitch current={lang} onChange={setLang} />
        </div>
        <div className="relative">
          <input placeholder={Translations[lang].searchPlaceholder} className="w-full bg-white text-gray-800 p-3 pl-10 pr-12 rounded-sm text-sm outline-none shadow-inner" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}/>
          <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
          <button onClick={startVoiceSearch} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#2874f0]"><i className={`fas fa-microphone ${isListening ? 'text-red-500 animate-pulse' : ''}`}></i></button>
        </div>
      </header>

      <main>
        {view === 'home' && (
          <div className="p-2 space-y-4">
             {/* Scrolling Banner */}
             <div className="flex gap-2 overflow-x-auto no-scrollbar py-2">
                {BANNERS.map(b => (
                    <div key={b.id} className={`${b.color} min-w-[85%] p-4 rounded-xl text-white shadow-sm flex items-center justify-between`}>
                        <div className="max-w-[70%]">
                            <p className="text-xs font-black leading-tight uppercase">{b.text}</p>
                            <p className="text-[8px] mt-1 opacity-80">Valid for local village bookings only.</p>
                        </div>
                        <i className="fas fa-gift text-2xl opacity-40"></i>
                    </div>
                ))}
             </div>

            <div className="flex gap-4 overflow-x-auto no-scrollbar p-3 bg-white shadow-sm rounded-xl">
                {CATEGORIES.map(c => (
                    <button key={c.id} onClick={() => fetchData(c.id)} className="flex flex-col items-center gap-1 min-w-[65px]">
                        <div className={`w-12 h-12 rounded-full ${c.color} flex items-center justify-center shadow-inner`}><i className={`fas ${c.icon}`}></i></div>
                        <span className="text-[9px] font-bold text-gray-600">{c.name}</span>
                    </button>
                ))}
            </div>

            {filteredData.map(vendor => (
              <div key={vendor._id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <div className="flex justify-between items-center mb-4 border-b pb-2">
                    <h4 className="font-black text-gray-800">{vendor.businessName}</h4>
                    <span className="text-white bg-green-600 text-[10px] font-black px-2 py-0.5 rounded-sm">4.5 ⭐</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {vendor.services?.map((s: any) => (
                    <div key={s._id} className="border border-gray-50 p-2 rounded-xl bg-gray-50/50 hover:bg-white transition-all hover:shadow-md group">
                        <div className="relative overflow-hidden rounded-lg">
                           <img src={s.images?.[0] || 'https://via.placeholder.com/150'} className="h-28 w-full object-cover group-hover:scale-105 transition-transform" />
                        </div>
                        <p className="text-[10px] font-black mt-2 text-gray-800 truncate">{s.title}</p>
                        <p className="text-[#2874f0] font-black text-sm">₹{s.rate}/-</p>
                        <div className="flex gap-1 mt-3">
                           <button onClick={() => setDetailTarget(s)} className="flex-1 bg-white border border-gray-200 text-gray-600 text-[9px] font-bold py-2 rounded-lg hover:bg-gray-50">Details</button>
                           <button onClick={() => setBookingTarget(s)} className="flex-1 bg-[#fb641b] text-white text-[9px] font-bold py-2 rounded-lg shadow-lg active:scale-95">Book</button>
                        </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {view === 'vendor-settings' && (
          <div className="p-6 bg-white m-4 rounded-2xl shadow-sm space-y-6 animate-slideUp border border-blue-50">
            <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-[#2874f0]"><i className="fas fa-wallet"></i></div>
                <h2 className="text-xl font-black text-gray-800">Payment (बयाना सेटिंग)</h2>
            </div>
            <form onSubmit={updateUpi} className="space-y-6">
                <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase ml-1">Your Shop's UPI ID</label>
                    <input className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:border-[#2874f0] transition-all" value={upiForm.upiId} onChange={e => setUpiForm({...upiForm, upiId: e.target.value})} required placeholder="e.g. name@upi" />
                    <p className="text-[9px] text-gray-400 italic">Customers will pay advance to this ID.</p>
                </div>
                <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase ml-1">Advance (Biyana) Percentage</label>
                    <div className="relative">
                        <input type="number" className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:border-[#2874f0]" value={upiForm.advancePercent} onChange={e => setUpiForm({...upiForm, advancePercent: Number(e.target.value)})} required min="1" max="100" />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 font-black text-gray-300">%</span>
                    </div>
                    <div className="flex justify-between px-1">
                        <p className="text-[9px] text-blue-500 font-bold">Recommended: 10% - 20%</p>
                        <p className="text-[9px] text-gray-400">Total Bill - Advance = Final Bill</p>
                    </div>
                </div>
                <button className="w-full bg-[#2874f0] text-white py-4.5 rounded-2xl font-black shadow-xl shadow-blue-100 active:scale-95 transition-all uppercase tracking-widest text-xs">Save Payment Config</button>
            </form>
          </div>
        )}

        {view === 'bookings' && (
          <div className="p-4 space-y-5">
             <h2 className="text-lg font-black text-gray-800 mb-2 px-1">{user?.role === UserRole.VENDOR ? 'Active Orders' : 'My Bookings'}</h2>
             {bookings.length === 0 && (
                <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-gray-200">
                    <i className="fas fa-shopping-basket text-4xl text-gray-200 mb-4"></i>
                    <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">No Bookings Yet</p>
                </div>
             )}
             {bookings.map(b => {
                const advancePercent = b.vendorId?.advancePercent || 10;
                const advanceAmount = Math.round((b.totalAmount * advancePercent) / 100);
                const remainingAmount = b.totalAmount - advanceAmount;
                
                return (
               <div key={b._id} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-50 border-t-8 border-t-[#fb641b] animate-slideIn">
                 <div className="flex justify-between items-start mb-6">
                    <div>
                        <p className="text-[10px] font-black text-[#2874f0] uppercase tracking-wider mb-1">{b.serviceId?.title || 'Custom Service'}</p>
                        <h4 className="font-black text-gray-800 text-lg">{user?.role === UserRole.VENDOR ? b.customerId?.name : b.vendorId?.businessName}</h4>
                    </div>
                    <div className="text-right">
                        <span className={`text-[8px] font-black uppercase px-3 py-1.5 rounded-full ${
                            b.status === 'pending' ? 'bg-yellow-50 text-yellow-600' : 
                            b.status === 'completed' || b.status === 'reviewed' ? 'bg-green-50 text-green-600' : 
                            'bg-blue-50 text-blue-600'
                        }`}>
                            {b.status.replace('_', ' ')}
                        </span>
                        <p className="text-[9px] text-gray-400 mt-2 font-bold">ID: #{b._id.slice(-5).toUpperCase()}</p>
                    </div>
                 </div>
                 
                 <Stepper status={b.status} />

                 <div className="bg-gray-50/80 p-5 rounded-2xl text-[10px] text-gray-600 space-y-3 border border-gray-100 mb-6">
                    <div className="flex items-center gap-3">
                        <i className="fas fa-calendar-check text-[#2874f0] w-4"></i>
                        <span className="font-bold">{new Date(b.startDate).toDateString()} — {new Date(b.endDate).toDateString()}</span>
                    </div>
                    <div className="flex items-start gap-3">
                        <i className="fas fa-map-marker-alt text-red-500 w-4 mt-0.5"></i>
                        <span className="font-bold leading-relaxed">{b.address}</span>
                    </div>
                    <div className="border-t border-gray-200 pt-3 flex justify-between items-center">
                        <span className="font-black uppercase text-gray-400">Total Package Cost</span>
                        <span className="text-sm font-black text-gray-800">₹{b.totalAmount}</span>
                    </div>
                 </div>

                 {/* Advance (Biyana) Status Section */}
                 {user?.role === UserRole.USER && b.status === 'approved' && (
                    <div className="bg-blue-50 p-6 rounded-2xl border-2 border-dashed border-blue-200 mb-4 animate-slideUp">
                        <div className="flex justify-between mb-4">
                            <p className="text-xs font-black text-blue-800 uppercase tracking-tighter">Biyana (Advance) Due</p>
                            <p className="text-sm font-black text-blue-800">₹{advanceAmount}</p>
                        </div>
                        <div className="bg-white p-3 rounded-xl border border-blue-100 flex items-center justify-between mb-5">
                            <span className="text-[10px] font-black text-gray-400">UPI ID:</span>
                            <span className="text-[10px] font-black text-[#2874f0]">{b.vendorId?.upiId || 'Contact Vendor'}</span>
                        </div>
                        <input type="file" className="hidden" ref={proofInputRef} onChange={(e) => handleAdvanceUpload(e, b._id)} />
                        <button onClick={() => proofInputRef.current?.click()} className="w-full bg-[#2874f0] text-white py-3.5 rounded-xl text-[10px] font-black uppercase shadow-lg shadow-blue-100 transition-all active:scale-95">Upload Payment Screenshot</button>
                    </div>
                 )}

                 {/* Vendor Biyana Proof Verification */}
                 {user?.role === UserRole.VENDOR && b.status === 'advance_paid' && !b.advanceVerified && (
                    <div className="bg-orange-50 p-6 rounded-2xl border-2 border-dashed border-orange-200 mb-4">
                        <h5 className="text-xs font-black text-orange-800 uppercase mb-4 text-center">Verify Biyana Receipt</h5>
                        {b.advanceProof ? (
                           <img src={b.advanceProof} className="w-full h-48 object-contain rounded-xl border-2 border-white mb-4 shadow-sm bg-white" />
                        ) : (
                           <p className="text-[9px] text-orange-400 italic mb-4">Screenshot not found.</p>
                        )}
                        <button onClick={() => updateBookingStatus(b._id, { advanceVerified: true, status: 'advance_paid' })} className="w-full bg-green-500 text-white py-3.5 rounded-xl text-[10px] font-black uppercase shadow-lg shadow-green-100 active:scale-95 transition-all">Yes, Biyana Received</button>
                    </div>
                 )}

                 {/* Completion Section */}
                 {user?.role === UserRole.VENDOR && b.status === 'advance_paid' && b.advanceVerified && (
                     <div className="bg-blue-50 p-5 rounded-2xl mb-4 border border-blue-100">
                        <p className="text-[10px] font-black text-blue-800 mb-3 uppercase text-center">Balance Payment: ₹{remainingAmount}</p>
                        <button onClick={() => updateBookingStatus(b._id, { status: 'completed' })} className="w-full bg-[#2874f0] text-white py-3.5 rounded-xl text-[10px] font-black uppercase shadow-lg active:scale-95 transition-all">Mark as Job Done</button>
                     </div>
                 )}

                 {user?.role === UserRole.USER && b.status === 'completed' && (
                     <div className="bg-green-50 p-6 rounded-2xl border-2 border-dashed border-green-200 mb-4">
                        <h5 className="text-xs font-black text-green-800 text-center mb-2 uppercase">Order Summary</h5>
                        <div className="space-y-2 mb-4">
                            <div className="flex justify-between text-[10px]"><span className="text-gray-400">Total Price:</span><span className="font-bold">₹{b.totalAmount}</span></div>
                            <div className="flex justify-between text-[10px]"><span className="text-gray-400">Paid (Advance):</span><span className="font-bold text-blue-600">-₹{advanceAmount}</span></div>
                            <div className="flex justify-between text-[11px] border-t pt-2"><span className="font-black text-green-800">Pay Remaining:</span><span className="font-black text-green-800">₹{remainingAmount}</span></div>
                        </div>
                        <button onClick={() => setReviewTarget(b._id)} className="w-full bg-[#fb641b] text-white py-4 rounded-xl text-[10px] font-black uppercase shadow-lg shadow-orange-100 active:scale-95 transition-all">Final Payment & Review</button>
                     </div>
                 )}

                 {user?.role === UserRole.VENDOR && b.status === 'pending' && (
                   <div className="flex gap-3 mt-4">
                      <button onClick={() => updateBookingStatus(b._id, { status: 'approved' })} className="flex-1 bg-green-500 text-white py-3.5 rounded-xl text-[10px] font-black uppercase shadow-lg shadow-green-100 active:scale-95 transition-all">Approve Order</button>
                      <button onClick={() => updateBookingStatus(b._id, { status: 'rejected' })} className="flex-1 bg-white border-2 border-red-50 text-red-500 py-3.5 rounded-xl text-[10px] font-black uppercase active:scale-95 transition-all">Reject</button>
                   </div>
                 )}

                 {b.status === 'reviewed' && (
                    <div className="text-center py-4 bg-green-50 rounded-2xl">
                        <p className="text-[10px] font-black text-green-600 uppercase tracking-widest flex items-center justify-center gap-2">
                            <i className="fas fa-check-circle"></i> Service Successfully Closed
                        </p>
                    </div>
                 )}
               </div>
             )})}
          </div>
        )}
      </main>

      {/* Review Modal */}
      {reviewTarget && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[400] flex items-center justify-center p-6">
            <form onSubmit={submitReview} className="bg-white w-full rounded-[2.5rem] p-8 space-y-6 animate-slideUp shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-2 bg-[#fb641b]"></div>
                <h3 className="text-xl font-black text-center text-gray-800">Rate the Service</h3>
                <p className="text-[10px] text-gray-400 text-center uppercase font-black tracking-widest">Village Feedback Matters</p>
                <div className="flex justify-center gap-3 py-4">
                    {[1, 2, 3, 4, 5].map(star => (
                        <i key={star} onClick={() => setReviewForm({...reviewForm, rating: star})} className={`fas fa-star text-3xl transition-all cursor-pointer ${reviewForm.rating >= star ? 'text-yellow-400 scale-110' : 'text-gray-100'}`}></i>
                    ))}
                </div>
                <textarea className="w-full bg-gray-50 border border-gray-100 p-4 rounded-2xl text-xs h-32 outline-none focus:border-[#fb641b]" placeholder="How was the tent quality? Was the Halwai good? Tell other villagers..." onChange={e => setReviewForm({...reviewForm, comment: e.target.value})} />
                <button className="w-full bg-[#fb641b] text-white py-4.5 rounded-2xl font-black uppercase text-xs shadow-xl active:scale-95 transition-all tracking-widest">Post Public Review</button>
            </form>
        </div>
      )}

      {/* Detail Modal */}
      {detailTarget && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] overflow-hidden shadow-2xl relative animate-slideUp">
             <button onClick={() => setDetailTarget(null)} className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/30 text-white z-10 flex items-center justify-center backdrop-blur-md"><i className="fas fa-times"></i></button>
             <div className="h-56 bg-gray-200 flex overflow-x-auto no-scrollbar snap-x snap-mandatory">
                {detailTarget.images?.map((img: string, idx: number) => <img key={idx} src={img} className="w-full h-full object-cover flex-shrink-0 snap-center" />)}
             </div>
             <div className="p-8">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h3 className="text-2xl font-black text-gray-800 mb-1">{detailTarget.title}</h3>
                        <p className="text-green-600 font-black text-lg">₹{detailTarget.rate}/- <span className="text-gray-300 text-[10px] font-bold">({detailTarget.unitType})</span></p>
                    </div>
                    <div className="bg-green-600 text-white px-3 py-1 rounded-sm text-[10px] font-black">4.5 ⭐</div>
                </div>
                <div className="bg-gray-50 p-5 rounded-2xl my-6 border border-gray-100 max-h-40 overflow-y-auto">
                   <p className="text-[10px] font-black text-gray-400 uppercase mb-3 tracking-widest">Inventory List</p>
                   <ul className="grid grid-cols-2 gap-3">
                      {detailTarget.itemsIncluded?.map((item: string, idx: number) => <li key={idx} className="text-[10px] text-gray-600 font-bold flex items-center gap-2"><i className="fas fa-check-circle text-green-500 text-[8px]"></i> {item}</li>)}
                   </ul>
                </div>
                <button onClick={() => { setBookingTarget(detailTarget); setDetailTarget(null); }} className="w-full bg-[#fb641b] text-white py-4.5 rounded-2xl font-black uppercase text-xs shadow-xl shadow-orange-100 active:scale-95 transition-all tracking-widest">Book Package Now</button>
             </div>
          </div>
        </div>
      )}

      {/* Booking Form Modal */}
      {bookingTarget && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[300] flex items-end">
            <div className="bg-white w-full rounded-t-[3rem] p-8 pb-12 animate-slideUp shadow-2xl">
                <div className="flex justify-between items-center mb-8">
                    <h3 className="text-2xl font-black text-gray-800">Confirm Booking</h3>
                    <button onClick={() => setBookingTarget(null)} className="text-gray-300"><i className="fas fa-times text-2xl"></i></button>
                </div>
                <form onSubmit={handleBooking} className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Event Start</label>
                            <input type="date" className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-xs outline-none focus:border-[#2874f0]" onChange={e => setBookingForm({...bookingForm, startDate: e.target.value})} required />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Event End</label>
                            <input type="date" className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-xs outline-none focus:border-[#2874f0]" onChange={e => setBookingForm({...bookingForm, endDate: e.target.value})} required />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Village Address / Location</label>
                        <textarea placeholder="Tell us exactly where in the village..." className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-xs h-28 outline-none focus:border-[#2874f0] resize-none" onChange={e => setBookingForm({...bookingForm, address: e.target.value})} required />
                    </div>
                    <div className="bg-[#2874f0] p-6 rounded-[2rem] flex justify-between items-center text-white shadow-xl shadow-blue-100">
                        <div>
                            <p className="text-[10px] font-bold opacity-80 uppercase mb-1">Service Fee</p>
                            <p className="text-xl font-black">₹{bookingTarget.rate}/-</p>
                        </div>
                        <button className="bg-[#fb641b] text-white px-8 py-3.5 rounded-xl font-black uppercase text-[10px] shadow-lg active:scale-95 transition-all tracking-widest">Confirm Request</button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white h-22 flex items-center justify-around shadow-[0_-10px_40px_rgba(0,0,0,0.05)] border-t border-gray-50 z-[150] rounded-t-[2.5rem] px-6">
        <button onClick={() => setView('home')} className={`flex flex-col items-center gap-1.5 transition-all ${view === 'home' ? 'text-[#2874f0] scale-110' : 'text-gray-300'}`}>
           <i className="fas fa-home text-xl"></i><span className="text-[8px] font-black uppercase">Home</span>
        </button>
        <button onClick={() => setView('bookings')} className={`flex flex-col items-center gap-1.5 transition-all ${view === 'bookings' ? 'text-[#2874f0] scale-110' : 'text-gray-300'}`}>
           <i className="fas fa-shopping-bag text-xl"></i><span className="text-[8px] font-black uppercase">Orders</span>
        </button>
        {user?.role === UserRole.VENDOR && (
          <>
            <button onClick={() => setView('my-services')} className={`flex flex-col items-center gap-1.5 transition-all ${view === 'my-services' ? 'text-[#2874f0] scale-110' : 'text-gray-300'}`}>
               <i className="fas fa-store text-xl"></i><span className="text-[8px] font-black uppercase">Store</span>
            </button>
            <button onClick={() => setView('vendor-settings')} className={`flex flex-col items-center gap-1.5 transition-all ${view === 'vendor-settings' ? 'text-[#2874f0] scale-110' : 'text-gray-300'}`}>
               <i className="fas fa-cog text-xl"></i><span className="text-[8px] font-black uppercase">Payments</span>
            </button>
          </>
        )}
        <button onClick={() => { localStorage.clear(); setUser(null); }} className="text-red-200 hover:text-red-500 transition-colors">
           <i className="fas fa-power-off text-xl"></i>
        </button>
      </nav>

      <style>{`
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        .animate-slideUp { animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
        @keyframes slideIn { from { transform: translateX(-15px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        .animate-slideIn { animation: slideIn 0.3s ease-out; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.6; } 100% { opacity: 1; } }
        .animate-pulse { animation: pulse 2s infinite ease-in-out; }
      `}</style>
    </div>
  );
};

export default App;
