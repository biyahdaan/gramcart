
import React, { useState, useEffect, useRef } from 'react';
import { Language, User, Translations, UserRole, Translation } from './types';
import { CATEGORIES as INITIAL_CATEGORIES, BANNERS } from './constants';
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
  const [view, setView] = useState<'home' | 'vendor-dashboard' | 'bookings' | 'my-services' | 'profile'>('home');
  const [data, setData] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [myServices, setMyServices] = useState<any[]>([]);
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
  
  const [authForm, setAuthForm] = useState({ identifier: '', email: '', mobile: '', password: '', name: '', role: 'user' });
  const [serviceForm, setServiceForm] = useState({
    title: '', category: 'tent', description: '', rate: '', unitType: 'Per Day', 
    itemsIncluded: [] as string[], images: [] as string[], contactNumber: '', _id: '', customItem: '', 
    customCategory: '', upiId: '' 
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
        setBookingForm(prev => ({
            ...prev,
            address: parsedUser.savedAddress || '',
            pincode: parsedUser.savedPincode || '',
            altMobile: parsedUser.savedAltMobile || ''
        }));
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

  const removeImage = (index: number) => {
    setServiceForm(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== index) }));
  };

  const deleteService = async (serviceId: string) => {
    if (!window.confirm("Delete this listing?")) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/services/${serviceId}`, { method: 'DELETE' });
      if (res.ok) { fetchMyServices(); fetchData(); } 
    } catch (e) { alert("Error deleting"); } finally { setLoading(false); }
  };

  const handleAddOrUpdateService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return alert("Please login");
    setLoading(true); setPublishStatus('Processing...');
    try {
      const compressedImages = await Promise.all(serviceForm.images.map(img => img.startsWith('data:image') ? compressImage(img) : img));
      const vRes = await fetch(`${API_BASE_URL}/search`);
      const allV = await vRes.json();
      const v = allV.find((vend: any) => vend.userId === (user._id || user.id));
      if (!v) throw new Error("Vendor missing");
      
      let finalCategory = serviceForm.category;
      if (serviceForm.category === 'other' && serviceForm.customCategory) {
          finalCategory = serviceForm.customCategory.toLowerCase().replace(/\s+/g, '_');
          setCategories(prev => [...prev, { id: finalCategory, name: serviceForm.customCategory, icon: 'fa-plus', color: 'bg-green-100 text-green-600' }]);
      }

      const isUpdating = !!serviceForm._id && serviceForm._id.length > 0;
      const payload = {
        title: serviceForm.title, category: finalCategory, description: serviceForm.description,
        rate: Number(serviceForm.rate), unitType: serviceForm.unitType, itemsIncluded: serviceForm.itemsIncluded,
        images: compressedImages, contactNumber: serviceForm.contactNumber, vendorId: v._id,
        upiId: serviceForm.upiId || v.upiId
      };
      const method = isUpdating ? 'PUT' : 'POST';
      const endpoint = isUpdating ? `/services/${serviceForm._id}` : '/services';
      const res = await fetch(`${API_BASE_URL}${endpoint}`, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (res.ok) {
        setPublishStatus('Success!');
        setTimeout(() => {
          setServiceForm({ title: '', category: 'tent', description: '', rate: '', unitType: 'Per Day', itemsIncluded: [], images: [], contactNumber: '', _id: '', customItem: '', customCategory: '', upiId: '' });
          setPublishStatus(''); fetchMyServices(); fetchData(); setView('my-services'); setLoading(false);
        }, 1200);
      } else alert("Error publishing");
    } catch (e) { alert("Server error"); setLoading(false); }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const endpoint = authMode === 'login' ? '/login' : '/register';
    const payload = authMode === 'login' 
      ? { identifier: authForm.identifier, password: authForm.password } 
      : { ...authForm, location: userCoords };
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
        const diff = new Date(bookingForm.endDate).getTime() - new Date(bookingForm.startDate).getTime();
        const days = Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
        const updatedUser = { ...user, savedAddress: bookingForm.address, savedPincode: bookingForm.pincode, savedAltMobile: bookingForm.altMobile };
        localStorage.setItem('gramcart_user', JSON.stringify(updatedUser));
        setUser(updatedUser);

        const res = await fetch(`${API_BASE_URL}/bookings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                ...bookingForm, 
                customerId: user._id || user.id, 
                vendorId: v._id, 
                serviceId: bookingTarget._id, 
                totalAmount: bookingTarget.rate * days,
                otp: Math.floor(1000 + Math.random() * 9000).toString()
            })
        });
        if (res.ok) { setBookingTarget(null); setView('bookings'); fetchBookings(); } else alert("Booking failed");
    } catch (e) { alert("Server error"); } finally { setLoading(false); }
  };

  const handleReview = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!user || !reviewTarget) return;
      setLoading(true);
      try {
          const res = await fetch(`${API_BASE_URL}/bookings/${reviewTarget._id}/status`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ review: reviewForm })
          });
          if (res.ok) { 
            setReviewTarget(null); 
            fetchBookings(); 
            alert("Feedback Shared! Thank you."); 
            setReviewForm({ rating: 5, comment: '' });
          }
      } catch (e) { alert("Error saving review"); } finally { setLoading(false); }
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
      try {
        const compressed = await compressImage(reader.result as string);
        const status = field === 'advanceProof' ? 'awaiting_advance_verification' : 'awaiting_final_verification';
        await fetch(`${API_BASE_URL}/bookings/${bookingId}/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ [field]: compressed, status }) });
        alert("Success! Waiting for vendor to verify."); fetchBookings();
      } catch (e) {} finally { setLoading(false); }
    };
    reader.readAsDataURL(file);
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
      const vRes = await fetch(`${API_BASE_URL}/search`);
      const allV = await vRes.json();
      const v = allV.find((vend: any) => vend.userId === (user._id || user.id));
      if (v) {
        const res = await fetch(`${API_BASE_URL}/my-services/${v._id}`);
        if (res.ok) setMyServices(await res.json());
      }
    } catch (e) {}
  };

  const Stepper = ({ status }: { status: string }) => {
    const steps = ['pending', 'approved', 'advance_paid', 'final_paid', 'completed'];
    const displayStatusMap: Record<string, string> = {
        'awaiting_advance_verification': 'approved',
        'awaiting_final_verification': 'advance_paid',
    };
    const displayStatus = displayStatusMap[status] || status;
    const currentIndex = steps.indexOf(displayStatus);
    return (
      <div className="flex items-center justify-between w-full mb-8 relative px-2">
        <div className="absolute top-[14px] left-0 right-0 h-[1px] bg-gray-100 -z-10"></div>
        {steps.map((step, index) => (
          <div key={step} className="flex flex-col items-center flex-1">
            <div className={`w-7 h-7 rounded-full border-4 border-white shadow-sm flex items-center justify-center text-[8px] font-black ${index <= currentIndex ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400'}`}>
              {index < currentIndex ? <i className="fas fa-check"></i> : index + 1}
            </div>
            <span className={`text-[6px] mt-2 font-black uppercase tracking-widest ${index <= currentIndex ? 'text-green-600' : 'text-gray-300'}`}>{step.split('_')[0]}</span>
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
                    <div key={s._id} className="border border-gray-50 p-2.5 rounded-3xl bg-gray-50/50 group hover:bg-white transition-all shadow-sm">
                        <img src={s.images?.[0] || 'https://via.placeholder.com/300'} className="h-32 w-full object-cover rounded-2xl mb-3" />
                        <p className="text-[11px] font-black text-gray-700 truncate mb-1 uppercase tracking-tighter">{s.title}</p>
                        <p className="text-[#2874f0] font-black text-sm">₹{s.rate}/- <span className="text-[8px] text-gray-400 font-bold uppercase">{s.unitType}</span></p>
                        <div className="flex gap-2 mt-4">
                           <button onClick={() => setDetailTarget(s)} className="flex-1 bg-white border border-gray-200 text-gray-400 text-[9px] font-black py-2.5 rounded-xl">Details</button>
                           <button onClick={() => { setBookingTarget(s); setBookingForm(prev => ({ ...prev, startDate: '', endDate: '' })); }} className="flex-1 bg-[#fb641b] text-white text-[9px] font-black py-2.5 rounded-xl">Book</button>
                        </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {view === 'vendor-dashboard' && user?.role === UserRole.VENDOR && (
          <div className="space-y-6 animate-slideIn">
            <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100">
              <h3 className="text-sm font-black text-[#2874f0] uppercase mb-8 tracking-widest text-center border-b pb-4">List New Service</h3>
              <form onSubmit={handleAddOrUpdateService} className="space-y-6">
                <div className="bg-blue-50/50 p-6 rounded-[2rem] border border-blue-100">
                  <p className="text-[10px] font-black text-blue-400 uppercase mb-4 flex justify-between tracking-widest">Photos (Max 5) <span>{serviceForm.images.length}/5</span></p>
                  <div className="flex flex-wrap gap-3">
                    {serviceForm.images.map((img, idx) => (
                      <div key={idx} className="relative w-16 h-16"><img src={img} className="w-full h-full object-cover rounded-xl" /><button type="button" onClick={() => removeImage(idx)} className="absolute -top-1 -right-1 bg-red-500 text-white w-5 h-5 rounded-full flex items-center justify-center text-[9px]"><i className="fas fa-times"></i></button></div>
                    ))}
                    {serviceForm.images.length < 5 && (
                      <button type="button" onClick={() => fileInputRef.current?.click()} className="w-16 h-16 rounded-xl border-2 border-dashed border-blue-200 text-blue-300 flex items-center justify-center"><i className="fas fa-camera text-xl"></i></button>
                    )}
                  </div>
                  <input type="file" multiple accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageUpload} />
                </div>
                <input placeholder="Service Title" className="w-full bg-gray-50 p-4 rounded-xl font-bold shadow-inner" value={serviceForm.title} onChange={e => setServiceForm({...serviceForm, title: e.target.value})} required />
                <input placeholder="UPI ID for this service" className="w-full bg-blue-50 p-4 rounded-xl text-blue-600 font-bold text-xs" value={serviceForm.upiId} onChange={e => setServiceForm({...serviceForm, upiId: e.target.value})} />
                <div className="grid grid-cols-2 gap-4">
                   <select className="bg-gray-50 p-4 rounded-xl font-black text-xs" value={serviceForm.category} onChange={e => setServiceForm({...serviceForm, category: e.target.value})}>
                     {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                     <option value="other">+ New Category</option>
                   </select>
                   <select className="bg-gray-50 p-4 rounded-xl font-black text-xs" value={serviceForm.unitType} onChange={e => setServiceForm({...serviceForm, unitType: e.target.value})}>
                     <option>Per Day</option><option>Per Piece</option><option>Per Plate</option>
                   </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <input placeholder="Price (₹)" type="number" className="bg-gray-50 p-4 rounded-xl font-bold" value={serviceForm.rate} onChange={e => setServiceForm({...serviceForm, rate: e.target.value})} required />
                   <input placeholder="Contact Phone" type="tel" className="bg-gray-50 p-4 rounded-xl font-bold" value={serviceForm.contactNumber} onChange={e => setServiceForm({...serviceForm, contactNumber: e.target.value})} required />
                </div>
                <textarea placeholder="Service Details..." className="w-full bg-gray-50 p-4 rounded-xl h-32" value={serviceForm.description} onChange={e => setServiceForm({...serviceForm, description: e.target.value})} />
                <button type="submit" className="w-full bg-[#fb641b] text-white py-5 rounded-2xl font-black uppercase tracking-widest shadow-xl">Publish Live</button>
              </form>
            </div>
          </div>
        )}

        {view === 'bookings' && (
          <div className="space-y-6 pb-20">
             <h2 className="text-xl font-black text-gray-800 border-l-8 border-[#fb641b] pl-4 mb-6 uppercase tracking-tighter">Orders & Payments</h2>
             {bookings.map(b => (
               <div key={b._id} className="bg-white p-6 rounded-[2.5rem] shadow-sm mb-6 border border-gray-50 animate-slideIn">
                 <div className="flex justify-between items-start mb-6">
                    <div>
                        <p className="text-[10px] font-black text-[#2874f0] uppercase mb-1">{b.serviceId?.title}</p>
                        <h4 className="font-black text-gray-800 text-lg leading-tight">{user?.role === UserRole.VENDOR ? b.customerId?.name : b.vendorId?.businessName}</h4>
                    </div>
                    <span className="text-[8px] font-black uppercase px-3 py-1 bg-gray-100 rounded-full">{b.status.replace('_', ' ')}</span>
                 </div>
                 <Stepper status={b.status} />

                 {/* CUSTOMER ACTIONS */}
                 {user?.role === UserRole.USER && (
                    <div className="space-y-4 mt-6">
                        {b.status === 'approved' && (
                           <div className="p-5 bg-blue-50 rounded-[2rem] border-2 border-dashed border-blue-200 text-center">
                              <p className="text-[10px] font-black text-blue-800 mb-4 tracking-tighter">1. Pay Advance to UPI: <br/><span className="text-sm text-blue-600">{b.serviceId?.upiId || b.vendorId?.upiId}</span></p>
                              <input type="file" className="hidden" ref={proofInputRef} onChange={(e) => handleProofUpload(e, b._id, 'advanceProof')} />
                              <button onClick={() => proofInputRef.current?.click()} className="w-full bg-[#2874f0] text-white py-4 rounded-xl text-[10px] font-black uppercase shadow-lg">Upload Advance Proof</button>
                           </div>
                        )}
                        {b.status === 'advance_paid' && (
                           <div className="p-5 bg-orange-50 rounded-[2rem] border-2 border-dashed border-orange-200 text-center">
                              <p className="text-[10px] font-black text-orange-800 mb-4 tracking-tighter">2. Work Finished? Pay Final Bill & Upload Proof</p>
                              <input type="file" className="hidden" ref={finalProofInputRef} onChange={(e) => handleProofUpload(e, b._id, 'finalProof')} />
                              <button onClick={() => finalProofInputRef.current?.click()} className="w-full bg-[#fb641b] text-white py-4 rounded-xl text-[10px] font-black uppercase shadow-lg">Upload Final Payment Proof</button>
                           </div>
                        )}
                        {b.status === 'final_paid' && (
                           <div className="p-5 bg-green-50 rounded-[2rem] text-center border border-green-100">
                              <p className="text-[10px] font-black text-green-800 mb-4 tracking-widest uppercase">Service Security OTP (Show to Vendor)</p>
                              <div className="text-3xl font-black text-green-600 tracking-[1rem] bg-white py-4 rounded-2xl shadow-inner">{b.otp}</div>
                           </div>
                        )}
                        {b.status === 'completed' && !b.review && (
                           <button onClick={() => setReviewTarget(b)} className="w-full bg-blue-600 text-white py-4 rounded-xl text-[10px] font-black uppercase shadow-lg">Post Review & Feedback</button>
                        )}
                    </div>
                 )}

                 {/* VENDOR ACTIONS */}
                 {user?.role === UserRole.VENDOR && (
                    <div className="space-y-4 mt-6">
                        {b.status === 'pending' && (
                            <div className="flex gap-4">
                                <button onClick={() => updateBookingStatus(b._id, { status: 'approved' })} className="flex-1 bg-green-500 text-white py-4 rounded-xl text-[10px] font-black uppercase shadow-lg">Approve Order</button>
                                <button onClick={() => updateBookingStatus(b._id, { status: 'rejected' })} className="flex-1 bg-red-100 text-red-500 py-4 rounded-xl text-[10px] font-black uppercase">Reject</button>
                            </div>
                        )}
                        {b.status === 'awaiting_advance_verification' && (
                           <div className="bg-blue-50 p-5 rounded-[2rem] text-center border border-blue-100">
                              <p className="text-[10px] font-black mb-3 text-blue-800">Advance Screenshot Received</p>
                              <button onClick={() => setScreenshotPreview(b.advanceProof)} className="text-[9px] text-blue-600 underline font-black mb-4">Click to View</button>
                              <button onClick={() => updateBookingStatus(b._id, { status: 'advance_paid' })} className="w-full bg-blue-600 text-white py-4 rounded-xl text-[10px] font-black uppercase shadow-lg">Verify Advance Paid</button>
                           </div>
                        )}
                        {b.status === 'awaiting_final_verification' && (
                           <div className="bg-orange-50 p-5 rounded-[2rem] text-center border border-orange-100">
                              <p className="text-[10px] font-black mb-3 text-orange-800">Final Bill Proof Received</p>
                              <button onClick={() => setScreenshotPreview(b.finalProof)} className="text-[9px] text-orange-600 underline font-black mb-4">Click to View</button>
                              <button onClick={() => updateBookingStatus(b._id, { status: 'final_paid' })} className="w-full bg-orange-600 text-white py-4 rounded-xl text-[10px] font-black uppercase shadow-lg">Verify Final Payment & Show OTP</button>
                           </div>
                        )}
                        {b.status === 'final_paid' && (
                           <button onClick={() => setOtpTarget({ id: b._id, code: '', correctCode: b.otp })} className="w-full bg-green-600 text-white py-4 rounded-xl text-[10px] font-black uppercase shadow-lg">Enter Customer OTP to Finish</button>
                        )}
                    </div>
                 )}

                 {/* REVIEW DISPLAY */}
                 {b.review && (
                    <div className="mt-6 pt-4 border-t border-gray-50">
                        <div className="flex justify-between items-center mb-2">
                           <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Customer Feedback</p>
                           <span className="text-yellow-500 text-[10px] font-black">{b.review.rating} <i className="fas fa-star ml-1"></i></span>
                        </div>
                        <p className="text-[11px] font-bold text-gray-600 italic">"{b.review.comment}"</p>
                    </div>
                 )}
               </div>
             ))}
          </div>
        )}

        {view === 'my-services' && (
          <div className="space-y-6 animate-slideIn">
             <h2 className="text-lg font-black text-gray-800 mb-6 uppercase border-l-8 border-[#2874f0] pl-4">Your Listings</h2>
             {myServices.map(s => (
               <div key={s._id} className="bg-white p-5 rounded-[2.5rem] shadow-sm flex items-center gap-6 border border-gray-50">
                  <img src={s.images?.[0] || 'https://via.placeholder.com/300'} className="w-20 h-20 rounded-2xl object-cover shadow-md" />
                  <div className="flex-1">
                      <p className="font-black text-gray-800 text-[13px] uppercase truncate w-32 tracking-tighter">{s.title}</p>
                      <p className="text-[#2874f0] text-[11px] font-black mt-1">₹{s.rate}</p>
                  </div>
                  <button onClick={() => deleteService(s._id)} className="w-10 h-10 rounded-2xl bg-red-50 text-red-500 transition-transform active:scale-90"><i className="fas fa-trash"></i></button>
               </div>
             ))}
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white h-24 flex items-center justify-around shadow-[0_-20px_60px_-15px_rgba(0,0,0,0.1)] z-[150] rounded-t-[3.5rem] px-8 border-t border-gray-100">
        <button onClick={() => setView('home')} className={`flex flex-col items-center gap-2 transition-all ${view === 'home' ? 'text-[#2874f0] scale-110' : 'text-gray-300'}`}><i className="fas fa-home text-xl"></i><span className="text-[8px] font-black uppercase">Home</span></button>
        <button onClick={() => { setView('bookings'); fetchBookings(); }} className={`flex flex-col items-center gap-2 transition-all ${view === 'bookings' ? 'text-[#2874f0] scale-110' : 'text-gray-300'}`}><i className="fas fa-shopping-bag text-xl"></i><span className="text-[8px] font-black uppercase">Orders</span></button>
        {user?.role === UserRole.VENDOR && (
          <>
            <button onClick={() => setView('my-services')} className={`flex flex-col items-center gap-2 transition-all ${view === 'my-services' ? 'text-[#2874f0] scale-110' : 'text-gray-300'}`}><i className="fas fa-store text-xl"></i><span className="text-[8px] font-black uppercase">Shop</span></button>
            <button onClick={() => setView('vendor-dashboard')} className={`flex flex-col items-center gap-2 transition-all ${view === 'vendor-dashboard' ? 'text-[#2874f0] scale-110' : 'text-gray-300'}`}><i className="fas fa-plus-circle text-xl"></i><span className="text-[8px] font-black uppercase">Add</span></button>
          </>
        )}
        <button onClick={() => { localStorage.clear(); setUser(null); }} className="text-red-300"><i className="fas fa-power-off text-xl"></i></button>
      </nav>

      {/* REVIEW FORM MODAL */}
      {reviewTarget && (
        <div className="fixed inset-0 bg-black/70 z-[400] flex items-center justify-center p-6 backdrop-blur-sm">
           <div className="bg-white w-full rounded-[2.5rem] p-10 animate-slideUp">
              <h2 className="text-xl font-black text-center mb-6 text-gray-800">Service Feedback</h2>
              <form onSubmit={handleReview} className="space-y-6">
                  <div className="flex justify-center gap-4">
                      {[1,2,3,4,5].map(star => (
                          <button key={star} type="button" onClick={() => setReviewForm({...reviewForm, rating: star})} className={`text-3xl ${reviewForm.rating >= star ? 'text-yellow-400' : 'text-gray-200'}`}><i className="fas fa-star"></i></button>
                      ))}
                  </div>
                  <textarea placeholder="Tell us how was the experience..." className="w-full bg-gray-50 p-5 rounded-2xl text-xs font-bold h-32 outline-none shadow-inner" required value={reviewForm.comment} onChange={e => setReviewForm({...reviewForm, comment: e.target.value})} />
                  <div className="flex gap-4">
                      <button type="button" onClick={() => setReviewTarget(null)} className="flex-1 bg-gray-100 text-gray-400 py-4 rounded-xl font-black uppercase text-[10px]">Back</button>
                      <button type="submit" className="flex-2 bg-[#fb641b] text-white py-4 rounded-xl font-black uppercase text-[10px] shadow-lg">Post Feedback</button>
                  </div>
              </form>
           </div>
        </div>
      )}

      {/* SCREENSHOT PREVIEW MODAL */}
      {screenshotPreview && (
          <div className="fixed inset-0 bg-black/90 z-[500] flex items-center justify-center p-6 backdrop-blur-md">
              <div className="w-full max-w-sm">
                  <img src={screenshotPreview} className="w-full rounded-[2rem] shadow-2xl border-4 border-white animate-slideUp" />
                  <button onClick={() => setScreenshotPreview(null)} className="w-full bg-white text-black py-4 rounded-2xl mt-8 font-black uppercase tracking-widest shadow-xl">Close</button>
              </div>
          </div>
      )}

      {/* OTP VERIFICATION MODAL */}
      {otpTarget && (
        <div className="fixed inset-0 bg-black/60 z-[300] flex items-center justify-center p-6 backdrop-blur-sm">
           <div className="bg-white w-full rounded-[2rem] p-8 animate-slideUp text-center">
              <h2 className="text-lg font-black text-gray-800 mb-4 uppercase">Verify Delivery OTP</h2>
              <p className="text-[10px] font-bold text-gray-400 mb-6 tracking-tighter">Ask customer for the code shown in their app.</p>
              <input type="text" maxLength={4} className="w-full bg-gray-50 p-6 rounded-2xl text-3xl font-black text-center tracking-[1rem] outline-none shadow-inner mb-6" value={otpTarget.code} onChange={(e) => setOtpTarget({...otpTarget, code: e.target.value})} />
              <div className="flex gap-4">
                  <button onClick={() => setOtpTarget(null)} className="flex-1 bg-gray-100 text-gray-400 py-4 rounded-xl text-[10px] font-black uppercase">Cancel</button>
                  <button onClick={() => {
                      if (otpTarget.code === otpTarget.correctCode) {
                          updateBookingStatus(otpTarget.id, { status: 'completed' });
                          alert("Verified! Service Completed Successfully.");
                          setOtpTarget(null);
                      } else alert("Wrong OTP! Please check again.");
                  }} className="flex-2 bg-green-500 text-white py-4 rounded-xl text-[10px] font-black uppercase shadow-xl">Complete Job</button>
              </div>
           </div>
        </div>
      )}

      {/* DETAIL MODAL */}
      {detailTarget && (
        <div className="fixed inset-0 bg-black/70 z-[200] flex items-center justify-center p-5 backdrop-blur-md">
           <div className="bg-white w-full rounded-[3rem] p-8 animate-slideUp max-h-[80vh] overflow-y-auto relative">
              <button onClick={() => setDetailTarget(null)} className="absolute top-6 right-6 text-gray-300"><i className="fas fa-times-circle text-3xl"></i></button>
              <h2 className="text-2xl font-black mb-6">{detailTarget.title}</h2>
              <div className="flex gap-4 overflow-x-auto no-scrollbar mb-8">
                 {(detailTarget.images || []).map((img: string, i: number) => (
                    <img key={i} src={img} className="h-56 w-72 object-cover rounded-[2rem] flex-shrink-0" />
                 ))}
              </div>
              <p className="text-sm text-gray-700 font-bold mb-8 leading-relaxed">{detailTarget.description}</p>
              <button onClick={() => { setBookingTarget(detailTarget); setDetailTarget(null); }} className="w-full bg-[#fb641b] text-white rounded-[1.5rem] py-5 font-black uppercase tracking-widest text-xs shadow-2xl">Start Booking</button>
           </div>
        </div>
      )}

      {/* BOOKING MODAL */}
      {bookingTarget && (
        <div className="fixed inset-0 bg-black/60 z-[300] flex items-center justify-center p-6 backdrop-blur-sm overflow-y-auto">
           <div className="bg-white w-full rounded-[2.5rem] p-10 animate-slideUp shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-xl font-black uppercase tracking-tighter">Booking Form</h2>
                <button onClick={() => setBookingTarget(null)} className="text-gray-300"><i className="fas fa-times text-xl"></i></button>
              </div>
              <form onSubmit={handleBooking} className="space-y-6">
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><p className="text-[9px] font-black text-gray-400 uppercase">Start Date</p><input type="date" className="w-full bg-gray-50 p-4 rounded-xl text-xs font-black shadow-inner" required onChange={e => setBookingForm({...bookingForm, startDate: e.target.value})} /></div>
                    <div className="space-y-2"><p className="text-[9px] font-black text-gray-400 uppercase">End Date</p><input type="date" className="w-full bg-gray-50 p-4 rounded-xl text-xs font-black shadow-inner" required onChange={e => setBookingForm({...bookingForm, endDate: e.target.value})} /></div>
                 </div>
                 <div className="space-y-2"><p className="text-[9px] font-black text-gray-400 uppercase">Full Address</p><textarea placeholder="Venue where service is needed" className="w-full bg-gray-50 p-5 rounded-xl text-xs font-black h-24 outline-none shadow-inner" value={bookingForm.address} required onChange={e => setBookingForm({...bookingForm, address: e.target.value})} /></div>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><p className="text-[9px] font-black text-gray-400 uppercase">Pincode</p><input type="text" className="w-full bg-gray-50 p-4 rounded-xl text-xs font-black shadow-inner" value={bookingForm.pincode} required onChange={e => setBookingForm({...bookingForm, pincode: e.target.value})} /></div>
                    <div className="space-y-2"><p className="text-[9px] font-black text-gray-400 uppercase">Alt Mobile</p><input type="tel" className="w-full bg-gray-50 p-4 rounded-xl text-xs font-black shadow-inner" value={bookingForm.altMobile} onChange={e => setBookingForm({...bookingForm, altMobile: e.target.value})} /></div>
                 </div>
                 <button type="submit" className="w-full bg-[#fb641b] text-white py-6 rounded-2xl font-black uppercase text-xs shadow-2xl tracking-widest">Confirm Booking Request</button>
              </form>
           </div>
        </div>
      )}

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
