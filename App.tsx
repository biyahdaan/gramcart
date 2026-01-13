
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
  const [publishStatus, setPublishStatus] = useState<string>(''); 
  const [searchQuery, setSearchQuery] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [userCoords, setUserCoords] = useState<{lat: number, lng: number} | null>(null);
  
  const [bookingTarget, setBookingTarget] = useState<any>(null);
  const [detailTarget, setDetailTarget] = useState<any>(null); 
  const [otpTarget, setOtpTarget] = useState<{id: string, code: string, correctCode: string} | null>(null);
  
  const [authForm, setAuthForm] = useState({ identifier: '', email: '', mobile: '', password: '', name: '', role: 'user' });
  const [serviceForm, setServiceForm] = useState({
    title: '', category: 'tent', description: '', rate: '', unitType: 'Per Day', 
    itemsIncluded: [] as string[], images: [] as string[], contactNumber: '', _id: '', customItem: ''
  });
  const [bookingForm, setBookingForm] = useState({ startDate: '', endDate: '', address: '' });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const proofInputRef = useRef<HTMLInputElement>(null);

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
    setLoading(true); setPublishStatus('Compressing Photos...');
    try {
      const compressedImages = await Promise.all(serviceForm.images.map(img => img.startsWith('data:image') ? compressImage(img) : img));
      setPublishStatus('Syncing Vendor...');
      const vRes = await fetch(`${API_BASE_URL}/search`);
      const allV = await vRes.json();
      const v = allV.find((vend: any) => vend.userId === (user._id || user.id));
      if (!v) throw new Error("Vendor missing");
      setPublishStatus('Uploading Details...');
      const isUpdating = !!serviceForm._id && serviceForm._id.length > 0;
      const payload = {
        title: serviceForm.title, category: serviceForm.category, description: serviceForm.description,
        rate: Number(serviceForm.rate), unitType: serviceForm.unitType, itemsIncluded: serviceForm.itemsIncluded,
        images: compressedImages, contactNumber: serviceForm.contactNumber, vendorId: v._id
      };
      const method = isUpdating ? 'PUT' : 'POST';
      const endpoint = isUpdating ? `/services/${serviceForm._id}` : '/services';
      const res = await fetch(`${API_BASE_URL}${endpoint}`, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (res.ok) {
        setPublishStatus('Success!');
        setTimeout(() => {
          setServiceForm({ title: '', category: 'tent', description: '', rate: '', unitType: 'Per Day', itemsIncluded: [], images: [], contactNumber: '', _id: '', customItem: '' });
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

  const updateBookingStatus = async (bookingId: string, payload: any) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/bookings/${bookingId}/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (res.ok) fetchBookings();
    } catch (e) {} finally { setLoading(false); }
  };

  const handleAdvanceUpload = (e: React.ChangeEvent<HTMLInputElement>, bookingId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = async () => {
      setLoading(true);
      try {
        const compressed = await compressImage(reader.result as string);
        await fetch(`${API_BASE_URL}/bookings/${bookingId}/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ advanceProof: compressed, status: 'advance_paid' }) });
        alert("Biyana proof uploaded!"); fetchBookings();
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
    const steps = ['pending', 'approved', 'advance_paid', 'completed'];
    const currentIndex = steps.indexOf(status);
    return (
      <div className="flex items-center justify-between w-full mb-8 relative px-2">
        <div className="absolute top-[14px] left-0 right-0 h-[2px] bg-gray-100 -z-10"></div>
        {steps.map((step, index) => (
          <div key={step} className="flex flex-col items-center flex-1">
            <div className={`w-8 h-8 rounded-full border-4 border-white shadow-sm flex items-center justify-center text-[10px] font-black ${index <= currentIndex ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400'}`}>
              {index < currentIndex ? <i className="fas fa-check"></i> : index + 1}
            </div>
            <span className={`text-[7px] mt-2 font-black uppercase tracking-widest ${index <= currentIndex ? 'text-green-600' : 'text-gray-300'}`}>{step.replace('_', ' ')}</span>
          </div>
        ))}
      </div>
    );
  };

  if (!user) {
    return (
      <div className="max-w-md mx-auto min-h-screen bg-[#2874f0] flex items-center justify-center p-6">
        <div className="bg-white w-full p-8 rounded-[2rem] shadow-2xl">
          <div className="text-center mb-8"><h1 className="text-4xl font-black text-[#2874f0] italic">GramCart</h1></div>
          <form onSubmit={handleAuth} className="space-y-4">
            {authMode === 'register' && (
              <><input placeholder="Name" className="w-full bg-gray-50 p-4 rounded-xl border outline-none font-bold" onChange={e => setAuthForm({...authForm, name: e.target.value})} required /><input placeholder="Mobile Number" className="w-full bg-gray-50 p-4 rounded-xl border outline-none font-bold" onChange={e => setAuthForm({...authForm, mobile: e.target.value})} required /></>
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
            <button className="w-full py-5 rounded-xl font-black text-white bg-[#fb641b] shadow-xl uppercase text-xs tracking-widest active:scale-95 transition-all">{loading ? 'Processing...' : (authMode === 'login' ? 'Login' : 'Sign Up')}</button>
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
                {CATEGORIES.map(c => (
                    <button key={c.id} onClick={() => fetchData(c.id)} className="flex flex-col items-center gap-2 min-w-[85px]">
                        <div className={`w-16 h-16 rounded-3xl ${c.color} flex items-center justify-center shadow-md border-4 border-white`}><i className={`fas ${c.icon} text-xl`}></i></div>
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{c.name}</span>
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
                    <span className="text-white bg-green-500 text-[10px] font-black px-3 py-1.5 rounded-xl">4.8 <i className="fas fa-star text-[8px]"></i></span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {vendor.services?.map((s: any) => (
                    <div key={s._id} className="border border-gray-50 p-2.5 rounded-3xl bg-gray-50/50 group hover:bg-white transition-all shadow-sm">
                        <img src={s.images?.[0] || 'https://via.placeholder.com/300'} className="h-32 w-full object-cover rounded-2xl mb-3" />
                        <p className="text-[11px] font-black text-gray-700 truncate mb-1 uppercase tracking-tighter">{s.title}</p>
                        <p className="text-[#2874f0] font-black text-sm">₹{s.rate}/- <span className="text-[8px] text-gray-400 font-bold uppercase">{s.unitType}</span></p>
                        <div className="flex gap-2 mt-4">
                           <button onClick={() => setDetailTarget(s)} className="flex-1 bg-white border border-gray-200 text-gray-400 text-[9px] font-black py-2.5 rounded-xl">Details</button>
                           <button onClick={() => { setBookingTarget(s); setBookingForm({ startDate: '', endDate: '', address: '' }); }} className="flex-1 bg-[#fb641b] text-white text-[9px] font-black py-2.5 rounded-xl active:scale-95 transition-all">Book</button>
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
              <h3 className="text-sm font-black text-[#2874f0] uppercase mb-8 tracking-widest text-center border-b pb-4">{serviceForm._id ? 'Edit Service' : 'List New Service'}</h3>
              <form onSubmit={handleAddOrUpdateService} className="space-y-6">
                <div className="bg-blue-50/50 p-6 rounded-[2rem] border border-blue-100">
                  <p className="text-[10px] font-black text-blue-400 uppercase mb-4 flex justify-between tracking-widest">Photos (Max 5) <span>{serviceForm.images.length}/5</span></p>
                  <div className="flex flex-wrap gap-3">
                    {serviceForm.images.map((img, idx) => (
                      <div key={idx} className="relative w-20 h-20"><img src={img} className="w-full h-full object-cover rounded-2xl shadow-lg" /><button type="button" onClick={() => removeImage(idx)} className="absolute -top-2 -right-2 bg-red-500 text-white w-6 h-6 rounded-full text-[10px] flex items-center justify-center shadow-xl"><i className="fas fa-times"></i></button></div>
                    ))}
                    {serviceForm.images.length < 5 && (
                      <button type="button" onClick={() => fileInputRef.current?.click()} className="w-20 h-20 rounded-2xl border-2 border-dashed border-blue-200 text-blue-300 flex items-center justify-center bg-white shadow-inner active:scale-95 transition-all"><i className="fas fa-camera text-2xl"></i></button>
                    )}
                  </div>
                  <input type="file" multiple accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageUpload} />
                </div>
                <input placeholder="Service Title (e.g. Maharaja DJ)" className="w-full bg-gray-50 p-4 rounded-xl border-none outline-none font-bold text-sm shadow-inner" value={serviceForm.title} onChange={e => setServiceForm({...serviceForm, title: e.target.value})} required />
                <div className="grid grid-cols-2 gap-4">
                   <select className="bg-gray-50 p-4 rounded-xl font-black text-xs text-gray-500 shadow-inner" value={serviceForm.category} onChange={e => setServiceForm({...serviceForm, category: e.target.value})}>
                     {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                   </select>
                   <select className="bg-gray-50 p-4 rounded-xl font-black text-xs text-gray-500 shadow-inner" value={serviceForm.unitType} onChange={e => setServiceForm({...serviceForm, unitType: e.target.value})}>
                     <option>Per Day</option><option>Per Piece</option><option>Per Plate</option>
                   </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <input placeholder="Price (₹)" type="number" className="bg-gray-50 p-4 rounded-xl font-bold text-sm shadow-inner" value={serviceForm.rate} onChange={e => setServiceForm({...serviceForm, rate: e.target.value})} required />
                   <input placeholder="Contact Phone" type="tel" className="bg-gray-50 p-4 rounded-xl font-bold text-sm shadow-inner" value={serviceForm.contactNumber} onChange={e => setServiceForm({...serviceForm, contactNumber: e.target.value})} required />
                </div>
                <div className="bg-gray-50 p-6 rounded-[2rem] shadow-inner">
                  <p className="text-[10px] font-black text-gray-400 uppercase mb-4 tracking-widest">Select Items Included</p>
                  <div className="flex flex-wrap gap-2 mb-6">
                    {(PRESETS[serviceForm.category] || []).map(item => (
                      <button key={item} type="button" onClick={() => {
                        const exists = serviceForm.itemsIncluded.includes(item);
                        setServiceForm({ ...serviceForm, itemsIncluded: exists ? serviceForm.itemsIncluded.filter(i => i !== item) : [...serviceForm.itemsIncluded, item] });
                      }} className={`px-4 py-2 rounded-xl text-[10px] font-black border-2 transition-all ${serviceForm.itemsIncluded.includes(item) ? 'bg-[#2874f0] text-white border-[#2874f0] shadow-md' : 'bg-white text-gray-400 border-gray-100'}`}>{item}</button>
                    ))}
                  </div>
                  <div className="flex gap-2"><input placeholder="Manual item..." className="flex-1 bg-white p-4 rounded-xl text-xs font-bold shadow-inner" value={serviceForm.customItem || ''} onChange={e => setServiceForm({...serviceForm, customItem: e.target.value})} /><button type="button" onClick={() => { if(serviceForm.customItem) setServiceForm({...serviceForm, itemsIncluded: [...serviceForm.itemsIncluded, serviceForm.customItem], customItem: ''})} } className="bg-[#2874f0] text-white px-6 py-2 rounded-xl text-xs font-black shadow-lg">ADD</button></div>
                </div>
                <textarea placeholder="Tell customer about your service quality..." className="w-full bg-gray-50 p-4 rounded-xl font-medium text-sm h-40 outline-none shadow-inner" value={serviceForm.description} onChange={e => setServiceForm({...serviceForm, description: e.target.value})} />
                <button type="submit" className="w-full bg-[#fb641b] text-white py-5 rounded-2xl font-black uppercase text-xs shadow-2xl tracking-widest active:scale-95 transition-all">Publish Service Live</button>
              </form>
            </div>
          </div>
        )}

        {view === 'bookings' && (
          <div className="space-y-6">
             <h2 className="text-xl font-black text-gray-800 border-l-8 border-[#fb641b] pl-4 mb-6 uppercase tracking-tighter">Current Orders</h2>
             {bookings.map(b => (
               <div key={b._id} className="bg-white p-6 rounded-[2.5rem] shadow-sm mb-6 border border-gray-50 animate-slideIn">
                 <div className="flex justify-between items-start mb-6">
                    <div>
                        <p className="text-[10px] font-black text-[#2874f0] uppercase tracking-widest mb-1">{b.serviceId?.title}</p>
                        <h4 className="font-black text-gray-800 text-lg leading-tight">{user?.role === UserRole.VENDOR ? b.customerId?.name : b.vendorId?.businessName}</h4>
                    </div>
                    <span className={`text-[8px] font-black uppercase px-4 py-2 rounded-full shadow-sm ${b.status === 'completed' ? 'bg-green-100 text-green-600' : 'bg-blue-50 text-blue-600'}`}>{b.status}</span>
                 </div>
                 <Stepper status={b.status} />
                 <div className="bg-gray-50 p-5 rounded-3xl text-[10px] font-black text-gray-600 space-y-3 shadow-inner">
                    <div className="flex justify-between uppercase tracking-widest"><span>Booking Dates:</span><span className="text-gray-900">{new Date(b.startDate).toLocaleDateString()} - {new Date(b.endDate).toLocaleDateString()}</span></div>
                    <div className="flex justify-between border-t border-gray-200 pt-3"><span>Delivery Location:</span><span className="text-gray-900 line-clamp-1">{b.address}</span></div>
                    <div className="flex justify-between border-t border-gray-200 pt-3"><span>Total Bill:</span><span className="text-gray-900 text-sm">₹{b.totalAmount}</span></div>
                 </div>

                 {user?.role === UserRole.USER && b.status === 'approved' && (
                    <div className="mt-6 p-5 bg-blue-50 rounded-[2rem] border-2 border-dashed border-blue-200 text-center animate-pulse">
                        <p className="text-[10px] font-black text-blue-800 uppercase mb-4 tracking-widest">Pay Biyana (Advance) to UPI: {b.vendorId?.upiId}</p>
                        <input type="file" className="hidden" ref={proofInputRef} onChange={(e) => handleAdvanceUpload(e, b._id)} />
                        <button onClick={() => proofInputRef.current?.click()} className="w-full bg-[#2874f0] text-white py-4 rounded-xl text-[10px] font-black uppercase shadow-lg">Upload UPI Screenshot</button>
                    </div>
                 )}

                 {user?.role === UserRole.USER && (b.status === 'advance_paid' || b.status === 'completed') && (
                    <div className="mt-6 p-5 bg-green-50 rounded-[2rem] text-center border border-green-100">
                        <p className="text-[10px] font-black text-green-800 uppercase mb-4">Your Completion OTP (Deliver to Vendor)</p>
                        <div className="text-3xl font-black text-green-600 tracking-[1rem] bg-white py-4 rounded-2xl shadow-inner">{b.otp}</div>
                    </div>
                 )}

                 {user?.role === UserRole.VENDOR && b.status === 'pending' && (
                    <div className="flex gap-4 mt-6">
                      <button onClick={() => updateBookingStatus(b._id, { status: 'approved' })} className="flex-1 bg-green-500 text-white py-4 rounded-2xl text-[10px] font-black uppercase shadow-xl active:scale-95 transition-all">Approve</button>
                      <button onClick={() => updateBookingStatus(b._id, { status: 'rejected' })} className="flex-1 bg-red-50 text-red-500 py-4 rounded-2xl text-[10px] font-black uppercase active:scale-95 transition-all">Reject</button>
                    </div>
                 )}

                 {user?.role === UserRole.VENDOR && b.status === 'advance_paid' && (
                    <button onClick={() => setOtpTarget({ id: b._id, code: '', correctCode: b.otp })} className="w-full mt-6 bg-[#2874f0] text-white py-4 rounded-2xl text-[10px] font-black uppercase shadow-xl tracking-widest active:scale-95 transition-all">Enter Service OTP (Deliver Now)</button>
                 )}
               </div>
             ))}
          </div>
        )}

        {view === 'my-services' && (
          <div className="space-y-6 animate-slideIn">
             <h2 className="text-lg font-black text-gray-800 mb-6 uppercase tracking-widest text-xs border-l-8 border-[#2874f0] pl-4">Your Listings</h2>
             {myServices.map(s => (
               <div key={s._id} className="bg-white p-5 rounded-[2.5rem] shadow-sm flex items-center gap-6 border border-gray-50 transition-all active:scale-95">
                  <img src={s.images?.[0] || 'https://via.placeholder.com/300'} className="w-24 h-24 rounded-3xl object-cover shadow-md" />
                  <div className="flex-1">
                      <p className="font-black text-gray-800 text-[13px] uppercase truncate w-32 tracking-tighter">{s.title}</p>
                      <p className="text-[#2874f0] text-[11px] font-black mt-1">₹{s.rate} / {s.unitType}</p>
                  </div>
                  <div className="flex flex-col gap-3">
                    <button onClick={() => deleteService(s._id)} className="w-10 h-10 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center shadow-sm"><i className="fas fa-trash text-sm"></i></button>
                    <button onClick={() => { setServiceForm({ ...s, customItem: '' }); setView('vendor-dashboard'); }} className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-sm"><i className="fas fa-edit text-sm"></i></button>
                  </div>
               </div>
             ))}
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white h-24 flex items-center justify-around shadow-[0_-20px_60px_-15px_rgba(0,0,0,0.1)] z-[150] rounded-t-[3.5rem] px-8 border-t border-gray-100">
        <button onClick={() => setView('home')} className={`flex flex-col items-center gap-2 transition-all ${view === 'home' ? 'text-[#2874f0] scale-125' : 'text-gray-300'}`}><i className="fas fa-home text-xl"></i><span className="text-[8px] font-black uppercase tracking-widest">Home</span></button>
        <button onClick={() => { setView('bookings'); fetchBookings(); }} className={`flex flex-col items-center gap-2 transition-all ${view === 'bookings' ? 'text-[#2874f0] scale-125' : 'text-gray-300'}`}><i className="fas fa-shopping-bag text-xl"></i><span className="text-[8px] font-black uppercase tracking-widest">Orders</span></button>
        {user?.role === UserRole.VENDOR && (
          <>
            <button onClick={() => setView('my-services')} className={`flex flex-col items-center gap-2 transition-all ${view === 'my-services' ? 'text-[#2874f0] scale-125' : 'text-gray-300'}`}><i className="fas fa-store text-xl"></i><span className="text-[8px] font-black uppercase tracking-widest">Shop</span></button>
            <button onClick={() => { setServiceForm({title: '', category: 'tent', description: '', rate: '', unitType: 'Per Day', itemsIncluded: [], images: [], contactNumber: '', _id: '', customItem: ''}); setView('vendor-dashboard'); }} className={`flex flex-col items-center gap-2 transition-all ${view === 'vendor-dashboard' ? 'text-[#2874f0] scale-125' : 'text-gray-300'}`}><i className="fas fa-plus-circle text-xl"></i><span className="text-[8px] font-black uppercase tracking-widest">List</span></button>
          </>
        )}
        <button onClick={() => { localStorage.clear(); setUser(null); }} className="text-red-200 transition-all hover:text-red-500"><i className="fas fa-power-off text-xl"></i></button>
      </nav>

      {/* DETAIL MODAL - CUSTOMER VIEW */}
      {detailTarget && (
        <div className="fixed inset-0 bg-black/70 z-[200] flex items-center justify-center p-5 backdrop-blur-md overflow-y-auto">
           <div className="bg-white w-full rounded-[3rem] p-8 animate-slideUp max-h-[90vh] overflow-y-auto shadow-2xl relative">
              <button onClick={() => setDetailTarget(null)} className="absolute top-6 right-6 text-gray-300 hover:text-red-500 transition-all"><i className="fas fa-times-circle text-3xl"></i></button>
              <h2 className="text-2xl font-black text-gray-800 tracking-tighter mb-6 mt-2">{detailTarget.title}</h2>
              <div className="flex gap-4 overflow-x-auto no-scrollbar mb-8 py-2">
                 {(detailTarget.images || []).map((img: string, i: number) => (
                    <img key={i} src={img} className="h-56 w-72 object-cover rounded-[2rem] flex-shrink-0 shadow-lg border-4 border-white" />
                 ))}
              </div>
              <div className="space-y-8">
                 <div className="bg-blue-50/50 p-6 rounded-[2rem] border border-blue-50">
                    <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-3">Service Description</p>
                    <p className="text-sm text-gray-700 font-bold leading-relaxed">{detailTarget.description}</p>
                 </div>
                 <div className="bg-gray-50/50 p-6 rounded-[2rem]">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-5">Items & Inventory Included</p>
                    <div className="flex flex-wrap gap-3">
                       {(detailTarget.itemsIncluded || []).map((item: string, i: number) => (
                          <span key={i} className="bg-white border-2 border-gray-50 px-5 py-2.5 rounded-2xl text-[11px] font-black text-gray-600 shadow-sm flex items-center gap-2"><i className="fas fa-check-circle text-green-500"></i> {item}</span>
                       ))}
                    </div>
                 </div>
                 <div className="flex gap-4 sticky bottom-0 bg-white py-4 border-t border-gray-50">
                    <div className="flex-1 bg-gray-50 p-5 rounded-[1.5rem] shadow-inner">
                       <p className="text-[9px] font-black text-gray-400 uppercase mb-1">Total Rate</p>
                       <p className="text-xl font-black text-[#2874f0]">₹{detailTarget.rate}/-</p>
                    </div>
                    <button onClick={() => { setBookingTarget(detailTarget); setDetailTarget(null); }} className="flex-[2] bg-[#fb641b] text-white rounded-[1.5rem] font-black uppercase tracking-widest text-xs shadow-2xl active:scale-95 transition-all">Book Now</button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* BOOKING MODAL */}
      {bookingTarget && (
        <div className="fixed inset-0 bg-black/60 z-[300] flex items-center justify-center p-6 backdrop-blur-sm">
           <div className="bg-white w-full rounded-[3rem] p-10 animate-slideUp shadow-2xl border-t-8 border-[#fb641b]">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-xl font-black text-gray-800 uppercase tracking-tighter">Booking Details</h2>
                <button onClick={() => setBookingTarget(null)} className="text-gray-300 hover:text-red-500 transition-all"><i className="fas fa-times text-xl"></i></button>
              </div>
              <form onSubmit={handleBooking} className="space-y-6">
                 <div className="bg-gray-50 p-5 rounded-2xl shadow-inner">
                    <p className="text-[10px] font-black text-gray-400 uppercase mb-2">Service Selection</p>
                    <p className="font-black text-gray-800 uppercase tracking-tight">{bookingTarget.title}</p>
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><p className="text-[9px] font-black text-gray-400 uppercase ml-1">Event Start</p><input type="date" className="w-full bg-gray-50 p-4 rounded-xl text-xs font-black shadow-inner" required onChange={e => setBookingForm({...bookingForm, startDate: e.target.value})} /></div>
                    <div className="space-y-2"><p className="text-[9px] font-black text-gray-400 uppercase ml-1">Event End</p><input type="date" className="w-full bg-gray-50 p-4 rounded-xl text-xs font-black shadow-inner" required onChange={e => setBookingForm({...bookingForm, endDate: e.target.value})} /></div>
                 </div>
                 <div className="space-y-2">
                    <p className="text-[9px] font-black text-gray-400 uppercase ml-1">Event Venue / Address</p>
                    <textarea placeholder="Village Address" className="w-full bg-gray-50 p-5 rounded-xl text-xs font-black h-28 outline-none shadow-inner" required onChange={e => setBookingForm({...bookingForm, address: e.target.value})} />
                 </div>
                 <button type="submit" className="w-full bg-[#fb641b] text-white py-6 rounded-2xl font-black uppercase text-xs shadow-2xl tracking-widest active:scale-95 transition-all">Submit Request</button>
              </form>
           </div>
        </div>
      )}

      {/* OTP VERIFICATION MODAL - VENDOR VIEW */}
      {otpTarget && (
        <div className="fixed inset-0 bg-black/60 z-[300] flex items-center justify-center p-6 backdrop-blur-sm">
           <div className="bg-white w-full rounded-[2rem] p-8 animate-slideUp text-center">
              <h2 className="text-lg font-black text-gray-800 mb-4 uppercase">Verify Delivery OTP</h2>
              <p className="text-[10px] font-bold text-gray-400 mb-6">Ask customer for the security code shown on their app.</p>
              <input type="text" maxLength={4} className="w-full bg-gray-50 p-6 rounded-2xl text-3xl font-black text-center tracking-[1rem] outline-none shadow-inner mb-6" value={otpTarget.code} onChange={(e) => setOtpTarget({...otpTarget, code: e.target.value})} />
              <div className="flex gap-4">
                  <button onClick={() => setOtpTarget(null)} className="flex-1 bg-gray-100 text-gray-400 py-4 rounded-xl text-[10px] font-black uppercase">Back</button>
                  <button onClick={() => {
                      if (otpTarget.code === otpTarget.correctCode) {
                          updateBookingStatus(otpTarget.id, { status: 'completed' });
                          setOtpTarget(null);
                          alert("Order Verified & Completed!");
                      } else alert("Invalid OTP! Check again.");
                  }} className="flex-2 bg-green-500 text-white py-4 rounded-xl text-[10px] font-black uppercase shadow-xl">Complete Delivery</button>
              </div>
           </div>
        </div>
      )}

      <style>{`
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        .animate-slideUp { animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1); }
        @keyframes slideIn { from { transform: translateX(-20px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        .animate-slideIn { animation: slideIn 0.5s ease-out; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        @keyframes progress { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
      `}</style>
    </div>
  );
};

export default App;
