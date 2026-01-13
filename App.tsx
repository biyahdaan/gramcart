
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
  const [publishStatus, setPublishStatus] = useState<string>(''); // For progress feedback
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

  // Image Compression Logic using Canvas API
  const compressImage = (base64Str: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const max_size = 1000; // Max width/height

        if (width > height) {
          if (width > max_size) { height *= max_size / width; width = max_size; }
        } else {
          if (height > max_size) { width *= max_size / height; height = max_size; }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        // Compressed as JPEG with 0.6 quality (60%)
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

  // Added deleteService to fix line 408 error
  const deleteService = async (serviceId: string) => {
    if (!window.confirm("Are you sure you want to delete this service?")) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/services/${serviceId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        fetchMyServices();
        fetchData();
      } else {
        const err = await res.json();
        alert(err.error || "Delete failed");
      }
    } catch (e) {
      alert("Error: Connection lost");
    } finally {
      setLoading(false);
    }
  };

  const handleAddOrUpdateService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return alert("Please login first");
    
    setLoading(true);
    setPublishStatus('Processing Images...');

    try {
      // 1. Compress all images before sending
      const compressedImages = await Promise.all(
        serviceForm.images.map(img => img.startsWith('data:image') ? compressImage(img) : img)
      );

      setPublishStatus('Connecting to GramCart...');
      const vendorsRes = await fetch(`${API_BASE_URL}/search`);
      const allVendors = await vendorsRes.json();
      const v = allVendors.find((vend: any) => vend.userId === (user._id || user.id));
      
      if (!v) throw new Error("Vendor not found");

      setPublishStatus('Uploading Service Details...');
      const method = serviceForm._id ? 'PUT' : 'POST';
      const endpoint = serviceForm._id ? `/services/${serviceForm._id}` : '/services';
      
      const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ...serviceForm, 
          images: compressedImages, 
          vendorId: v._id, 
          rate: Number(serviceForm.rate) 
        })
      });

      if (res.ok) {
        setPublishStatus('Success! Service Live.');
        setTimeout(() => {
          setServiceForm({ title: '', category: 'tent', description: '', rate: '', unitType: 'Per Day', itemsIncluded: [], images: [], contactNumber: '', _id: '', customItem: '' });
          setPublishStatus('');
          fetchMyServices(); fetchData(); setView('my-services');
          setLoading(false);
        }, 1500);
      } else {
        const err = await res.json();
        alert(err.error || "Publish failed");
        setLoading(false);
      }
    } catch (e) {
      alert("Error: Data connection lost");
      setLoading(false);
    }
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
      } else alert(result.error);
    } catch (err) {} finally { setLoading(false); }
  };

  const updateBookingStatus = async (bookingId: string, payload: any) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/bookings/${bookingId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
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
      const vendorsRes = await fetch(`${API_BASE_URL}/search`);
      const allVendors = await vendorsRes.json();
      const v = allVendors.find((vend: any) => vend.userId === (user._id || user.id));
      if (v) {
        const res = await fetch(`${API_BASE_URL}/my-services/${v._id}`);
        if (res.ok) setMyServices(await res.json());
      }
    } catch (e) {}
  };

  const togglePresetItem = (item: string) => {
    const exists = serviceForm.itemsIncluded.includes(item);
    setServiceForm({ ...serviceForm, itemsIncluded: exists ? serviceForm.itemsIncluded.filter(i => i !== item) : [...serviceForm.itemsIncluded, item] });
  };

  const addCustomItem = () => {
    if (serviceForm.customItem?.trim()) {
      setServiceForm({ ...serviceForm, itemsIncluded: [...serviceForm.itemsIncluded, serviceForm.customItem.trim()], customItem: '' });
    }
  };

  if (!user) {
    return (
      <div className="max-w-md mx-auto min-h-screen bg-[#2874f0] flex items-center justify-center p-6">
        <div className="bg-white w-full p-8 rounded-2xl shadow-2xl">
          <div className="text-center mb-8"><h1 className="text-4xl font-black text-[#2874f0] italic">GramCart</h1></div>
          <form onSubmit={handleAuth} className="space-y-4">
            {authMode === 'register' && (
              <><input placeholder="Name" className="w-full bg-gray-50 p-4 rounded-xl border outline-none" onChange={e => setAuthForm({...authForm, name: e.target.value})} required /><input placeholder="Mobile" className="w-full bg-gray-50 p-4 rounded-xl border outline-none" onChange={e => setAuthForm({...authForm, mobile: e.target.value})} required /></>
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
      {/* Loading & Progress Overlay */}
      {loading && publishStatus && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[1000] flex flex-col items-center justify-center p-8">
            <div className="w-20 h-20 border-4 border-white/20 border-t-[#fb641b] rounded-full animate-spin mb-6"></div>
            <p className="text-white font-black text-xl uppercase tracking-widest text-center animate-pulse">{publishStatus}</p>
            <p className="text-white/50 text-[10px] mt-4 font-bold">Optimizing data for village network...</p>
        </div>
      )}

      <header className="bg-[#2874f0] p-4 text-white sticky top-0 z-[100] shadow-md">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-3"><i className="fas fa-bars"></i><h1 className="text-xl font-black italic tracking-tighter">GramCart</h1></div>
          <LanguageSwitch current={lang} onChange={setLang} />
        </div>
        <div className="relative">
          <input placeholder={Translations[lang].searchPlaceholder} className="w-full bg-white text-gray-800 p-3.5 pl-10 pr-12 rounded-lg text-sm outline-none shadow-inner" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}/>
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
                <div className="flex justify-between items-center mb-4"><h4 className="font-black text-gray-800">{vendor.businessName}</h4><span className="text-white bg-green-600 text-[10px] font-black px-2 py-1 rounded">4.5 ★</span></div>
                <div className="grid grid-cols-2 gap-4">
                  {vendor.services?.map((s: any) => (
                    <div key={s._id} className="border border-gray-50 p-2 rounded-2xl bg-gray-50/50">
                        <img src={s.images?.[0] || 'https://via.placeholder.com/150'} className="h-28 w-full object-cover rounded-xl mb-2" />
                        <p className="text-[10px] font-black text-gray-700 truncate">{s.title}</p>
                        <p className="text-[#2874f0] font-black text-sm">₹{s.rate}/-</p>
                        <div className="flex gap-1.5 mt-3">
                           <button onClick={() => setDetailTarget(s)} className="flex-1 bg-white border border-gray-200 text-gray-500 text-[9px] font-bold py-2 rounded-lg">Details</button>
                           <button onClick={() => setBookingTarget(s)} className="flex-1 bg-[#fb641b] text-white text-[9px] font-black py-2 rounded-lg">Book</button>
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
            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100">
              <h3 className="text-sm font-black text-[#2874f0] uppercase mb-6 tracking-widest text-center">Service Listing</h3>
              <form onSubmit={handleAddOrUpdateService} className="space-y-5">
                <div className="bg-blue-50/50 p-5 rounded-2xl border border-blue-100">
                  <p className="text-[10px] font-black text-blue-400 uppercase mb-4 flex justify-between">Photos (Auto-Optimized) <span>{serviceForm.images.length}/5</span></p>
                  <div className="flex flex-wrap gap-3">
                    {serviceForm.images.map((img, idx) => (
                      <div key={idx} className="relative w-16 h-16"><img src={img} className="w-full h-full object-cover rounded-xl shadow-sm" /><button type="button" onClick={() => removeImage(idx)} className="absolute -top-1 -right-1 bg-red-500 text-white w-5 h-5 rounded-full text-[10px] flex items-center justify-center shadow-lg"><i className="fas fa-times"></i></button></div>
                    ))}
                    {serviceForm.images.length < 5 && (
                      <button type="button" onClick={() => fileInputRef.current?.click()} className="w-16 h-16 rounded-xl border-2 border-dashed border-blue-200 text-blue-300 flex items-center justify-center"><i className="fas fa-camera text-xl"></i></button>
                    )}
                  </div>
                  <input type="file" multiple accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageUpload} />
                  <p className="text-[8px] text-blue-300 mt-3 italic">*Images are automatically compressed to save data.</p>
                </div>
                <input placeholder="Service Title (e.g. DJ Sound System)" className="w-full bg-gray-50 p-4 rounded-xl border border-gray-100 text-sm outline-none" value={serviceForm.title} onChange={e => setServiceForm({...serviceForm, title: e.target.value})} required />
                <div className="grid grid-cols-2 gap-3">
                   <select className="bg-gray-50 p-4 rounded-xl border border-gray-100 text-xs font-bold" value={serviceForm.category} onChange={e => setServiceForm({...serviceForm, category: e.target.value})}>
                     {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                   </select>
                   <select className="bg-gray-50 p-4 rounded-xl border border-gray-100 text-xs font-bold" value={serviceForm.unitType} onChange={e => setServiceForm({...serviceForm, unitType: e.target.value})}>
                     <option>Per Day</option><option>Per Piece</option><option>Per Plate</option>
                   </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                   <input placeholder="Rate (₹)" type="number" className="bg-gray-50 p-4 rounded-xl border border-gray-100 text-sm" value={serviceForm.rate} onChange={e => setServiceForm({...serviceForm, rate: e.target.value})} required />
                   <input placeholder="Contact Number" type="tel" className="bg-gray-50 p-4 rounded-xl border border-gray-100 text-sm" value={serviceForm.contactNumber} onChange={e => setServiceForm({...serviceForm, contactNumber: e.target.value})} required />
                </div>
                <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100">
                  <p className="text-[10px] font-black text-gray-400 uppercase mb-4">Inventory Included</p>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {(PRESETS[serviceForm.category] || []).map(item => (
                      <button key={item} type="button" onClick={() => togglePresetItem(item)} className={`px-3 py-2 rounded-lg text-[9px] font-black border ${serviceForm.itemsIncluded.includes(item) ? 'bg-[#2874f0] text-white' : 'bg-white text-gray-400'}`}>{item}</button>
                    ))}
                  </div>
                  <div className="flex gap-2"><input placeholder="Add other items..." className="flex-1 bg-white p-3 rounded-lg text-xs border border-gray-100 outline-none" value={serviceForm.customItem || ''} onChange={e => setServiceForm({...serviceForm, customItem: e.target.value})} /><button type="button" onClick={addCustomItem} className="bg-[#2874f0] text-white px-5 py-2 rounded-lg text-xs font-bold">ADD</button></div>
                </div>
                <textarea placeholder="Describe your service..." className="w-full bg-gray-50 p-4 rounded-xl border border-gray-100 text-sm h-28 outline-none" value={serviceForm.description} onChange={e => setServiceForm({...serviceForm, description: e.target.value})} />
                <button type="submit" className="w-full bg-[#fb641b] text-white py-4.5 rounded-xl font-black uppercase text-xs shadow-xl active:scale-95 transition-all">Publish Service Now</button>
              </form>
            </div>
          </div>
        )}

        {view === 'my-services' && (
          <div className="space-y-4">
             <h2 className="text-lg font-black text-gray-800 mb-4 px-2 tracking-tight uppercase tracking-widest">My Listings</h2>
             {myServices.map(s => (
               <div key={s._id} className="bg-white p-4 rounded-2xl shadow-sm flex items-center gap-4 animate-slideIn border border-gray-50">
                  <img src={s.images?.[0]} className="w-16 h-16 rounded-xl object-cover" />
                  <div className="flex-1">
                      <p className="font-black text-gray-800 text-[11px] uppercase truncate w-32">{s.title}</p>
                      <p className="text-[#2874f0] text-[10px] font-black mt-1">₹{s.rate} / {s.unitType}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => deleteService(s._id)} className="w-8 h-8 rounded-full bg-red-50 text-red-500 flex items-center justify-center text-[10px]"><i className="fas fa-trash"></i></button>
                    <button onClick={() => { setServiceForm({ ...s, images: s.images || [], itemsIncluded: s.itemsIncluded || [], customItem: '' }); setView('vendor-dashboard'); }} className="w-8 h-8 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center text-[10px]"><i className="fas fa-edit"></i></button>
                  </div>
               </div>
             ))}
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white h-22 flex items-center justify-around shadow-2xl border-t z-[150] rounded-t-[2.5rem] px-4">
        <button onClick={() => setView('home')} className={`flex flex-col items-center gap-1.5 ${view === 'home' ? 'text-[#2874f0]' : 'text-gray-300'}`}><i className="fas fa-home text-xl"></i><span className="text-[8px] font-black uppercase">Home</span></button>
        <button onClick={() => setView('bookings')} className={`flex flex-col items-center gap-1.5 ${view === 'bookings' ? 'text-[#2874f0]' : 'text-gray-400'}`}><i className="fas fa-shopping-bag text-xl"></i><span className="text-[8px] font-black uppercase">Orders</span></button>
        {user?.role === UserRole.VENDOR && (
          <>
            <button onClick={() => setView('my-services')} className={`flex flex-col items-center gap-1.5 ${view === 'my-services' ? 'text-[#2874f0]' : 'text-gray-300'}`}><i className="fas fa-th-list text-xl"></i><span className="text-[8px] font-black uppercase">Store</span></button>
            <button onClick={() => setView('vendor-dashboard')} className={`flex flex-col items-center gap-1.5 ${view === 'vendor-dashboard' ? 'text-[#2874f0]' : 'text-gray-400'}`}><i className="fas fa-plus-circle text-xl"></i><span className="text-[8px] font-black uppercase">Add</span></button>
          </>
        )}
        <button onClick={() => { localStorage.clear(); setUser(null); }} className="text-red-200 hover:text-red-500"><i className="fas fa-power-off text-xl"></i></button>
      </nav>

      <style>{`
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        .animate-slideUp { animation: slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1); }
        @keyframes slideIn { from { transform: translateX(-20px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        .animate-slideIn { animation: slideIn 0.4s ease-out; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
};

export default App;
