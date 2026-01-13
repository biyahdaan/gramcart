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

  const filteredData = data.filter(vendor => {
    const searchLower = searchQuery.toLowerCase();
    return vendor.businessName?.toLowerCase().includes(searchLower) || 
           vendor.services?.some((s: any) => s.title?.toLowerCase().includes(searchLower));
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
      if (res.ok) setData(await res.json());
    } catch (e) {} finally { setLoading(false); }
  };

  const startVoiceSearch = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitRecognition;
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
    recognition.onend = () => setIsListening(false);
  };

  const compressImage = (base64Str: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
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

  const removeImage = (index: number) => setServiceForm(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== index) }));

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
      setPublishStatus('Uploading...');
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
      } else { alert("Upload failed"); setLoading(false); }
    } catch (e) { alert("Error connecting to server"); setLoading(false); }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const endpoint = authMode === 'login' ? '/login' : '/register';
    const payload = authMode === 'login' 
      ? { identifier: authForm.identifier, password: authForm.password } 
      : { name: authForm.name, email: authForm.email, mobile: authForm.mobile, password: authForm.password, role: authForm.role };
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
                totalAmount: bookingTarget.rate * days 
            })
        });
        if (res.ok) { setBookingTarget(null); setView('bookings'); fetchBookings(); } else { alert("Booking failed"); }
    } catch (e) { alert("Server error"); } finally { setLoading(false); }
  };

  const updateBookingStatus = async (bookingId: string, payload: any) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/bookings/${bookingId}/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (res.ok) fetchBookings();
    } catch (e) {} finally { setLoading(false); }
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

  const handleAdvanceUpload = (e: React.ChangeEvent<HTMLInputElement>, bookingId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = async () => {
      setLoading(true);
      try {
        await fetch(`${API_BASE_URL}/bookings/${bookingId}/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ advanceProof: reader.result, status: 'advance_paid' }) });
        alert("Biyana proof uploaded!"); fetchBookings();
      } catch (e) {} finally { setLoading(false); }
    };
    reader.readAsDataURL(file);
  };

  const Stepper = ({ status }: { status: string }) => {
    const steps = ['pending', 'approved', 'advance_paid', 'completed'];
    const currentIndex = steps.indexOf(status);
    return (
      <div className="flex items-center justify-between w-full mb-8 relative">
        <div className="absolute top-[14px] left-0 right-0 h-[3px] bg-gray-100 -z-10"></div>
        {steps.map((step, index) => (
          <div key={step} className="flex flex-col items-center flex-1">
            <div className={`w-8 h-8 rounded-full border-4 border-white shadow-sm flex items-center justify-center text-[10px] font-black ${index <= currentIndex ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400'}`}>
              {index < currentIndex ? <i className="fas fa-check"></i> : index + 1}
            </div>
            <span className={`text-[7px] mt-2 uppercase font-black ${index <= currentIndex ? 'text-green-600' : 'text-gray-300'}`}>{step.replace('_', ' ')}</span>
          </div>
        ))}
      </div>
    );
  };

  if (!user) {
    return (
      <div className="max-w-md mx-auto min-h-screen bg-[#2874f0] flex items-center justify-center p-6">
        <div className="bg-white w-full p-8 rounded-2xl shadow-2xl">
          <div className="text-center mb-8"><h1 className="text-4xl font-black text-[#2874f0] italic tracking-tighter">GramCart</h1></div>
          <form onSubmit={handleAuth} className="space-y-4">
            {authMode === 'register' && (
              <><input placeholder="Name" className="w-full bg-gray-50 p-4 rounded-xl border outline-none" onChange={e => setAuthForm({...authForm, name: e.target.value})} required /><input placeholder="Mobile Number" className="w-full bg-gray-50 p-4 rounded-xl border outline-none" onChange={e => setAuthForm({...authForm, mobile: e.target.value})} required /></>
            )}
            <input placeholder="Email or Mobile" className="w-full bg-gray-50 p-4 rounded-xl border outline-none" onChange={e => setAuthForm({...authForm, identifier: e.target.value})} required />
            <input placeholder="Password" type="password" className="w-full bg-gray-50 p-4 rounded-xl border outline-none" onChange={e => setAuthForm({...authForm, password: e.target.value})} required />
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

  return (
    <div className="max-w-md mx-auto min-h-screen bg-[#f1f3f6] pb-24 relative overflow-x-hidden">
      {loading && publishStatus && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[1000] flex flex-col items-center justify-center p-8">
            <div className="w-24 h-24 border-8 border-white/20 border-t-[#fb641b] rounded-full animate-spin mb-8 shadow-xl"></div>
            <p className="text-white font-black text-2xl uppercase tracking-tighter animate-pulse">{publishStatus}</p>
        </div>
      )}

      <header className="bg-[#2874f0] p-4 text-white sticky top-0 z-[100] shadow-md">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-3"><i className="fas fa-bars"></i><h1 className="text-xl font-black italic tracking-tighter">GramCart</h1></div>
          <LanguageSwitch current={lang} onChange={setLang} />
        </div>
        <div className="relative">
          <input placeholder={Translations[lang].searchPlaceholder} className="w-full bg-white text-gray-800 p-3.5 pl-10 pr-12 rounded-lg text-sm outline-none" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}/>
          <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
          <button onClick={startVoiceSearch} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#2874f0] w-8 h-8 flex items-center justify-center bg-gray-50 rounded-full"><i className={`fas fa-microphone ${isListening ? 'text-red-500 animate-pulse' : ''}`}></i></button>
        </div>
      </header>

      <main className="p-3">
        {view === 'home' && (
          <div className="space-y-4">
            <div className="flex gap-4 overflow-x-auto no-scrollbar p-1">
                {CATEGORIES.map(c => (
                    <button key={c.id} onClick={() => fetchData(c.id)} className="flex flex-col items-center gap-1.5 min-w-[70px]">
                        <div className={`w-14 h-14 rounded-full ${c.color} flex items-center justify-center shadow-md border-2 border-white`}><i className={`fas ${c.icon} text-lg`}></i></div>
                        <span className="text-[9px] font-black text-gray-600 uppercase">{c.name}</span>
                    </button>
                ))}
            </div>
            {filteredData.map(vendor => (
              <div key={vendor._id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-4">
                <div className="flex justify-between items-center mb-4"><h4 className="font-black text-gray-800 tracking-tight">{vendor.businessName}</h4><span className="text-white bg-green-600 text-[10px] font-black px-2 py-1 rounded">4.5 ★</span></div>
                <div className="grid grid-cols-2 gap-4">
                  {vendor.services?.map((s: any) => (
                    <div key={s._id} className="border border-gray-50 p-2 rounded-2xl bg-gray-50/50">
                        <img src={s.images?.[0] || 'https://via.placeholder.com/150'} className="h-28 w-full object-cover rounded-xl mb-2" />
                        <p className="text-[10px] font-black text-gray-700 truncate">{s.title}</p>
                        <p className="text-[#2874f0] font-black text-sm">₹{s.rate}/-</p>
                        <div className="flex gap-1.5 mt-3">
                           <button onClick={() => setDetailTarget(s)} className="flex-1 bg-white border border-gray-200 text-gray-500 text-[9px] font-bold py-2 rounded-lg">Details</button>
                           <button onClick={() => { setBookingTarget(s); setBookingForm({ startDate: '', endDate: '', address: '' }); }} className="flex-1 bg-[#fb641b] text-white text-[9px] font-black py-2 rounded-lg">Book</button>
                        </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {view === 'vendor-dashboard' && user?.role === UserRole.VENDOR && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-[2.5rem] shadow-sm">
              <h3 className="text-sm font-black text-[#2874f0] uppercase mb-8 tracking-widest text-center">{serviceForm._id ? 'Update Listing' : 'Publish Service'}</h3>
              <form onSubmit={handleAddOrUpdateService} className="space-y-6">
                <div className="bg-blue-50/50 p-6 rounded-3xl border border-blue-100">
                  <p className="text-[10px] font-black text-blue-400 uppercase mb-4 flex justify-between">Photos <span>{serviceForm.images.length}/5</span></p>
                  <div className="flex flex-wrap gap-3">
                    {serviceForm.images.map((img, idx) => (
                      <div key={idx} className="relative w-16 h-16"><img src={img} className="w-full h-full object-cover rounded-xl shadow-md" /><button type="button" onClick={() => removeImage(idx)} className="absolute -top-1 -right-1 bg-red-500 text-white w-5 h-5 rounded-full text-[10px] flex items-center justify-center"><i className="fas fa-times"></i></button></div>
                    ))}
                    {serviceForm.images.length < 5 && (
                      <button type="button" onClick={() => fileInputRef.current?.click()} className="w-16 h-16 rounded-xl border-2 border-dashed border-blue-200 text-blue-300 flex items-center justify-center bg-white"><i className="fas fa-camera text-xl"></i></button>
                    )}
                  </div>
                  <input type="file" multiple accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageUpload} />
                </div>
                <input placeholder="Service Title" className="w-full bg-gray-50 p-4 rounded-xl border outline-none" value={serviceForm.title} onChange={e => setServiceForm({...serviceForm, title: e.target.value})} required />
                <div className="grid grid-cols-2 gap-3">
                   <select className="bg-gray-50 p-4 rounded-xl text-xs font-black" value={serviceForm.category} onChange={e => setServiceForm({...serviceForm, category: e.target.value})}>
                     {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                   </select>
                   <select className="bg-gray-50 p-4 rounded-xl text-xs font-black" value={serviceForm.unitType} onChange={e => setServiceForm({...serviceForm, unitType: e.target.value})}>
                     <option>Per Day</option><option>Per Piece</option><option>Per Plate</option>
                   </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                   <input placeholder="Price (₹)" type="number" className="bg-gray-50 p-4 rounded-xl text-sm" value={serviceForm.rate} onChange={e => setServiceForm({...serviceForm, rate: e.target.value})} required />
                   <input placeholder="Phone" type="tel" className="bg-gray-50 p-4 rounded-xl text-sm" value={serviceForm.contactNumber} onChange={e => setServiceForm({...serviceForm, contactNumber: e.target.value})} required />
                </div>
                <div className="bg-gray-50 p-6 rounded-3xl">
                  <p className="text-[10px] font-black text-gray-400 uppercase mb-4">Inventory</p>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {(PRESETS[serviceForm.category] || []).map(item => (
                      <button key={item} type="button" onClick={() => {
                        const exists = serviceForm.itemsIncluded.includes(item);
                        setServiceForm({ ...serviceForm, itemsIncluded: exists ? serviceForm.itemsIncluded.filter(i => i !== item) : [...serviceForm.itemsIncluded, item] });
                      }} className={`px-3 py-2 rounded-lg text-[9px] font-black border ${serviceForm.itemsIncluded.includes(item) ? 'bg-[#2874f0] text-white' : 'bg-white text-gray-400'}`}>{item}</button>
                    ))}
                  </div>
                  <div className="flex gap-2"><input placeholder="Add other..." className="flex-1 bg-white p-3 rounded-xl text-xs" value={serviceForm.customItem || ''} onChange={e => setServiceForm({...serviceForm, customItem: e.target.value})} /><button type="button" onClick={() => { if(serviceForm.customItem) setServiceForm({...serviceForm, itemsIncluded: [...serviceForm.itemsIncluded, serviceForm.customItem], customItem: ''})} } className="bg-[#2874f0] text-white px-5 py-2 rounded-xl text-xs">ADD</button></div>
                </div>
                <textarea placeholder="Description" className="w-full bg-gray-50 p-4 rounded-xl text-sm h-32 outline-none" value={serviceForm.description} onChange={e => setServiceForm({...serviceForm, description: e.target.value})} />
                <button type="submit" className="w-full bg-[#fb641b] text-white py-5 rounded-2xl font-black uppercase text-xs shadow-xl tracking-widest">Publish Live</button>
              </form>
            </div>
          </div>
        )}

        {view === 'my-services' && (
          <div className="space-y-4">
             <h2 className="text-lg font-black text-gray-800 mb-6 uppercase tracking-widest text-xs border-l-4 border-[#2874f0] pl-4">My Storefront</h2>
             {myServices.map(s => (
               <div key={s._id} className="bg-white p-5 rounded-3xl shadow-sm flex items-center gap-5 border border-gray-50">
                  <img src={s.images?.[0] || 'https://via.placeholder.com/150'} className="w-20 h-20 rounded-2xl object-cover" />
                  <div className="flex-1">
                      <p className="font-black text-gray-800 text-[12px] uppercase truncate w-32 tracking-tight">{s.title}</p>
                      <p className="text-[#2874f0] text-[10px] font-black mt-1">₹{s.rate} / {s.unitType}</p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <button onClick={() => deleteService(s._id)} className="w-9 h-9 rounded-xl bg-red-50 text-red-500 flex items-center justify-center shadow-sm"><i className="fas fa-trash text-xs"></i></button>
                    <button onClick={() => { setServiceForm({ ...s, customItem: '' }); setView('vendor-dashboard'); }} className="w-9 h-9 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center shadow-sm"><i className="fas fa-edit text-xs"></i></button>
                  </div>
               </div>
             ))}
          </div>
        )}

        {view === 'bookings' && (
          <div className="space-y-6">
             <h2 className="text-lg font-black text-gray-800 border-l-4 border-[#fb641b] pl-3 mb-4">Orders Sync</h2>
             {bookings.map(b => (
               <div key={b._id} className="bg-white p-6 rounded-[2rem] shadow-sm mb-4">
                 <div className="flex justify-between items-start mb-6">
                    <div>
                        <p className="text-[9px] font-black text-[#2874f0] uppercase tracking-widest mb-1">{b.serviceId?.title}</p>
                        <h4 className="font-black text-gray-800 text-lg">{user?.role === UserRole.VENDOR ? b.customerId?.name : b.vendorId?.businessName}</h4>
                    </div>
                    <span className="text-[8px] font-black uppercase px-3 py-1.5 rounded-full bg-blue-50 text-blue-600">{b.status}</span>
                 </div>
                 <Stepper status={b.status} />
                 <div className="bg-gray-50 p-4 rounded-2xl text-[10px] font-bold text-gray-600">
                    <div className="flex justify-between"><span>Date:</span><span>{new Date(b.startDate).toDateString()}</span></div>
                    <div className="flex justify-between mt-2"><span>Total Bill:</span><span className="text-gray-800 font-black">₹{b.totalAmount}</span></div>
                 </div>
                 {user?.role === UserRole.USER && b.status === 'approved' && (
                    <div className="mt-4 p-4 bg-blue-50 rounded-2xl border-2 border-dashed border-blue-200 text-center">
                        <p className="text-[10px] font-black text-blue-800 uppercase mb-3">UPI: {b.vendorId?.upiId} (Biyana: ₹{Math.round(b.totalAmount * 0.1)})</p>
                        <input type="file" className="hidden" ref={proofInputRef} onChange={(e) => handleAdvanceUpload(e, b._id)} />
                        <button onClick={() => proofInputRef.current?.click()} className="w-full bg-[#2874f0] text-white py-3 rounded-xl text-[10px] font-black uppercase">Upload Payment Screenshot</button>
                    </div>
                 )}
                 {user?.role === UserRole.VENDOR && b.status === 'pending' && (
                    <div className="flex gap-3 mt-4">
                      <button onClick={() => updateBookingStatus(b._id, { status: 'approved' })} className="flex-1 bg-green-500 text-white py-3 rounded-xl text-[10px] font-black uppercase">Approve</button>
                      <button onClick={() => updateBookingStatus(b._id, { status: 'rejected' })} className="flex-1 bg-red-100 text-red-500 py-3 rounded-xl text-[10px] font-black uppercase">Reject</button>
                    </div>
                 )}
               </div>
             ))}
          </div>
        )}
      </main>

      {/* FOOTER NAV */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white h-24 flex items-center justify-around shadow-2xl z-[150] rounded-t-[3rem] px-8 border-t border-gray-50">
        <button onClick={() => setView('home')} className={`flex flex-col items-center gap-2 ${view === 'home' ? 'text-[#2874f0] scale-110' : 'text-gray-300'}`}><i className="fas fa-home text-xl"></i><span className="text-[8px] font-black uppercase">Home</span></button>
        <button onClick={() => { setView('bookings'); fetchBookings(); }} className={`flex flex-col items-center gap-2 ${view === 'bookings' ? 'text-[#2874f0] scale-110' : 'text-gray-300'}`}><i className="fas fa-calendar text-xl"></i><span className="text-[8px] font-black uppercase">Orders</span></button>
        {user?.role === UserRole.VENDOR && (
          <>
            <button onClick={() => setView('my-services')} className={`flex flex-col items-center gap-2 ${view === 'my-services' ? 'text-[#2874f0] scale-110' : 'text-gray-300'}`}><i className="fas fa-store text-xl"></i><span className="text-[8px] font-black uppercase">Store</span></button>
            <button onClick={() => { setServiceForm({title: '', category: 'tent', description: '', rate: '', unitType: 'Per Day', itemsIncluded: [], images: [], contactNumber: '', _id: '', customItem: ''}); setView('vendor-dashboard'); }} className={`flex flex-col items-center gap-2 ${view === 'vendor-dashboard' ? 'text-[#2874f0] scale-110' : 'text-gray-300'}`}><i className="fas fa-plus-circle text-xl"></i><span className="text-[8px] font-black uppercase">Add</span></button>
          </>
        )}
        <button onClick={() => { localStorage.clear(); setUser(null); }} className="text-red-200"><i className="fas fa-power-off text-xl"></i></button>
      </nav>

      {/* DETAIL MODAL */}
      {detailTarget && (
        <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
           <div className="bg-white w-full rounded-[2.5rem] p-6 animate-slideUp max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                 <h2 className="text-xl font-black text-gray-800 tracking-tight">{detailTarget.title}</h2>
                 <button onClick={() => setDetailTarget(null)} className="text-gray-300 hover:text-red-500"><i className="fas fa-times-circle text-2xl"></i></button>
              </div>
              <div className="flex gap-2 overflow-x-auto no-scrollbar mb-6">
                 {(detailTarget.images || []).map((img: string, i: number) => (
                    <img key={i} src={img} className="h-48 w-64 object-cover rounded-2xl flex-shrink-0 shadow-sm" />
                 ))}
              </div>
              <div className="space-y-6">
                 <div className="bg-blue-50 p-4 rounded-2xl">
                    <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-2">Description</p>
                    <p className="text-sm text-gray-700 font-medium leading-relaxed">{detailTarget.description}</p>
                 </div>
                 <div className="bg-gray-50 p-4 rounded-2xl">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Inventory List</p>
                    <div className="flex flex-wrap gap-2">
                       {(detailTarget.itemsIncluded || []).map((item: string, i: number) => (
                          <span key={i} className="bg-white border px-3 py-1.5 rounded-lg text-[10px] font-black text-gray-600 shadow-sm flex items-center gap-2"><i className="fas fa-check text-green-500"></i> {item}</span>
                       ))}
                    </div>
                 </div>
                 <div className="flex gap-4">
                    <div className="flex-1 bg-gray-50 p-4 rounded-2xl">
                       <p className="text-[9px] font-black text-gray-400 uppercase mb-1">Rate</p>
                       <p className="text-lg font-black text-[#2874f0]">₹{detailTarget.rate}/-</p>
                    </div>
                    <button onClick={() => { setBookingTarget(detailTarget); setDetailTarget(null); }} className="flex-[2] bg-[#fb641b] text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl active:scale-95 transition-all">Book Service Now</button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* BOOKING MODAL */}
      {bookingTarget && (
        <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-6 backdrop-blur-sm">
           <div className="bg-white w-full rounded-[2.5rem] p-8 animate-slideUp">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-black text-gray-800 uppercase tracking-tight">Booking Request</h2>
                <button onClick={() => setBookingTarget(null)} className="text-gray-300"><i className="fas fa-times"></i></button>
              </div>
              <form onSubmit={handleBooking} className="space-y-4">
                 <div className="bg-gray-50 p-4 rounded-2xl">
                    <p className="text-[10px] font-black text-gray-400 uppercase mb-2">Service</p>
                    <p className="font-black text-gray-800">{bookingTarget.title}</p>
                 </div>
                 <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1"><p className="text-[8px] font-black text-gray-400 uppercase ml-1">From Date</p><input type="date" className="w-full bg-gray-50 p-4 rounded-xl text-xs font-bold" required onChange={e => setBookingForm({...bookingForm, startDate: e.target.value})} /></div>
                    <div className="space-y-1"><p className="text-[8px] font-black text-gray-400 uppercase ml-1">To Date</p><input type="date" className="w-full bg-gray-50 p-4 rounded-xl text-xs font-bold" required onChange={e => setBookingForm({...bookingForm, endDate: e.target.value})} /></div>
                 </div>
                 <textarea placeholder="Service Address (Village/Gully)" className="w-full bg-gray-50 p-4 rounded-xl text-xs font-bold h-24 outline-none" required onChange={e => setBookingForm({...bookingForm, address: e.target.value})} />
                 <button type="submit" className="w-full bg-[#fb641b] text-white py-5 rounded-2xl font-black uppercase text-xs shadow-xl tracking-widest active:scale-95 transition-all">Submit Booking Request</button>
              </form>
           </div>
        </div>
      )}

      <style>{`
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        .animate-slideUp { animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1); }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        @keyframes progress { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
      `}</style>
    </div>
  );
};

export default App;