
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
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [view, setView] = useState<'home' | 'vendor-dashboard' | 'bookings' | 'my-services'>('home');
  const [data, setData] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [myServices, setMyServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isListening, setIsListening] = useState(false);
  
  const [bookingTarget, setBookingTarget] = useState<any>(null);
  const [detailTarget, setDetailTarget] = useState<any>(null); 
  const [authForm, setAuthForm] = useState({ identifier: '', email: '', mobile: '', password: '', name: '', role: 'user' });
  const [serviceForm, setServiceForm] = useState({
    title: '', category: 'tent', rate: '', unitType: 'Per Day', duration: '1 Day', 
    itemsIncluded: [] as string[], images: [] as string[], contactNumber: '', _id: '', customItem: ''
  });
  const [bookingForm, setBookingForm] = useState({ startDate: '', endDate: '', address: '' });

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('gramcart_user');
    if (saved) {
      try {
        const parsedUser = JSON.parse(saved);
        setUser(parsedUser);
        if (parsedUser?.role === 'vendor') setView('vendor-dashboard');
      } catch (e) {
        localStorage.removeItem('gramcart_user');
      }
    }
    fetchData();
  }, []);

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
      alert("Voice Search not supported in this browser.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = lang === Language.HI ? 'hi-IN' : 'en-US';
    recognition.start();
    setIsListening(true);

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setSearchQuery(transcript);
      setIsListening(false);
      // Trigger search logic or filter
    };

    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
  };

  const deleteService = async (serviceId: string) => {
    if (!window.confirm("Delete this listing? (क्या आप इसे हटाना चाहते हैं?)")) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/services/${serviceId}`, { method: 'DELETE' });
      if (res.ok) {
        alert("Deleted successfully!");
        fetchMyServices();
        fetchData();
      }
    } catch (e) { alert("Delete failed"); } finally { setLoading(false); }
  };

  const fetchBookings = async () => {
    if (!user) return;
    try {
      const id = user._id || user.id;
      const res = await fetch(`${API_BASE_URL}/my-bookings/${user.role}/${id}`);
      if (res.ok) setBookings(await res.json());
    } catch (e) { console.error(e); }
  };

  const fetchMyServices = async () => {
    if (!user || user.role !== UserRole.VENDOR) return;
    try {
      const vendorsRes = await fetch(`${API_BASE_URL}/search`);
      const allVendors = await vendorsRes.json();
      const currentVendor = allVendors.find((v: any) => v.userId === (user._id || user.id));
      if (currentVendor) {
        const res = await fetch(`${API_BASE_URL}/my-services/${currentVendor._id}`);
        if (res.ok) setMyServices(await res.json());
      }
    } catch (e) { console.error(e); }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const fileArray = Array.from(files);
    fileArray.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setServiceForm(prev => ({
          ...prev,
          images: [...prev.images, reader.result as string].slice(0, 5)
        }));
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setServiceForm(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== index) }));
  };

  const updateBookingStatus = async (bookingId: string, status: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/bookings/${bookingId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        alert(`Booking ${status.toUpperCase()} Successfully!`);
        fetchBookings();
      }
    } catch (e) { alert("Action failed"); } finally { setLoading(false); }
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
      } else { alert(result.error || "Authentication failed"); }
    } catch (err) { alert("Server Connection Error"); } finally { setLoading(false); }
  };

  const togglePresetItem = (item: string) => {
    const exists = serviceForm.itemsIncluded.includes(item);
    if (exists) {
      setServiceForm({ ...serviceForm, itemsIncluded: serviceForm.itemsIncluded.filter(i => i !== item) });
    } else {
      setServiceForm({ ...serviceForm, itemsIncluded: [...serviceForm.itemsIncluded, item] });
    }
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
    if (!user) return;
    setLoading(true);
    try {
      const vendorsRes = await fetch(`${API_BASE_URL}/search`);
      const allVendors = await vendorsRes.json();
      const currentVendor = allVendors.find((v: any) => v.userId === (user._id || user.id));
      const method = serviceForm._id ? 'PUT' : 'POST';
      const endpoint = serviceForm._id ? `/services/${serviceForm._id}` : '/services';
      const payload = {
        vendorId: currentVendor?._id,
        category: serviceForm.category,
        title: serviceForm.title,
        unitType: serviceForm.unitType,
        rate: Number(serviceForm.rate),
        contactNumber: serviceForm.contactNumber,
        itemsIncluded: serviceForm.itemsIncluded,
        images: serviceForm.images
      };
      const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        alert(serviceForm._id ? "Service Updated!" : "Service Published!");
        setServiceForm({ title: '', category: 'tent', rate: '', unitType: 'Per Day', duration: '1 Day', itemsIncluded: [], images: [], contactNumber: '', _id: '', customItem: '' });
        fetchMyServices(); fetchData();
        setView('my-services');
      }
    } catch (e) { alert("Error saving"); } finally { setLoading(false); }
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
      const total = bookingTarget.rate * days;
      
      const res = await fetch(`${API_BASE_URL}/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: user._id || user.id,
          vendorId: targetVendor?._id,
          serviceId: bookingTarget._id,
          ...bookingForm,
          totalAmount: total,
          status: 'pending'
        })
      });
      if (res.ok) {
        alert("Booking Requested! Please wait for Vendor Approval.");
        setBookingTarget(null);
        setView('bookings');
      }
    } catch (e) { alert("Booking failed"); } finally { setLoading(false); }
  };

  if (!user) {
    return (
      <div className="max-w-md mx-auto min-h-screen bg-[#2874f0] flex items-center justify-center p-6">
        <div className="bg-white w-full p-8 rounded-2xl shadow-2xl">
          <div className="flex flex-col items-center mb-8">
            <h1 className="text-4xl font-black text-[#2874f0] italic tracking-tight">GramCart</h1>
            <p className="text-gray-400 text-[10px] font-bold uppercase mt-1">Village-First Marketplace</p>
          </div>
          <form onSubmit={handleAuth} className="space-y-4">
            {authMode === 'register' ? (
              <>
                <input placeholder="Name" className="w-full bg-gray-50 p-4 rounded-xl border border-gray-100 outline-none focus:border-[#2874f0]" onChange={e => setAuthForm({...authForm, name: e.target.value})} required />
                <input placeholder="Mobile" className="w-full bg-gray-50 p-4 rounded-xl border border-gray-100 outline-none focus:border-[#2874f0]" onChange={e => setAuthForm({...authForm, mobile: e.target.value})} required />
              </>
            ) : (
              <input placeholder="Email or Mobile" className="w-full bg-gray-50 p-4 rounded-xl border border-gray-100 outline-none focus:border-[#2874f0]" onChange={e => setAuthForm({...authForm, identifier: e.target.value})} required />
            )}
            <input placeholder="Password" type="password" className="w-full bg-gray-50 p-4 rounded-xl border border-gray-100 outline-none focus:border-[#2874f0]" onChange={e => setAuthForm({...authForm, password: e.target.value})} required />
            {authMode === 'register' && (
              <div className="flex gap-2 p-1 bg-gray-50 rounded-xl border border-gray-100">
                {['user', 'vendor'].map(r => (
                  <button key={r} type="button" onClick={() => setAuthForm({...authForm, role: r})} className={`flex-1 py-2 rounded-lg text-[10px] font-bold transition-all ${authForm.role === r ? 'bg-[#2874f0] text-white' : 'text-gray-400'}`}>{r.toUpperCase()}</button>
                ))}
              </div>
            )}
            <button className="w-full py-4 rounded-xl font-bold text-white bg-[#fb641b] shadow-lg active:scale-95 transition-all">{loading ? '...' : (authMode === 'login' ? 'Login' : 'Sign Up')}</button>
          </form>
          <p className="text-center mt-6 text-xs font-bold text-[#2874f0] cursor-pointer" onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}>
            {authMode === 'login' ? "New to GramCart? Create an account" : "Existing User? Log in"}
          </p>
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
      {/* Flipkart Header */}
      <header className="bg-[#2874f0] p-4 text-white sticky top-0 z-[100] shadow-md">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-3">
             <i className="fas fa-bars text-lg"></i>
             <h1 className="text-xl font-black italic tracking-tight">GramCart</h1>
          </div>
          <LanguageSwitch current={lang} onChange={setLang} />
        </div>
        
        {/* Search Bar with Voice */}
        <div className="relative">
          <input 
            placeholder={Translations[lang].searchPlaceholder} 
            className="w-full bg-white text-gray-800 p-3 pl-10 pr-12 rounded-sm text-sm outline-none shadow-inner"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
          <button 
            onClick={startVoiceSearch}
            className={`absolute right-3 top-1/2 -translate-y-1/2 ${isListening ? 'text-red-500 animate-pulse' : 'text-[#2874f0]'}`}
          >
            <i className="fas fa-microphone"></i>
          </button>
        </div>
      </header>

      <main>
        {view === 'home' && (
          <>
            {/* Quick Categories Icons */}
            <div className="bg-white flex justify-around py-4 mb-2 overflow-x-auto no-scrollbar gap-4 px-4 shadow-sm">
               {CATEGORIES.map(c => (
                 <button key={c.id} onClick={() => fetchData(c.id)} className="flex flex-col items-center gap-1 min-w-[60px]">
                    <div className={`w-12 h-12 rounded-full ${c.color} flex items-center justify-center text-lg shadow-sm border border-white`}>
                      <i className={`fas ${c.icon}`}></i>
                    </div>
                    <span className="text-[9px] font-bold text-gray-600 whitespace-nowrap">{c.name}</span>
                 </button>
               ))}
               <button onClick={() => fetchData('')} className="flex flex-col items-center gap-1 min-w-[60px]">
                    <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-lg text-gray-400">
                      <i className="fas fa-th-large"></i>
                    </div>
                    <span className="text-[9px] font-bold text-gray-600 whitespace-nowrap">All</span>
               </button>
            </div>

            {/* Scrolling Banners */}
            <div className="px-2 mb-4 overflow-hidden">
               <div className="flex gap-2 animate-slideIn">
                 {BANNERS.map(b => (
                   <div key={b.id} className={`${b.color} min-w-[90%] p-4 rounded-lg text-white shadow-sm flex items-center justify-between`}>
                     <div className="max-w-[70%]">
                       <p className="text-sm font-black leading-tight">{b.text}</p>
                       <button className="mt-2 bg-white text-gray-900 text-[10px] font-bold px-3 py-1 rounded-sm uppercase">Shop Now</button>
                     </div>
                     <i className="fas fa-bolt text-3xl opacity-30"></i>
                   </div>
                 ))}
               </div>
            </div>

            {/* Deal of the Day */}
            <div className="bg-white mb-2 p-4 shadow-sm">
                <div className="flex justify-between items-center border-b border-gray-100 pb-3 mb-4">
                  <h3 className="text-lg font-black text-gray-800">Wedding Season Deals</h3>
                  <button className="bg-[#2874f0] text-white text-[10px] px-3 py-1.5 rounded-sm font-bold shadow-md">VIEW ALL</button>
                </div>
                
                <div className="space-y-4">
                  {filteredData.map(vendor => (
                    <div key={vendor._id} className="bg-white rounded-xl border border-gray-100 p-4 animate-fade">
                      <div className="flex justify-between items-center mb-3">
                         <h4 className="font-bold text-gray-800 flex items-center gap-2">
                           {vendor.businessName}
                           {vendor.isVerified && <i className="fas fa-check-circle text-blue-500 text-[10px]"></i>}
                         </h4>
                         <span className="text-green-600 text-[10px] font-black bg-green-50 px-2 py-0.5 rounded">4.5 ⭐</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        {vendor.services?.map((s: any) => (
                          <div key={s._id} className="border border-gray-100 rounded-lg p-2 bg-gray-50/50">
                             {s.images?.[0] ? (
                               <img src={s.images[0]} className="w-full h-24 object-cover rounded-md mb-2" />
                             ) : (
                               <div className="w-full h-24 bg-gray-200 rounded-md mb-2 flex items-center justify-center text-gray-400">
                                 <i className="fas fa-image"></i>
                               </div>
                             )}
                             <p className="text-[10px] font-black text-gray-700 line-clamp-1">{s.title}</p>
                             <p className="text-[10px] font-black text-green-600 mt-1">₹{s.rate}/-</p>
                             <div className="flex gap-1 mt-2">
                               <button onClick={() => setDetailTarget(s)} className="flex-1 bg-white border border-gray-200 text-gray-600 py-1 rounded text-[9px] font-bold">Details</button>
                               <button onClick={() => setBookingTarget(s)} className="flex-1 bg-[#fb641b] text-white py-1 rounded text-[9px] font-bold">Book</button>
                             </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
            </div>
          </>
        )}

        {view === 'vendor-dashboard' && user?.role === UserRole.VENDOR && (
          <div className="p-4 space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h3 className="text-sm font-black text-[#2874f0] uppercase mb-5 tracking-widest flex items-center gap-2">
                 <i className="fas fa-plus-circle"></i> {serviceForm._id ? 'Edit' : 'Add New'} Service
              </h3>
              <form onSubmit={handleAddOrUpdateService} className="space-y-4">
                {/* Image Upload */}
                <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                  <p className="text-[10px] font-black text-blue-400 uppercase mb-3 flex justify-between">
                    Photos (Limit 5)
                    <span>{serviceForm.images.length}/5</span>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {serviceForm.images.map((img, idx) => (
                      <div key={idx} className="relative w-14 h-14">
                        <img src={img} className="w-full h-full object-cover rounded-lg" />
                        <button type="button" onClick={() => removeImage(idx)} className="absolute -top-1 -right-1 bg-red-500 text-white w-4 h-4 rounded-full text-[8px]"><i className="fas fa-times"></i></button>
                      </div>
                    ))}
                    {serviceForm.images.length < 5 && (
                      <button type="button" onClick={() => fileInputRef.current?.click()} className="w-14 h-14 rounded-lg border-2 border-dashed border-blue-200 text-blue-300 flex items-center justify-center">
                        <i className="fas fa-camera"></i>
                      </button>
                    )}
                  </div>
                  <input type="file" multiple accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageUpload} />
                </div>

                <input placeholder="Title (e.g. Wedding DJ)" className="w-full bg-gray-50 p-3 rounded-lg border border-gray-100 text-sm" value={serviceForm.title} onChange={e => setServiceForm({...serviceForm, title: e.target.value})} required />
                <div className="grid grid-cols-2 gap-3">
                   <select className="bg-gray-50 p-3 rounded-lg border border-gray-100 text-xs" value={serviceForm.category} onChange={e => setServiceForm({...serviceForm, category: e.target.value})}>
                     {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                   </select>
                   <select className="bg-gray-50 p-3 rounded-lg border border-gray-100 text-xs" value={serviceForm.unitType} onChange={e => setServiceForm({...serviceForm, unitType: e.target.value})}>
                     <option>Per Day</option><option>Per Piece</option>
                   </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                   <input placeholder="Price (₹)" type="number" className="bg-gray-50 p-3 rounded-lg border border-gray-100 text-sm" value={serviceForm.rate} onChange={e => setServiceForm({...serviceForm, rate: e.target.value})} required />
                   <input placeholder="Contact Number" type="tel" className="bg-gray-50 p-3 rounded-lg border border-gray-100 text-sm" value={serviceForm.contactNumber} onChange={e => setServiceForm({...serviceForm, contactNumber: e.target.value})} required />
                </div>
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <p className="text-[10px] font-black text-gray-400 uppercase mb-3">Inventory Checklist</p>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {(PRESETS[serviceForm.category] || []).map(item => (
                      <button key={item} type="button" onClick={() => togglePresetItem(item)} className={`px-2 py-1 rounded-md text-[9px] font-bold border ${serviceForm.itemsIncluded.includes(item) ? 'bg-[#2874f0] text-white border-[#2874f0]' : 'bg-white text-gray-400'}`}>{item}</button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input placeholder="Custom item..." className="flex-1 bg-white p-2 rounded-lg text-xs border border-gray-200" value={serviceForm.customItem || ''} onChange={e => setServiceForm({...serviceForm, customItem: e.target.value})} />
                    <button type="button" onClick={addCustomItem} className="bg-[#2874f0] text-white px-4 py-2 rounded-lg text-xs font-bold">ADD</button>
                  </div>
                </div>
                <button className="w-full bg-[#fb641b] text-white py-4 rounded-xl font-bold shadow-lg">Save & Go Live</button>
              </form>
            </div>
          </div>
        )}

        {view === 'my-services' && user?.role === UserRole.VENDOR && (
          <div className="p-4 space-y-4">
            <h2 className="text-lg font-black text-gray-800 mb-4">Manage My Store</h2>
            {myServices.map(s => (
              <div key={s._id} className="bg-white p-4 rounded-xl shadow-sm flex items-center gap-4 animate-slideIn">
                <img src={s.images?.[0] || 'https://via.placeholder.com/60'} className="w-16 h-16 rounded-lg object-cover" />
                <div className="flex-1">
                   <p className="font-bold text-gray-800 text-xs">{s.title}</p>
                   <p className="text-green-600 text-[10px] font-black">₹{s.rate} / {s.unitType}</p>
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
          <div className="p-4 space-y-4">
             <h2 className="text-lg font-black text-gray-800 mb-4">{user?.role === UserRole.VENDOR ? 'Sales Orders' : 'My Orders'}</h2>
             {bookings.map(b => (
               <div key={b._id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 border-l-[4px] border-l-[#fb641b]">
                 <div className="flex justify-between items-start mb-3">
                    <div>
                       <p className="text-[10px] font-black text-[#2874f0] uppercase">{b.serviceId?.title}</p>
                       <p className="text-sm font-bold text-gray-800">{user?.role === UserRole.VENDOR ? b.customerId?.name : b.vendorId?.businessName}</p>
                    </div>
                    <span className={`text-[9px] font-black uppercase px-2 py-1 rounded ${b.status === 'pending' ? 'bg-yellow-50 text-yellow-600' : 'bg-green-50 text-green-600'}`}>{b.status}</span>
                 </div>
                 <div className="bg-gray-50 p-3 rounded-lg text-[10px] text-gray-600 space-y-2">
                    <p><i className="fas fa-calendar-alt w-4"></i> {new Date(b.startDate).toDateString()}</p>
                    <p><i className="fas fa-map-marker-alt w-4"></i> {b.address}</p>
                 </div>
                 {user?.role === UserRole.VENDOR && b.status === 'pending' && (
                   <div className="flex gap-2 mt-4">
                      <button onClick={() => updateBookingStatus(b._id, 'approved')} className="flex-1 bg-green-500 text-white py-2 rounded-lg text-[10px] font-bold">APPROVE</button>
                      <button onClick={() => updateBookingStatus(b._id, 'rejected')} className="flex-1 bg-white border border-red-100 text-red-500 py-2 rounded-lg text-[10px] font-bold">REJECT</button>
                   </div>
                 )}
               </div>
             ))}
          </div>
        )}
      </main>

      {/* Details Modal with Reviews UI */}
      {detailTarget && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl relative animate-slideUp">
             <button onClick={() => setDetailTarget(null)} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/30 text-white z-10"><i className="fas fa-times"></i></button>
             
             <div className="h-48 bg-gray-200 overflow-x-auto flex snap-x snap-mandatory no-scrollbar">
                {detailTarget.images?.length > 0 ? detailTarget.images.map((img: string, idx: number) => (
                  <img key={idx} src={img} className="w-full h-full object-cover flex-shrink-0 snap-center" />
                )) : <div className="w-full h-full flex items-center justify-center text-gray-400"><i className="fas fa-image text-3xl"></i></div>}
             </div>

             <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                   <div>
                      <h3 className="text-xl font-black text-gray-800">{detailTarget.title}</h3>
                      <p className="text-green-600 font-black text-sm">₹{detailTarget.rate}/- <span className="text-gray-400 font-bold text-xs">({detailTarget.unitType})</span></p>
                   </div>
                   <div className="bg-green-600 text-white px-2 py-1 rounded text-[10px] font-black">4.5 ⭐</div>
                </div>

                <div className="bg-gray-50 p-4 rounded-xl mb-4 max-h-32 overflow-y-auto">
                   <p className="text-[10px] font-black text-gray-400 uppercase mb-2">Package Details</p>
                   <ul className="grid grid-cols-2 gap-2">
                      {detailTarget.itemsIncluded?.map((item: string, idx: number) => (
                        <li key={idx} className="text-[10px] text-gray-600 font-bold flex items-center gap-1">
                          <i className="fas fa-check text-green-500 text-[8px]"></i> {item}
                        </li>
                      ))}
                   </ul>
                </div>

                {/* Public Reviews Mock UI */}
                <div className="border-t border-gray-100 pt-4 mb-6">
                   <p className="text-[10px] font-black text-gray-800 uppercase mb-3">Customer Reviews (3)</p>
                   <div className="space-y-3">
                      <div className="text-[9px] text-gray-500 border-b border-gray-50 pb-2">
                         <div className="flex gap-1 text-yellow-500 mb-1">
                           <i className="fas fa-star"></i><i className="fas fa-star"></i><i className="fas fa-star"></i><i className="fas fa-star"></i><i className="fas fa-star"></i>
                         </div>
                         <p className="italic">"Very nice service, quality chairs!" - Ramesh K.</p>
                      </div>
                      <div className="text-[9px] text-gray-500 border-b border-gray-50 pb-2">
                         <div className="flex gap-1 text-yellow-500 mb-1">
                           <i className="fas fa-star"></i><i className="fas fa-star"></i><i className="fas fa-star"></i><i className="fas fa-star"></i>
                         </div>
                         <p className="italic">"DJ bass was amazing. Recommended." - Sonu</p>
                      </div>
                   </div>
                </div>

                <button onClick={() => { setBookingTarget(detailTarget); setDetailTarget(null); }} className="w-full bg-[#fb641b] text-white py-4 rounded-xl font-bold uppercase shadow-lg">Book Package</button>
             </div>
          </div>
        </div>
      )}

      {/* Booking Checkout */}
      {bookingTarget && (
        <div className="fixed inset-0 bg-black/80 z-[300] flex items-end justify-center">
          <div className="bg-white w-full rounded-t-3xl p-6 pb-12 animate-slideUp">
             <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-gray-800">Review & Order</h3>
                <button onClick={() => setBookingTarget(null)} className="text-gray-400"><i className="fas fa-times text-xl"></i></button>
             </div>
             <form onSubmit={handleBooking} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase">Start Date</label>
                      <input type="date" className="w-full bg-gray-50 p-3 rounded-lg border border-gray-100 text-xs" onChange={e => setBookingForm({...bookingForm, startDate: e.target.value})} required />
                   </div>
                   <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase">End Date</label>
                      <input type="date" className="w-full bg-gray-50 p-3 rounded-lg border border-gray-100 text-xs" onChange={e => setBookingForm({...bookingForm, endDate: e.target.value})} required />
                   </div>
                </div>
                <div className="space-y-1">
                   <label className="text-[10px] font-black text-gray-400 uppercase">Event Address</label>
                   <textarea placeholder="Enter full address..." className="w-full bg-gray-50 p-3 rounded-lg border border-gray-100 text-xs h-20 outline-none" onChange={e => setBookingForm({...bookingForm, address: e.target.value})} required />
                </div>
                <div className="bg-[#2874f0] p-4 rounded-xl flex justify-between items-center text-white">
                   <div>
                      <p className="text-[10px] font-bold opacity-80">Daily Rate</p>
                      <p className="text-lg font-black">₹{bookingTarget.rate}/-</p>
                   </div>
                   <button className="bg-[#fb641b] text-white px-8 py-3 rounded-lg font-black uppercase text-xs shadow-md">Confirm Order</button>
                </div>
             </form>
          </div>
        </div>
      )}

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white h-20 flex items-center justify-around shadow-[0_-4px_20px_rgba(0,0,0,0.05)] border-t border-gray-100 z-[150]">
        <button onClick={() => setView('home')} className={`flex flex-col items-center gap-1 ${view === 'home' ? 'text-[#2874f0]' : 'text-gray-400'}`}>
           <i className="fas fa-home text-lg"></i><span className="text-[9px] font-bold">Home</span>
        </button>
        <button onClick={() => setView('bookings')} className={`flex flex-col items-center gap-1 ${view === 'bookings' ? 'text-[#2874f0]' : 'text-gray-400'}`}>
           <i className="fas fa-shopping-bag text-lg"></i><span className="text-[9px] font-bold">Orders</span>
        </button>
        {user?.role === UserRole.VENDOR && (
          <>
            <button onClick={() => setView('my-services')} className={`flex flex-col items-center gap-1 ${view === 'my-services' ? 'text-[#2874f0]' : 'text-gray-400'}`}>
               <i className="fas fa-store text-lg"></i><span className="text-[9px] font-bold">My Store</span>
            </button>
            <button onClick={() => { setServiceForm({ title: '', category: 'tent', rate: '', unitType: 'Per Day', duration: '1 Day', itemsIncluded: [], images: [], contactNumber: '', _id: '', customItem: '' }); setView('vendor-dashboard'); }} className={`flex flex-col items-center gap-1 ${view === 'vendor-dashboard' ? 'text-[#2874f0]' : 'text-gray-400'}`}>
               <i className="fas fa-plus-circle text-lg"></i><span className="text-[9px] font-bold">Post</span>
            </button>
          </>
        )}
        <button onClick={() => { localStorage.clear(); setUser(null); }} className="flex flex-col items-center gap-1 text-red-300">
           <i className="fas fa-user-circle text-lg"></i><span className="text-[9px] font-bold">Logout</span>
        </button>
      </nav>

      <style>{`
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        .animate-slideUp { animation: slideUp 0.3s ease-out; }
        @keyframes slideIn { from { transform: translateX(-20px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        .animate-slideIn { animation: slideIn 0.4s ease-out; }
        @keyframes fade { from { opacity: 0; } to { opacity: 1; } }
        .animate-fade { animation: fade 0.3s ease-in; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
};

export default App;
