
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
    title: '', category: 'tent', description: '', rate: '', unitType: 'Per Day', 
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

  const addCustomItem = () => {
    if (serviceForm.customItem?.trim()) {
      setServiceForm({
        ...serviceForm,
        itemsIncluded: [...serviceForm.itemsIncluded, serviceForm.customItem.trim()],
        customItem: ''
      });
    }
  };

  const handleAddOrUpdateService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      alert("Please login first");
      return;
    }
    setLoading(true);
    try {
      // Step 1: Find the vendor profile ID
      const vendorsRes = await fetch(`${API_BASE_URL}/search`);
      const allVendors = await vendorsRes.json();
      const v = allVendors.find((vend: any) => vend.userId === (user._id || user.id));
      
      if (!v) {
        alert("Vendor profile not found. Please re-login.");
        return;
      }

      // Step 2: Prepare Payload
      const method = serviceForm._id ? 'PUT' : 'POST';
      const endpoint = serviceForm._id ? `/services/${serviceForm._id}` : '/services';
      const payload = {
        vendorId: v._id,
        category: serviceForm.category,
        title: serviceForm.title,
        description: serviceForm.description,
        rate: Number(serviceForm.rate),
        unitType: serviceForm.unitType,
        itemsIncluded: serviceForm.itemsIncluded,
        images: serviceForm.images,
        contactNumber: serviceForm.contactNumber
      };

      // Step 3: Send to API
      const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const result = await res.json();

      if (res.ok) {
        alert("Service Published Successfully! (आपकी सेवा लाइव हो गई है)");
        setServiceForm({ 
            title: '', category: 'tent', description: '', rate: '', unitType: 'Per Day', 
            itemsIncluded: [], images: [], contactNumber: '', _id: '', customItem: '' 
        });
        fetchMyServices(); 
        fetchData(); 
        setView('my-services');
      } else {
        alert(result.error || "Could not publish service. Check fields.");
      }
    } catch (e) {
      console.error(e);
      alert("Network Error: Could not connect to database.");
    } finally {
      setLoading(false);
    }
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

        {view === 'vendor-dashboard' && user?.role === UserRole.VENDOR && (
          <div className="p-4 space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h3 className="text-sm font-black text-[#2874f0] uppercase mb-5 tracking-widest flex items-center gap-2">
                 <i className="fas fa-plus-circle"></i> {serviceForm._id ? 'Update' : 'Post New'} Service
              </h3>
              <form onSubmit={handleAddOrUpdateService} className="space-y-4">
                
                {/* Unified Image Upload Section */}
                <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                  <p className="text-[10px] font-black text-blue-400 uppercase mb-3 flex justify-between">
                    Photos (Gallery)
                    <span>{serviceForm.images.length}/5</span>
                  </p>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {serviceForm.images.map((img, idx) => (
                      <div key={idx} className="relative w-14 h-14 group">
                        <img src={img} className="w-full h-full object-cover rounded-lg border border-white" />
                        <button type="button" onClick={() => removeImage(idx)} className="absolute -top-1 -right-1 bg-red-500 text-white w-4 h-4 rounded-full text-[8px] flex items-center justify-center shadow-sm">
                           <i className="fas fa-times"></i>
                        </button>
                      </div>
                    ))}
                    {serviceForm.images.length < 5 && (
                      <button type="button" onClick={() => fileInputRef.current?.click()} className="w-14 h-14 rounded-lg border-2 border-dashed border-blue-200 text-blue-300 flex items-center justify-center transition-colors hover:border-blue-400 hover:text-blue-400">
                        <i className="fas fa-camera"></i>
                      </button>
                    )}
                  </div>
                  <input type="file" multiple accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageUpload} />
                </div>

                {/* Main Info */}
                <input placeholder="Service Title (e.g. Maharaja Tent)" className="w-full bg-gray-50 p-4 rounded-xl border border-gray-100 text-sm outline-none focus:border-blue-400" value={serviceForm.title} onChange={e => setServiceForm({...serviceForm, title: e.target.value})} required />
                
                <div className="grid grid-cols-2 gap-3">
                   <select className="bg-gray-50 p-4 rounded-xl border border-gray-100 text-xs" value={serviceForm.category} onChange={e => setServiceForm({...serviceForm, category: e.target.value})}>
                     {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                   </select>
                   <select className="bg-gray-50 p-4 rounded-xl border border-gray-100 text-xs" value={serviceForm.unitType} onChange={e => setServiceForm({...serviceForm, unitType: e.target.value})}>
                     <option>Per Day</option><option>Per Piece</option><option>Per Plate</option><option>Fixed</option>
                   </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                   <input placeholder="Rate (₹)" type="number" className="bg-gray-50 p-4 rounded-xl border border-gray-100 text-sm" value={serviceForm.rate} onChange={e => setServiceForm({...serviceForm, rate: e.target.value})} required />
                   <input placeholder="Contact (Display)" type="tel" className="bg-gray-50 p-4 rounded-xl border border-gray-100 text-sm" value={serviceForm.contactNumber} onChange={e => setServiceForm({...serviceForm, contactNumber: e.target.value})} required />
                </div>

                {/* Checklist Section */}
                <div className="bg-gray-50 p-5 rounded-xl border border-gray-100">
                  <p className="text-[10px] font-black text-gray-400 uppercase mb-3">What's included? (Checklist)</p>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {(PRESETS[serviceForm.category] || []).map(item => (
                      <button key={item} type="button" onClick={() => togglePresetItem(item)} className={`px-3 py-1.5 rounded-lg text-[9px] font-bold border transition-all ${serviceForm.itemsIncluded.includes(item) ? 'bg-[#2874f0] text-white border-[#2874f0]' : 'bg-white text-gray-400 border-gray-100'}`}>{item}</button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input placeholder="Add custom item..." className="flex-1 bg-white p-3 rounded-lg text-xs border border-gray-200 outline-none" value={serviceForm.customItem || ''} onChange={e => setServiceForm({...serviceForm, customItem: e.target.value})} />
                    <button type="button" onClick={addCustomItem} className="bg-[#2874f0] text-white px-5 py-2 rounded-lg text-xs font-bold active:scale-95 transition-all">ADD</button>
                  </div>
                </div>

                <textarea placeholder="Tell customers about your service (Waterproof, JBL Sound, etc.)" className="w-full bg-gray-50 p-4 rounded-xl border border-gray-100 text-sm h-24 outline-none" value={serviceForm.description} onChange={e => setServiceForm({...serviceForm, description: e.target.value})} />

                <button className="w-full bg-[#fb641b] text-white py-4.5 rounded-xl font-bold shadow-lg shadow-orange-100 active:scale-95 transition-all uppercase tracking-widest text-xs">Publish Service (अभी लाइव करें)</button>
              </form>
            </div>
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
                </div>
                <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase ml-1">Advance (Biyana) Percentage</label>
                    <div className="relative">
                        <input type="number" className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:border-[#2874f0]" value={upiForm.advancePercent} onChange={e => setUpiForm({...upiForm, advancePercent: Number(e.target.value)})} required min="1" max="100" />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 font-black text-gray-300">%</span>
                    </div>
                </div>
                <button className="w-full bg-[#2874f0] text-white py-4.5 rounded-2xl font-black shadow-xl">Save Payment Config</button>
            </form>
          </div>
        )}

        {view === 'my-services' && user?.role === UserRole.VENDOR && (
          <div className="p-4 space-y-4">
            <h2 className="text-lg font-black text-gray-800 mb-2">Manage My Catalog</h2>
            {myServices.length === 0 && <div className="text-center py-20 text-gray-400 text-xs font-bold uppercase">No Services Found</div>}
            {myServices.map(s => (
              <div key={s._id} className="bg-white p-4 rounded-2xl shadow-sm flex items-center gap-4 animate-slideIn border border-gray-50">
                <img src={s.images?.[0] || 'https://via.placeholder.com/150'} className="w-16 h-16 rounded-xl object-cover" />
                <div className="flex-1">
                   <p className="font-black text-gray-800 text-xs">{s.title}</p>
                   <p className="text-green-600 text-[10px] font-black mt-1">₹{s.rate} / {s.unitType}</p>
                </div>
                <div className="flex gap-2">
                   <button onClick={() => { setServiceForm({ ...s, itemsIncluded: s.itemsIncluded || [], images: s.images || [], customItem: '' }); setView('vendor-dashboard'); }} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg"><i className="fas fa-edit"></i></button>
                   <button onClick={() => deleteService(s._id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><i className="fas fa-trash"></i></button>
                </div>
              </div>
            ))}
          </div>
        )}

        {view === 'bookings' && (
          <div className="p-4 space-y-5">
             <h2 className="text-lg font-black text-gray-800 mb-2 px-1">{user?.role === UserRole.VENDOR ? 'Active Orders' : 'My Bookings'}</h2>
             {bookings.map(b => {
                const advancePercent = b.vendorId?.advancePercent || 10;
                const advanceAmount = Math.round((b.totalAmount * advancePercent) / 100);
                const remainingAmount = b.totalAmount - advanceAmount;
                return (
               <div key={b._id} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-50 border-t-8 border-t-[#fb641b] animate-slideIn">
                 <div className="flex justify-between items-start mb-6">
                    <div>
                        <p className="text-[10px] font-black text-[#2874f0] uppercase mb-1">{b.serviceId?.title}</p>
                        <h4 className="font-black text-gray-800 text-lg">{user?.role === UserRole.VENDOR ? b.customerId?.name : b.vendorId?.businessName}</h4>
                    </div>
                    <span className="text-[8px] font-black uppercase px-3 py-1.5 rounded-full bg-gray-50">{b.status.replace('_', ' ')}</span>
                 </div>
                 <Stepper status={b.status} />
                 <div className="bg-gray-50/80 p-5 rounded-2xl text-[10px] text-gray-600 space-y-3 border border-gray-100 mb-6">
                    <div className="flex items-center gap-3">
                        <i className="fas fa-calendar-check text-[#2874f0]"></i>
                        <span className="font-bold">{new Date(b.startDate).toDateString()} — {new Date(b.endDate).toDateString()}</span>
                    </div>
                    <div className="flex items-start gap-3">
                        <i className="fas fa-map-marker-alt text-red-500"></i>
                        <span className="font-bold leading-relaxed">{b.address}</span>
                    </div>
                    <div className="border-t pt-3 flex justify-between items-center">
                        <span className="font-black uppercase text-gray-400">Total Bill</span>
                        <span className="text-sm font-black text-gray-800">₹{b.totalAmount}</span>
                    </div>
                 </div>

                 {user?.role === UserRole.USER && b.status === 'approved' && (
                    <div className="bg-blue-50 p-6 rounded-2xl border-2 border-dashed border-blue-200 mb-4">
                        <p className="text-xs font-black text-blue-800 uppercase mb-4">Biyana Due: ₹{advanceAmount}</p>
                        <p className="text-[10px] text-[#2874f0] mb-5">UPI: {b.vendorId?.upiId || 'Check Profile'}</p>
                        <input type="file" className="hidden" ref={proofInputRef} onChange={(e) => handleAdvanceUpload(e, b._id)} />
                        <button onClick={() => proofInputRef.current?.click()} className="w-full bg-[#2874f0] text-white py-3.5 rounded-xl text-[10px] font-black uppercase shadow-lg">Upload Proof</button>
                    </div>
                 )}

                 {user?.role === UserRole.VENDOR && b.status === 'advance_paid' && !b.advanceVerified && (
                    <div className="bg-orange-50 p-6 rounded-2xl border-2 border-dashed border-orange-200 mb-4">
                        {b.advanceProof && <img src={b.advanceProof} className="w-full h-48 object-contain rounded-xl border-2 border-white mb-4 bg-white" />}
                        <button onClick={() => updateBookingStatus(b._id, { advanceVerified: true, status: 'advance_paid' })} className="w-full bg-green-500 text-white py-3.5 rounded-xl text-[10px] font-black uppercase">Yes, Biyana Received</button>
                    </div>
                 )}

                 {user?.role === UserRole.VENDOR && b.status === 'advance_paid' && b.advanceVerified && (
                    <button onClick={() => updateBookingStatus(b._id, { status: 'completed' })} className="w-full bg-[#2874f0] text-white py-3.5 rounded-xl text-[10px] font-black uppercase">Mark as Job Done</button>
                 )}

                 {user?.role === UserRole.USER && b.status === 'completed' && (
                    <div className="bg-green-50 p-6 rounded-2xl border-2 border-dashed border-green-200 mb-4">
                        <div className="flex justify-between text-[11px] mb-4"><span className="font-black text-green-800">Balance:</span><span className="font-black text-green-800">₹{remainingAmount}</span></div>
                        <button onClick={() => setReviewTarget(b._id)} className="w-full bg-[#fb641b] text-white py-4 rounded-xl text-[10px] font-black uppercase">Final Payment & Review</button>
                    </div>
                 )}

                 {user?.role === UserRole.VENDOR && b.status === 'pending' && (
                   <div className="flex gap-3 mt-4">
                      <button onClick={() => updateBookingStatus(b._id, { status: 'approved' })} className="flex-1 bg-green-500 text-white py-3.5 rounded-xl text-[10px] font-black">Approve</button>
                      <button onClick={() => updateBookingStatus(b._id, { status: 'rejected' })} className="flex-1 border py-3.5 rounded-xl text-[10px] font-black">Reject</button>
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
            <form onSubmit={submitReview} className="bg-white w-full rounded-[2.5rem] p-8 space-y-6 animate-slideUp shadow-2xl">
                <h3 className="text-xl font-black text-center text-gray-800">Rate the Service</h3>
                <div className="flex justify-center gap-3 py-4">
                    {[1, 2, 3, 4, 5].map(star => (
                        <i key={star} onClick={() => setReviewForm({...reviewForm, rating: star})} className={`fas fa-star text-3xl cursor-pointer ${reviewForm.rating >= star ? 'text-yellow-400 scale-110' : 'text-gray-100'}`}></i>
                    ))}
                </div>
                <textarea className="w-full bg-gray-50 border p-4 rounded-2xl text-xs h-32" placeholder="Tell other villagers about this service..." onChange={e => setReviewForm({...reviewForm, comment: e.target.value})} />
                <button className="w-full bg-[#fb641b] text-white py-4.5 rounded-2xl font-black uppercase text-xs">Post Review</button>
            </form>
        </div>
      )}

      {/* Detail Modal */}
      {detailTarget && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] overflow-hidden shadow-2xl relative animate-slideUp">
             <button onClick={() => setDetailTarget(null)} className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/30 text-white z-10 flex items-center justify-center"><i className="fas fa-times"></i></button>
             <div className="h-56 bg-gray-200 flex overflow-x-auto no-scrollbar snap-x snap-mandatory">
                {detailTarget.images?.map((img: string, idx: number) => <img key={idx} src={img} className="w-full h-full object-cover flex-shrink-0 snap-center" />)}
             </div>
             <div className="p-8">
                <h3 className="text-2xl font-black mb-1">{detailTarget.title}</h3>
                <p className="text-green-600 font-black text-lg">₹{detailTarget.rate}/- <span className="text-gray-300 text-[10px]">({detailTarget.unitType})</span></p>
                <div className="bg-gray-50 p-5 rounded-2xl my-6">
                   <p className="text-[10px] font-black text-gray-400 uppercase mb-3">Checklist</p>
                   <ul className="grid grid-cols-2 gap-3">
                      {detailTarget.itemsIncluded?.map((item: string, idx: number) => <li key={idx} className="text-[10px] text-gray-600 font-bold flex items-center gap-2"><i className="fas fa-check-circle text-green-500"></i> {item}</li>)}
                   </ul>
                </div>
                <button onClick={() => { setBookingTarget(detailTarget); setDetailTarget(null); }} className="w-full bg-[#fb641b] text-white py-4.5 rounded-2xl font-black uppercase text-xs">Book Package Now</button>
             </div>
          </div>
        </div>
      )}

      {/* Booking Form Modal */}
      {bookingTarget && (
        <div className="fixed inset-0 bg-black/80 z-[300] flex items-end">
            <div className="bg-white w-full rounded-t-[3rem] p-8 pb-12 animate-slideUp">
                <h3 className="text-2xl font-black mb-8">Confirm Booking</h3>
                <form onSubmit={handleBooking} className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <input type="date" className="w-full p-4 bg-gray-50 border rounded-2xl text-xs" onChange={e => setBookingForm({...bookingForm, startDate: e.target.value})} required />
                        <input type="date" className="w-full p-4 bg-gray-50 border rounded-2xl text-xs" onChange={e => setBookingForm({...bookingForm, endDate: e.target.value})} required />
                    </div>
                    <textarea placeholder="Event Location Address" className="w-full p-4 bg-gray-50 border rounded-2xl text-xs h-28 outline-none" onChange={e => setBookingForm({...bookingForm, address: e.target.value})} required />
                    <button className="w-full bg-[#2874f0] text-white py-4.5 rounded-2xl font-black uppercase text-xs">Confirm Request</button>
                </form>
            </div>
        </div>
      )}

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white h-22 flex items-center justify-around shadow-md border-t z-[150] rounded-t-[2.5rem]">
        <button onClick={() => setView('home')} className={`flex flex-col items-center gap-1 transition-all ${view === 'home' ? 'text-[#2874f0]' : 'text-gray-400'}`}>
           <i className="fas fa-home text-xl"></i><span className="text-[8px] font-black uppercase">Home</span>
        </button>
        <button onClick={() => setView('bookings')} className={`flex flex-col items-center gap-1 transition-all ${view === 'bookings' ? 'text-[#2874f0]' : 'text-gray-400'}`}>
           <i className="fas fa-shopping-bag text-xl"></i><span className="text-[8px] font-black uppercase">Orders</span>
        </button>
        {user?.role === UserRole.VENDOR && (
          <>
            <button onClick={() => setView('my-services')} className={`flex flex-col items-center gap-1 transition-all ${view === 'my-services' ? 'text-[#2874f0]' : 'text-gray-400'}`}>
               <i className="fas fa-store text-xl"></i><span className="text-[8px] font-black uppercase">Catalog</span>
            </button>
            <button onClick={() => setView('vendor-dashboard')} className={`flex flex-col items-center gap-1 transition-all ${view === 'vendor-dashboard' ? 'text-[#2874f0]' : 'text-gray-400'}`}>
               <i className="fas fa-plus-circle text-xl"></i><span className="text-[8px] font-black uppercase">Post</span>
            </button>
            <button onClick={() => setView('vendor-settings')} className={`flex flex-col items-center gap-1 transition-all ${view === 'vendor-settings' ? 'text-[#2874f0]' : 'text-gray-400'}`}>
               <i className="fas fa-cog text-xl"></i><span className="text-[8px] font-black uppercase">Payments</span>
            </button>
          </>
        )}
        <button onClick={() => { localStorage.clear(); setUser(null); }} className="text-red-200"><i className="fas fa-power-off text-xl"></i></button>
      </nav>

      <style>{`
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        .animate-slideUp { animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
        @keyframes slideIn { from { transform: translateX(-15px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        .animate-slideIn { animation: slideIn 0.3s ease-out; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
};

export default App;
