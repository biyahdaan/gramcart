
import React, { useState, useEffect, useRef } from 'react';
import { Language, User, Translations, UserRole, Translation } from './types';
import { CATEGORIES as INITIAL_CATEGORIES, BANNERS } from './constants';
import { LanguageSwitch } from './components/LanguageSwitch';

const API_BASE_URL = "https://biyahdaan.onrender.com/api"; 

const App: React.FC = () => {
  const [lang, setLang] = useState<Language>(Language.EN);
  const [user, setUser] = useState<User | null>(null);
  const [vendorProfile, setVendorProfile] = useState<any>(null);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [view, setView] = useState<'home' | 'vendor-dashboard' | 'bookings' | 'my-services' | 'wishlist'>('home');
  const [data, setData] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [myServices, setMyServices] = useState<any[]>([]);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [publishStatus, setPublishStatus] = useState<string>(''); 
  const [searchQuery, setSearchQuery] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [userCoords, setUserCoords] = useState<{lat: number, lng: number} | null>(null);
  const [categories, setCategories] = useState(INITIAL_CATEGORIES);
  
  const [bookingTarget, setBookingTarget] = useState<any>(null);
  const [detailTarget, setDetailTarget] = useState<any>(null); 
  const [otpTarget, setOtpTarget] = useState<{id: string, code: string, correctCode: string} | null>(null);
  const [reviewTarget, setReviewTarget] = useState<any>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  
  const [authForm, setAuthForm] = useState({ identifier: '', email: '', mobile: '', password: '', name: '', role: 'user' });
  const [serviceForm, setServiceForm] = useState({
    title: '', category: 'tent', description: '', rate: '', unitType: 'Per Day', 
    itemsIncluded: [] as string[], images: [] as string[], contactNumber: '', _id: '', customItem: '', 
    customCategory: '', upiId: '', variant: 'Simple'
  });
  const [bookingForm, setBookingForm] = useState({ startDate: '', endDate: '', address: '', pincode: '', altMobile: '' });
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const proofInputRef = useRef<HTMLInputElement>(null);
  const finalProofInputRef = useRef<HTMLInputElement>(null);

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; 
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const filteredData = data.filter(vendor => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = vendor.businessName?.toLowerCase().includes(searchLower) || 
                          vendor.services?.some((s: any) => s.title?.toLowerCase().includes(searchLower));
    if (userCoords && vendor.location) {
        const dist = calculateDistance(userCoords.lat, userCoords.lng, vendor.location.lat, vendor.location.lng);
        return matchesSearch && dist <= 25;
    }
    return matchesSearch;
  });

  useEffect(() => {
    const saved = localStorage.getItem('gramcart_user');
    if (saved) {
      try {
        const parsedUser = JSON.parse(saved);
        setUser(parsedUser);
        const savedWish = localStorage.getItem(`wish_${parsedUser._id}`);
        if (savedWish) setWishlist(JSON.parse(savedWish));
        if (parsedUser?.role === 'vendor') {
            setView('vendor-dashboard');
            fetchVendorProfile(parsedUser._id || parsedUser.id);
        }
      } catch (e) { localStorage.removeItem('gramcart_user'); }
    }
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => console.log("Location access denied")
      );
    }
    fetchData();
  }, []);

  const fetchVendorProfile = async (userId: string) => {
    try {
        const res = await fetch(`${API_BASE_URL}/search`);
        const allVendors = await res.json();
        const v = allVendors.find((vend: any) => vend.userId === userId);
        if (v) setVendorProfile(v);
    } catch (e) {}
  };

  useEffect(() => {
    if (user) {
      fetchBookings();
      if (user.role === UserRole.VENDOR) fetchMyServices();
    }
  }, [user, view]);

  const toggleWishlist = (id: string) => {
    if (!user) return;
    const newWish = wishlist.includes(id) ? wishlist.filter(i => i !== id) : [...wishlist, id];
    setWishlist(newWish);
    localStorage.setItem(`wish_${user._id}`, JSON.stringify(newWish));
  };

  const fetchData = async (cat: string = '') => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/search?cat=${cat}`);
      if (res.ok) setData(await res.json());
    } catch (e) {} finally { setLoading(false); }
  };

  const startVoiceSearch = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return alert("Voice Search not supported.");
    const recognition = new SpeechRecognition();
    recognition.lang = lang === Language.HI ? 'hi-IN' : 'en-US';
    recognition.start();
    setIsListening(true);
    recognition.onresult = (event: any) => {
      setSearchQuery(event.results[0][0].transcript);
      setIsListening(false);
    };
    recognition.onerror = () => setIsListening(false);
  };

  const compressImage = (base64Str: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width; let height = img.height;
        const max_dim = 1200; 
        if (width > height) { if (width > max_dim) { height *= max_dim / width; width = max_dim; } } 
        else { if (height > max_dim) { width *= max_dim / height; height = max_dim; } }
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.6));
      };
    });
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

  // Fixed missing removeImage function for App.tsx
  const removeImage = (index: number) => {
    setServiceForm(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const handleAddOrUpdateService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return alert("Please login");
    setLoading(true); setPublishStatus('Uploading to GramCart Seller Hub...');
    try {
      const compressedImages = await Promise.all(serviceForm.images.map(img => img.startsWith('data:image') ? compressImage(img) : img));
      const vRes = await fetch(`${API_BASE_URL}/search`);
      const allV = await vRes.json();
      const v = allV.find((vend: any) => vend.userId === (user._id || user.id));
      if (!v) throw new Error("Vendor missing");

      const payload = {
        title: serviceForm.title, category: serviceForm.category, description: serviceForm.description,
        rate: Number(serviceForm.rate), unitType: serviceForm.unitType, itemsIncluded: serviceForm.itemsIncluded,
        images: compressedImages, contactNumber: serviceForm.contactNumber, vendorId: v._id,
        upiId: serviceForm.upiId || v.upiId, variant: serviceForm.variant
      };
      const isUpdating = !!serviceForm._id;
      const res = await fetch(`${API_BASE_URL}${isUpdating ? `/services/${serviceForm._id}` : '/services'}`, {
        method: isUpdating ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setPublishStatus('Live on Flipkart-Style Store!');
        setTimeout(() => {
          setServiceForm({ title: '', category: 'tent', description: '', rate: '', unitType: 'Per Day', itemsIncluded: [], images: [], contactNumber: '', _id: '', customItem: '', customCategory: '', upiId: '', variant: 'Simple' });
          setPublishStatus(''); fetchMyServices(); setView('my-services'); setLoading(false);
        }, 1200);
      }
    } catch (e) { alert("Server Error"); setLoading(false); }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const endpoint = authMode === 'login' ? '/login' : '/register';
    const payload = authMode === 'login' ? { identifier: authForm.identifier, password: authForm.password } : { ...authForm, location: userCoords };
    try {
      const res = await fetch(`${API_BASE_URL}${endpoint}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const result = await res.json();
      if (res.ok) {
        localStorage.setItem('gramcart_user', JSON.stringify(result.user));
        setUser(result.user);
        if (result.user.role === 'vendor') fetchVendorProfile(result.user._id || result.user.id);
        setView(result.user.role === 'vendor' ? 'vendor-dashboard' : 'home');
      } else alert(result.error);
    } catch (err) {} finally { setLoading(false); }
  };

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !bookingTarget) return;
    setLoading(true);
    try {
        const vRes = await fetch(`${API_BASE_URL}/search`);
        const allV = await vRes.json();
        const v = allV.find((vend: any) => vend.services.some((s: any) => s._id === bookingTarget._id));
        const res = await fetch(`${API_BASE_URL}/bookings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...bookingForm, customerId: user._id || user.id, vendorId: v._id, serviceId: bookingTarget._id, totalAmount: bookingTarget.rate, otp: Math.floor(1000 + Math.random() * 9000).toString() })
        });
        if (res.ok) { setBookingTarget(null); setView('bookings'); fetchBookings(); }
    } catch (e) {} finally { setLoading(false); }
  };

  const handleReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !reviewTarget) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/bookings/${reviewTarget._id}/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ review: reviewForm }) });
      if (res.ok) { setReviewTarget(null); fetchBookings(); alert("Review Posted!"); }
    } catch (e) {} finally { setLoading(false); }
  };

  const updateBookingStatus = async (bookingId: string, payload: any) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/bookings/${bookingId}/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (res.ok) fetchBookings();
    } catch (e) {} finally { setLoading(false); }
  };

  const handleProofUpload = (e: React.ChangeEvent<HTMLInputElement>, bookingId: string, field: 'advanceProof' | 'finalProof') => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = async () => {
      setLoading(true);
      const compressed = await compressImage(reader.result as string);
      const status = field === 'advanceProof' ? 'awaiting_advance_verification' : 'awaiting_final_verification';
      await fetch(`${API_BASE_URL}/bookings/${bookingId}/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ [field]: compressed, status }) });
      fetchBookings(); setLoading(false);
    };
    reader.readAsDataURL(file);
  };

  const fetchBookings = async () => {
    if (!user) return;
    const res = await fetch(`${API_BASE_URL}/my-bookings/${user.role}/${user._id || user.id}`);
    if (res.ok) setBookings(await res.json());
  };

  const fetchMyServices = async () => {
    if (!user) return;
    const vRes = await fetch(`${API_BASE_URL}/search`);
    const allV = await vRes.json();
    const v = allV.find((vend: any) => vend.userId === (user._id || user.id));
    if (v) {
      const res = await fetch(`${API_BASE_URL}/my-services/${v._id}`);
      if (res.ok) setMyServices(await res.json());
    }
  };

  const Stepper = ({ status }: { status: string }) => {
    const steps = ['pending', 'approved', 'advance_paid', 'final_paid', 'completed'];
    const displayStatusMap: Record<string, string> = { 'awaiting_advance_verification': 'approved', 'awaiting_final_verification': 'advance_paid' };
    const currentIndex = steps.indexOf(displayStatusMap[status] || status);
    return (
      <div className="flex items-center justify-between w-full mb-8 relative">
        <div className="absolute top-[14px] left-0 right-0 h-[1px] bg-gray-100 -z-10"></div>
        {steps.map((step, index) => (
          <div key={step} className="flex flex-col items-center flex-1">
            <div className={`w-7 h-7 rounded-full border-4 border-white shadow-sm flex items-center justify-center text-[8px] font-black ${index <= currentIndex ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400'}`}>
              {index < currentIndex ? <i className="fas fa-check"></i> : index + 1}
            </div>
          </div>
        ))}
      </div>
    );
  };

  if (!user) {
    return (
      <div className="max-w-md mx-auto min-h-screen bg-[#2874f0] flex items-center justify-center p-6">
        <div className="bg-white w-full p-8 rounded-[2rem] shadow-2xl animate-slideUp">
          <div className="text-center mb-8"><h1 className="text-4xl font-black text-[#2874f0] italic tracking-tighter">GramCart</h1></div>
          <form onSubmit={handleAuth} className="space-y-4">
            {authMode === 'register' && (
              <><input placeholder="Shop Name / Your Name" className="w-full bg-gray-50 p-4 rounded-xl border outline-none font-bold" onChange={e => setAuthForm({...authForm, name: e.target.value})} required /><input placeholder="Mobile Number" className="w-full bg-gray-50 p-4 rounded-xl border outline-none font-bold" onChange={e => setAuthForm({...authForm, mobile: e.target.value})} required /></>
            )}
            <input placeholder="Email or Mobile" className="w-full bg-gray-50 p-4 rounded-xl border outline-none font-bold" onChange={e => setAuthForm({...authForm, identifier: e.target.value})} required />
            <input placeholder="Password" type="password" className="w-full bg-gray-50 p-4 rounded-xl border outline-none font-bold" onChange={e => setAuthForm({...authForm, password: e.target.value})} required />
            {authMode === 'register' && (
              <div className="flex gap-2 p-1 bg-gray-50 rounded-xl">
                {['user', 'vendor'].map(r => (
                  <button key={r} type="button" onClick={() => setAuthForm({...authForm, role: r})} className={`flex-1 py-2 rounded-lg text-xs font-black ${authForm.role === r ? 'bg-[#2874f0] text-white shadow-lg' : 'text-gray-400'}`}>{r.toUpperCase()}</button>
                ))}
              </div>
            )}
            <button className="w-full py-5 rounded-xl font-black text-white bg-[#fb641b] shadow-xl uppercase text-xs tracking-widest">{loading ? 'Processing...' : (authMode === 'login' ? 'Login' : 'Sign Up')}</button>
          </form>
          <p className="text-center mt-6 text-[11px] font-black text-[#2874f0] cursor-pointer" onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}>{authMode === 'login' ? "New User? Create Account" : "Back to Login"}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto min-h-screen bg-[#f1f3f6] pb-24 relative overflow-x-hidden">
      {loading && publishStatus && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[1000] flex flex-col items-center justify-center p-8">
            <div className="w-24 h-24 border-8 border-white/20 border-t-[#fb641b] rounded-full animate-spin mb-8 shadow-2xl"></div>
            <p className="text-white font-black text-2xl uppercase tracking-tighter animate-pulse text-center leading-tight">{publishStatus}</p>
        </div>
      )}

      <header className="bg-[#2874f0] p-4 text-white sticky top-0 z-[100] shadow-md rounded-b-[1.5rem]">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-3"><i className="fas fa-bars text-xl"></i><h1 className="text-2xl font-black italic tracking-tighter">GramCart</h1></div>
          <LanguageSwitch current={lang} onChange={setLang} />
        </div>
        <div className="relative">
          <input placeholder={Translations[lang].searchPlaceholder} className="w-full bg-white text-gray-800 p-4 pl-12 pr-14 rounded-xl text-sm outline-none shadow-inner font-bold" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}/>
          <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-300"></i>
          <button onClick={startVoiceSearch} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#2874f0] w-10 h-10 flex items-center justify-center bg-gray-50 rounded-full shadow-md"><i className={`fas fa-microphone ${isListening ? 'text-red-500 animate-pulse' : ''}`}></i></button>
        </div>
      </header>

      <main className="p-4">
        {view === 'home' && (
          <div className="space-y-6">
            <div className="flex gap-4 overflow-x-auto no-scrollbar py-2">
                {categories.map(c => (
                    <button key={c.id} onClick={() => fetchData(c.id)} className="flex flex-col items-center gap-2 min-w-[85px]">
                        <div className={`w-14 h-14 rounded-2xl ${c.color} flex items-center justify-center shadow-md border-2 border-white`}><i className={`fas ${c.icon} text-lg`}></i></div>
                        <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">{c.name}</span>
                    </button>
                ))}
            </div>
            {filteredData.map(vendor => (
              <div key={vendor._id} className="bg-white p-5 rounded-[2rem] shadow-sm border border-gray-100 mb-6 animate-slideIn">
                <div className="flex justify-between items-center mb-5">
                    <div>
                        <h4 className="font-black text-gray-800 text-lg leading-tight">{vendor.businessName}</h4>
                        <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest mt-1"><i className="fas fa-location-dot mr-1"></i> {userCoords && vendor.location ? `${calculateDistance(userCoords.lat, userCoords.lng, vendor.location.lat, vendor.location.lng).toFixed(1)} KM Away` : 'Nearby'}</p>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {vendor.services?.map((s: any) => (
                    <div key={s._id} className="border border-gray-50 p-2.5 rounded-3xl bg-gray-50/50 relative shadow-sm">
                        <button onClick={() => toggleWishlist(s._id)} className="absolute top-4 right-4 z-10 text-white drop-shadow-md"><i className={`fas fa-heart ${wishlist.includes(s._id) ? 'text-red-500' : 'text-gray-200'}`}></i></button>
                        <img src={s.images?.[0] || 'https://via.placeholder.com/300'} className="h-32 w-full object-cover rounded-2xl mb-3 cursor-pointer" onClick={() => {setDetailTarget(s); setActiveImageIdx(0);}} />
                        <p className="text-[11px] font-black text-gray-700 truncate mb-1 uppercase tracking-tighter">{s.title}</p>
                        <p className="text-[#2874f0] font-black text-sm">₹{s.rate}/- <span className="text-[8px] text-gray-400 font-bold uppercase">{s.unitType}</span></p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {view === 'vendor-dashboard' && (
          <div className="space-y-6">
              {/* Earnings Card */}
              <div className="bg-gradient-to-br from-[#2874f0] to-[#1e5bbd] p-8 rounded-[2.5rem] text-white shadow-xl relative overflow-hidden">
                  <div className="relative z-10">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-2 opacity-80">Total Earnings</p>
                      <h2 className="text-4xl font-black italic">₹{bookings.filter(b => b.status === 'completed').reduce((sum, b) => sum + (b.totalAmount || 0), 0)}</h2>
                  </div>
                  <i className="fas fa-wallet absolute -bottom-4 -right-4 text-white/10 text-9xl"></i>
              </div>

              {/* Order Tabs */}
              <div className="bg-white p-2 rounded-2xl flex gap-1 shadow-sm">
                 {['pending', 'ongoing', 'completed'].map(t => (
                    <button key={t} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest ${t === 'pending' ? 'bg-[#2874f0] text-white' : 'text-gray-400'}`}>{t}</button>
                 ))}
              </div>

              {/* Service Inventory Table */}
              <div className="bg-white p-6 rounded-[2.5rem] shadow-sm">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="font-black uppercase text-xs tracking-widest">Your Inventory</h3>
                      <button onClick={() => setView('my-services')} className="text-[9px] font-black text-[#2874f0] uppercase">Add New <i className="fas fa-plus ml-1"></i></button>
                  </div>
                  <div className="space-y-4">
                      {myServices.map(s => (
                          <div key={s._id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                              <img src={s.images[0]} className="w-12 h-12 rounded-xl object-cover" />
                              <div className="flex-1">
                                  <p className="text-[11px] font-black truncate w-32">{s.title}</p>
                                  <p className="text-[9px] text-[#2874f0] font-bold">₹{s.rate} ({s.variant})</p>
                              </div>
                              <button onClick={() => { setServiceForm(s); setView('my-services'); }} className="text-gray-300 hover:text-blue-500"><i className="fas fa-edit"></i></button>
                          </div>
                      ))}
                  </div>
              </div>
          </div>
        )}

        {view === 'my-services' && (
          <div className="bg-white p-6 rounded-[2.5rem] shadow-sm animate-slideIn">
            <h3 className="text-sm font-black text-[#2874f0] uppercase mb-8 tracking-widest text-center">{serviceForm._id ? 'Edit Service' : 'List New Service'}</h3>
            <form onSubmit={handleAddOrUpdateService} className="space-y-6">
               <div className="bg-blue-50/50 p-6 rounded-[2rem] border border-blue-100">
                  <input type="file" multiple className="hidden" ref={fileInputRef} onChange={handleImageUpload} />
                  <div className="flex flex-wrap gap-2">
                     {serviceForm.images.map((img, i) => (
                        <div key={i} className="relative w-14 h-14"><img src={img} className="w-full h-full object-cover rounded-xl" /><button type="button" onClick={() => removeImage(i)} className="absolute -top-1 -right-1 bg-red-500 text-white w-4 h-4 rounded-full text-[8px]"><i className="fas fa-times"></i></button></div>
                     ))}
                     {serviceForm.images.length < 5 && <button type="button" onClick={() => fileInputRef.current?.click()} className="w-14 h-14 rounded-xl border-2 border-dashed border-blue-200 text-blue-300"><i className="fas fa-camera"></i></button>}
                  </div>
               </div>
               <input placeholder="Title" className="w-full bg-gray-50 p-4 rounded-xl font-bold" value={serviceForm.title} onChange={e => setServiceForm({...serviceForm, title: e.target.value})} required />
               <div className="grid grid-cols-2 gap-4">
                  <select className="bg-gray-50 p-4 rounded-xl font-black text-xs" value={serviceForm.variant} onChange={e => setServiceForm({...serviceForm, variant: e.target.value})}>
                     <option>Simple</option><option>Standard</option><option>Premium</option>
                  </select>
                  <input placeholder="Price (₹)" className="bg-gray-50 p-4 rounded-xl font-bold" value={serviceForm.rate} onChange={e => setServiceForm({...serviceForm, rate: e.target.value})} required />
               </div>
               <textarea placeholder="Service Details..." className="w-full bg-gray-50 p-4 rounded-xl h-24" value={serviceForm.description} onChange={e => setServiceForm({...serviceForm, description: e.target.value})} />
               <button type="submit" className="w-full bg-[#fb641b] text-white py-5 rounded-2xl font-black uppercase shadow-xl tracking-widest">Publish Changes</button>
            </form>
          </div>
        )}

        {view === 'bookings' && (
           <div className="space-y-6">
               <h2 className="text-xl font-black text-gray-800 border-l-8 border-[#fb641b] pl-4 mb-6 uppercase tracking-tighter">My Orders</h2>
               {bookings.map(b => (
                  <div key={b._id} className="bg-white p-6 rounded-[2.5rem] shadow-sm mb-6 border border-gray-50">
                      <div className="flex justify-between items-start mb-4">
                          <div><p className="text-[10px] font-black text-[#2874f0] mb-1 uppercase tracking-widest">{b.serviceId?.title}</p><h4 className="font-black text-gray-800">{user?.role === UserRole.VENDOR ? b.customerId?.name : b.vendorId?.businessName}</h4></div>
                          <span className="text-[8px] font-black uppercase px-3 py-1 bg-gray-100 rounded-full">{b.status}</span>
                      </div>
                      <Stepper status={b.status} />
                      {/* Interaction logic based on status... (Same as before) */}
                      {user?.role === UserRole.VENDOR && b.status === 'pending' && (
                          <div className="flex gap-2">
                             <button onClick={() => updateBookingStatus(b._id, { status: 'approved' })} className="flex-1 bg-green-500 text-white py-3 rounded-xl text-[10px] font-black uppercase">Approve</button>
                             <button onClick={() => updateBookingStatus(b._id, { status: 'rejected' })} className="flex-1 bg-red-100 text-red-500 py-3 rounded-xl text-[10px] font-black uppercase">Reject</button>
                          </div>
                      )}
                  </div>
               ))}
           </div>
        )}
      </main>

      {/* Premium Product Details Modal */}
      {detailTarget && (
          <div className="fixed inset-0 bg-black/90 z-[400] overflow-y-auto no-scrollbar">
              <div className="max-w-md mx-auto min-h-screen bg-white relative animate-slideUp pb-24">
                  <button onClick={() => setDetailTarget(null)} className="absolute top-6 left-6 z-[410] bg-black/20 backdrop-blur-md text-white w-10 h-10 rounded-full"><i className="fas fa-arrow-left"></i></button>
                  <button onClick={() => toggleWishlist(detailTarget._id)} className="absolute top-6 right-6 z-[410] bg-black/20 backdrop-blur-md text-white w-10 h-10 rounded-full"><i className={`fas fa-heart ${wishlist.includes(detailTarget._id) ? 'text-red-500' : ''}`}></i></button>
                  
                  {/* Hero Gallery */}
                  <div className="h-[45vh] relative bg-gray-100">
                      <img src={detailTarget.images[activeImageIdx]} className="w-full h-full object-cover transition-all duration-500" />
                      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
                          {detailTarget.images.map((_: any, i: number) => (
                             <div key={i} className={`w-2 h-2 rounded-full transition-all ${activeImageIdx === i ? 'bg-[#2874f0] w-6' : 'bg-white/50'}`}></div>
                          ))}
                      </div>
                  </div>

                  {/* Details Body */}
                  <div className="p-8 space-y-8">
                      <div>
                          <p className="text-[#2874f0] text-[10px] font-black uppercase tracking-[0.2em] mb-2">{detailTarget.category}</p>
                          <h1 className="text-2xl font-black text-gray-800 leading-tight mb-2">{detailTarget.title}</h1>
                          <div className="flex items-center gap-4">
                              <span className="bg-green-600 text-white text-[10px] font-black px-2 py-1 rounded">4.5 <i className="fas fa-star text-[7px] ml-1"></i></span>
                              <p className="text-[10px] font-black text-gray-400 uppercase">240 Ratings & 48 Reviews</p>
                          </div>
                      </div>

                      <div className="flex items-center justify-between py-4 border-y border-gray-50">
                          <div>
                              <p className="text-3xl font-black text-gray-900 italic">₹{detailTarget.rate}/-</p>
                              <p className="text-[9px] font-black text-green-500 uppercase tracking-widest mt-1">Special Price Offer</p>
                          </div>
                          <div className="text-right">
                              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Type</p>
                              <p className="text-xs font-black text-gray-700">{detailTarget.variant}</p>
                          </div>
                      </div>

                      {/* Specs Table */}
                      <div className="bg-gray-50 p-6 rounded-[2rem] border border-gray-100">
                          <h4 className="font-black text-xs uppercase tracking-widest mb-4">Specifications</h4>
                          <table className="w-full text-xs font-bold text-gray-600">
                              <tr className="border-b border-gray-200/50"><td className="py-2 text-gray-400">Inventory</td><td className="py-2 text-right">Standard Set</td></tr>
                              <tr className="border-b border-gray-200/50"><td className="py-2 text-gray-400">Power</td><td className="py-2 text-right">Required</td></tr>
                              <tr><td className="py-2 text-gray-400">Capacity</td><td className="py-2 text-right">200-500 Pax</td></tr>
                          </table>
                      </div>

                      {/* Other Listings from Vendor */}
                      <div className="space-y-4">
                          <h4 className="font-black text-xs uppercase tracking-widest">Seller's Other Picks</h4>
                          <div className="flex gap-4 overflow-x-auto no-scrollbar">
                              {data.find(v => v._id === detailTarget.vendorId)?.services.filter((s:any) => s._id !== detailTarget._id).map((s: any) => (
                                  <div key={s._id} className="min-w-[140px] bg-gray-50 p-3 rounded-3xl border border-gray-100">
                                      <img src={s.images[0]} className="h-24 w-full object-cover rounded-2xl mb-2" />
                                      <p className="text-[9px] font-black truncate">{s.title}</p>
                                      <p className="text-[10px] font-black text-[#2874f0]">₹{s.rate}</p>
                                  </div>
                              ))}
                          </div>
                      </div>
                  </div>

                  <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto p-4 bg-white shadow-[0_-20px_40px_rgba(0,0,0,0.05)] border-t border-gray-100 flex gap-4 z-[420]">
                      <button onClick={() => toggleWishlist(detailTarget._id)} className="flex-1 py-4 border-2 border-gray-100 rounded-2xl text-[10px] font-black uppercase tracking-widest">{wishlist.includes(detailTarget._id) ? 'Saved' : 'Add to Wishlist'}</button>
                      <button onClick={() => { setBookingTarget(detailTarget); setDetailTarget(null); }} className="flex-2 bg-[#fb641b] text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl">Book Now</button>
                  </div>
              </div>
          </div>
      )}

      {/* Booking Modal */}
      {bookingTarget && (
        <div className="fixed inset-0 bg-black/60 z-[300] flex items-center justify-center p-6 backdrop-blur-sm overflow-y-auto">
           <div className="bg-white w-full rounded-[2.5rem] p-10 animate-slideUp shadow-2xl">
              <h2 className="text-xl font-black uppercase tracking-tighter mb-8">Booking Request</h2>
              <form onSubmit={handleBooking} className="space-y-6">
                 <div className="grid grid-cols-2 gap-4">
                    <input type="date" className="w-full bg-gray-50 p-4 rounded-xl text-xs font-black" required onChange={e => setBookingForm({...bookingForm, startDate: e.target.value})} />
                    <input type="date" className="w-full bg-gray-50 p-4 rounded-xl text-xs font-black" required onChange={e => setBookingForm({...bookingForm, endDate: e.target.value})} />
                 </div>
                 <textarea placeholder="Event Address..." className="w-full bg-gray-50 p-5 rounded-xl text-xs font-black h-24" required onChange={e => setBookingForm({...bookingForm, address: e.target.value})} />
                 <button type="submit" className="w-full bg-[#fb641b] text-white py-6 rounded-2xl font-black uppercase text-xs shadow-2xl tracking-widest">Place Order</button>
              </form>
           </div>
        </div>
      )}

      {/* Nav Bar */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white h-24 flex items-center justify-around shadow-[0_-20px_60px_-15px_rgba(0,0,0,0.1)] z-[150] rounded-t-[3.5rem] px-8 border-t border-gray-100">
        <button onClick={() => setView('home')} className={`flex flex-col items-center gap-2 transition-all ${view === 'home' ? 'text-[#2874f0] scale-110' : 'text-gray-300'}`}><i className="fas fa-home text-xl"></i><span className="text-[8px] font-black uppercase">Home</span></button>
        <button onClick={() => { setView('bookings'); fetchBookings(); }} className={`flex flex-col items-center gap-2 transition-all ${view === 'bookings' ? 'text-[#2874f0] scale-110' : 'text-gray-300'}`}><i className="fas fa-shopping-bag text-xl"></i><span className="text-[8px] font-black uppercase">Orders</span></button>
        {user?.role === UserRole.VENDOR && (
          <button onClick={() => setView('vendor-dashboard')} className={`flex flex-col items-center gap-2 transition-all ${view === 'vendor-dashboard' ? 'text-[#2874f0] scale-110' : 'text-gray-300'}`}><i className="fas fa-chart-line text-xl"></i><span className="text-[8px] font-black uppercase">Hub</span></button>
        )}
        <button onClick={() => { localStorage.clear(); setUser(null); }} className="text-red-300"><i className="fas fa-power-off text-xl"></i></button>
      </nav>

      <style>{`
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        .animate-slideUp { animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1); }
        @keyframes slideIn { from { transform: translateX(-20px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        .animate-slideIn { animation: slideIn 0.5s ease-out; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
};

export default App;
