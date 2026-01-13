
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

  // Filter data based on search query
  const filteredData = data.filter(vendor => {
    const searchLower = searchQuery.toLowerCase();
    const matchesBusiness = vendor.businessName?.toLowerCase().includes(searchLower);
    const matchesServices = vendor.services?.some((s: any) => 
      s.title?.toLowerCase().includes(searchLower) || 
      s.category?.toLowerCase().includes(searchLower)
    );
    return matchesBusiness || matchesServices;
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
        alert("Biyana Screenshot Sent Successfully!");
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
        alert("Success! Booking Closed.");
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
            alert("Payment Config Saved!");
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
    if (!user) return;
    setLoading(true);
    try {
      const vendorsRes = await fetch(`${API_BASE_URL}/search`);
      const allVendors = await vendorsRes.json();
      const v = allVendors.find((vend: any) => vend.userId === (user._id || user.id));
      if (!v) throw new Error("Vendor not found");

      const method = serviceForm._id ? 'PUT' : 'POST';
      const endpoint = serviceForm._id ? `/services/${serviceForm._id}` : '/services';
      const payload = { ...serviceForm, vendorId: v._id, rate: Number(serviceForm.rate) };

      const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        alert("Service Published Successfully!");
        setServiceForm({ title: '', category: 'tent', description: '', rate: '', unitType: 'Per Day', itemsIncluded: [], images: [], contactNumber: '', _id: '', customItem: '' });
        fetchMyServices(); fetchData(); setView('my-services');
      }
    } catch (e) { alert("Error Publishing Service"); } finally { setLoading(false); }
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

  // Improved Stepper
  const Stepper = ({ status }: { status: string }) => {
    const steps = ['pending', 'approved', 'advance_paid', 'completed'];
    const currentIndex = steps.indexOf(status);
    
    return (
      <div className="flex items-center justify-between w-full mb-10 mt-2 px-2 relative">
        <div className="absolute top-[14px] left-0 right-0 h-[3px] bg-gray-100 z-0"></div>
        {steps.map((step, index) => {
          const isActive = index === currentIndex;
          const isCompleted = index < currentIndex || status === 'reviewed';
          return (
            <div key={step} className="flex flex-col items-center z-10 flex-1 relative">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-700 border-4 border-white shadow-md ${
                isCompleted ? 'bg-green-500 text-white' : isActive ? 'bg-[#2874f0] text-white scale-125' : 'bg-gray-200 text-gray-400'
              } ${isActive ? 'animate-pulse' : ''}`}>
                {isCompleted ? <i className="fas fa-check text-[10px]"></i> : <span className="text-[10px] font-black">{index + 1}</span>}
              </div>
              <span className={`text-[7px] mt-2 font-black uppercase text-center tracking-widest ${isActive ? 'text-[#2874f0]' : isCompleted ? 'text-green-600' : 'text-gray-300'}`}>
                {step.replace('_', ' ')}
              </span>
              {index < steps.length - 1 && (
                 <div className={`absolute top-[14px] left-[50%] w-full h-[3px] -z-10 transition-all duration-1000 ${index < currentIndex ? 'bg-green-500' : 'bg-gray-100'}`}></div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="max-w-md mx-auto min-h-screen bg-[#f1f3f6] pb-24 relative overflow-x-hidden">
      <header className="bg-[#2874f0] p-4 text-white sticky top-0 z-[100] shadow-lg">
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
              <div key={vendor._id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex justify-between items-center mb-4">
                    <h4 className="font-black text-gray-800 tracking-tight">{vendor.businessName}</h4>
                    <span className="text-white bg-green-600 text-[10px] font-black px-2 py-1 rounded">4.5 <i className="fas fa-star text-[8px]"></i></span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {vendor.services?.map((s: any) => (
                    <div key={s._id} className="border border-gray-50 p-2 rounded-2xl bg-gray-50/50 hover:bg-white transition-all shadow-sm hover:shadow-md">
                        <img src={s.images?.[0] || 'https://via.placeholder.com/150'} className="h-28 w-full object-cover rounded-xl mb-2" />
                        <p className="text-[10px] font-black text-gray-700 truncate">{s.title}</p>
                        <p className="text-[#2874f0] font-black text-sm">₹{s.rate}/-</p>
                        <div className="flex gap-1.5 mt-3">
                           <button onClick={() => setDetailTarget(s)} className="flex-1 bg-white border border-gray-200 text-gray-500 text-[9px] font-bold py-2 rounded-lg">Details</button>
                           <button onClick={() => setBookingTarget(s)} className="flex-1 bg-[#fb641b] text-white text-[9px] font-black py-2 rounded-lg shadow-sm">Book</button>
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
              <h3 className="text-sm font-black text-[#2874f0] uppercase mb-6 tracking-widest text-center border-b pb-4">
                 Post New Service
              </h3>
              <form onSubmit={handleAddOrUpdateService} className="space-y-5">
                <div className="bg-blue-50/50 p-5 rounded-2xl border border-blue-100">
                  <p className="text-[10px] font-black text-blue-400 uppercase mb-4 flex justify-between">Photos (Show your work) <span>{serviceForm.images.length}/5</span></p>
                  <div className="flex flex-wrap gap-3">
                    {serviceForm.images.map((img, idx) => (
                      <div key={idx} className="relative w-16 h-16"><img src={img} className="w-full h-full object-cover rounded-xl shadow-sm" /><button type="button" onClick={() => removeImage(idx)} className="absolute -top-1 -right-1 bg-red-500 text-white w-5 h-5 rounded-full text-[10px] flex items-center justify-center shadow-lg"><i className="fas fa-times"></i></button></div>
                    ))}
                    {serviceForm.images.length < 5 && (
                      <button type="button" onClick={() => fileInputRef.current?.click()} className="w-16 h-16 rounded-xl border-2 border-dashed border-blue-200 text-blue-300 flex items-center justify-center hover:bg-white transition-all"><i className="fas fa-camera text-xl"></i></button>
                    )}
                  </div>
                  <input type="file" multiple accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageUpload} />
                </div>
                <input placeholder="Service Title (e.g. Wedding Tent)" className="w-full bg-gray-50 p-4 rounded-xl border border-gray-100 text-sm outline-none focus:border-blue-400" value={serviceForm.title} onChange={e => setServiceForm({...serviceForm, title: e.target.value})} required />
                <div className="grid grid-cols-2 gap-3">
                   <select className="bg-gray-50 p-4 rounded-xl border border-gray-100 text-xs font-bold text-gray-600" value={serviceForm.category} onChange={e => setServiceForm({...serviceForm, category: e.target.value})}>
                     {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                   </select>
                   <select className="bg-gray-50 p-4 rounded-xl border border-gray-100 text-xs font-bold text-gray-600" value={serviceForm.unitType} onChange={e => setServiceForm({...serviceForm, unitType: e.target.value})}>
                     <option>Per Day</option><option>Per Piece</option><option>Per Plate</option>
                   </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                   <input placeholder="Rate (₹)" type="number" className="bg-gray-50 p-4 rounded-xl border border-gray-100 text-sm outline-none" value={serviceForm.rate} onChange={e => setServiceForm({...serviceForm, rate: e.target.value})} required />
                   <input placeholder="Contact No" type="tel" className="bg-gray-50 p-4 rounded-xl border border-gray-100 text-sm outline-none" value={serviceForm.contactNumber} onChange={e => setServiceForm({...serviceForm, contactNumber: e.target.value})} required />
                </div>
                <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100">
                  <p className="text-[10px] font-black text-gray-400 uppercase mb-4">Checklist Items</p>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {(PRESETS[serviceForm.category] || []).map(item => (
                      <button key={item} type="button" onClick={() => togglePresetItem(item)} className={`px-3 py-2 rounded-lg text-[9px] font-black border transition-all ${serviceForm.itemsIncluded.includes(item) ? 'bg-[#2874f0] text-white border-[#2874f0]' : 'bg-white text-gray-400'}`}>{item}</button>
                    ))}
                  </div>
                  <div className="flex gap-2"><input placeholder="Add custom item..." className="flex-1 bg-white p-3 rounded-lg text-xs border border-gray-100 outline-none" value={serviceForm.customItem || ''} onChange={e => setServiceForm({...serviceForm, customItem: e.target.value})} /><button type="button" onClick={addCustomItem} className="bg-[#2874f0] text-white px-5 py-2 rounded-lg text-xs font-bold active:scale-95">ADD</button></div>
                </div>
                <textarea placeholder="Describe your service in detail..." className="w-full bg-gray-50 p-4 rounded-xl border border-gray-100 text-sm h-28 outline-none" value={serviceForm.description} onChange={e => setServiceForm({...serviceForm, description: e.target.value})} />
                <button className="w-full bg-[#fb641b] text-white py-4.5 rounded-2xl font-black uppercase text-xs shadow-xl tracking-widest active:scale-95 transition-all">Publish Live</button>
              </form>
            </div>
          </div>
        )}

        {view === 'bookings' && (
          <div className="space-y-6">
             <h2 className="text-lg font-black text-gray-800 border-l-4 border-[#fb641b] pl-3 mb-4">My Orders</h2>
             {bookings.map(b => {
                const advanceAmount = Math.round((b.totalAmount * (b.vendorId?.advancePercent || 10)) / 100);
                const remainingAmount = b.totalAmount - advanceAmount;
                return (
               <div key={b._id} className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-50 animate-slideIn">
                 <div className="flex justify-between items-start mb-6">
                    <div>
                        <p className="text-[9px] font-black text-[#2874f0] uppercase tracking-widest mb-1">{b.serviceId?.title}</p>
                        <h4 className="font-black text-gray-800 text-lg leading-tight">{user?.role === UserRole.VENDOR ? b.customerId?.name : b.vendorId?.businessName}</h4>
                    </div>
                    <span className="text-[8px] font-black uppercase px-3 py-1.5 rounded-full bg-blue-50 text-blue-600">{b.status.replace('_', ' ')}</span>
                 </div>
                 <Stepper status={b.status} />
                 <div className="bg-gray-50/80 p-5 rounded-2xl text-[10px] text-gray-600 space-y-3 border border-gray-100 mb-6 font-bold uppercase tracking-tight">
                    <div className="flex justify-between"><span>Date:</span><span>{new Date(b.startDate).toDateString()}</span></div>
                    <div className="flex justify-between border-t pt-2 border-gray-200"><span className="text-gray-400">Total Bill:</span><span className="text-sm font-black text-gray-800">₹{b.totalAmount}</span></div>
                 </div>

                 {user?.role === UserRole.USER && b.status === 'approved' && (
                    <div className="bg-blue-50 p-6 rounded-2xl border-2 border-dashed border-blue-200 mb-4 text-center">
                        <p className="text-[10px] font-black text-blue-800 uppercase mb-4 tracking-widest">Biyana Due: ₹{advanceAmount}</p>
                        <div className="bg-white p-3 rounded-xl border border-blue-100 text-[9px] font-black text-[#2874f0] mb-5">UPI ID: {b.vendorId?.upiId}</div>
                        <input type="file" className="hidden" ref={proofInputRef} onChange={(e) => handleAdvanceUpload(e, b._id)} />
                        <button onClick={() => proofInputRef.current?.click()} className="w-full bg-[#2874f0] text-white py-3.5 rounded-xl text-[10px] font-black uppercase shadow-lg">Upload Proof</button>
                    </div>
                 )}

                 {user?.role === UserRole.VENDOR && b.status === 'advance_paid' && !b.advanceVerified && (
                    <div className="bg-orange-50 p-6 rounded-2xl border-2 border-dashed border-orange-200 mb-4 animate-slideUp">
                        <h5 className="text-[10px] font-black text-orange-800 uppercase mb-4 text-center">Verify Biyana Proof</h5>
                        {b.advanceProof && <img src={b.advanceProof} className="w-full h-56 object-contain rounded-xl border-2 border-white mb-5 bg-white shadow-sm" />}
                        <button onClick={() => updateBookingStatus(b._id, { advanceVerified: true, status: 'advance_paid' })} className="w-full bg-green-500 text-white py-3.5 rounded-xl text-[10px] font-black uppercase shadow-xl">Payment Verified</button>
                    </div>
                 )}

                 {user?.role === UserRole.VENDOR && b.status === 'advance_paid' && b.advanceVerified && (
                    <button onClick={() => updateBookingStatus(b._id, { status: 'completed' })} className="w-full bg-[#2874f0] text-white py-3.5 rounded-xl text-[10px] font-black uppercase shadow-lg">Mark as Job Completed</button>
                 )}

                 {user?.role === UserRole.USER && b.status === 'completed' && (
                    <div className="bg-green-50 p-6 rounded-2xl border-2 border-dashed border-green-200 mb-4 text-center animate-slideIn">
                        <p className="text-[11px] font-black text-green-800 mb-4 uppercase">Final Balance: ₹{remainingAmount}</p>
                        <button onClick={() => setReviewTarget(b._id)} className="w-full bg-[#fb641b] text-white py-4 rounded-xl text-[10px] font-black uppercase shadow-lg">Confirm & Review</button>
                    </div>
                 )}

                 {user?.role === UserRole.VENDOR && b.status === 'pending' && (
                   <div className="flex gap-3">
                      <button onClick={() => updateBookingStatus(b._id, { status: 'approved' })} className="flex-1 bg-green-500 text-white py-3.5 rounded-xl text-[10px] font-black uppercase shadow-lg transition-all active:scale-95">Approve</button>
                      <button onClick={() => updateBookingStatus(b._id, { status: 'rejected' })} className="flex-1 bg-white border-2 border-red-50 text-red-500 py-3.5 rounded-xl text-[10px] font-black uppercase active:scale-95">Reject</button>
                   </div>
                 )}
               </div>
             )})}
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white h-22 flex items-center justify-around shadow-2xl border-t z-[150] rounded-t-[2.5rem] px-4">
        <button onClick={() => setView('home')} className={`flex flex-col items-center gap-1.5 transition-all ${view === 'home' ? 'text-[#2874f0] scale-110' : 'text-gray-300'}`}><i className="fas fa-home text-xl"></i><span className="text-[8px] font-black uppercase">Home</span></button>
        <button onClick={() => setView('bookings')} className={`flex flex-col items-center gap-1.5 transition-all ${view === 'bookings' ? 'text-[#2874f0] scale-110' : 'text-gray-300'}`}><i className="fas fa-shopping-bag text-xl"></i><span className="text-[8px] font-black uppercase">Orders</span></button>
        {user?.role === UserRole.VENDOR && (
          <button onClick={() => setView('vendor-dashboard')} className={`flex flex-col items-center gap-1.5 transition-all ${view === 'vendor-dashboard' ? 'text-[#2874f0] scale-110' : 'text-gray-300'}`}><i className="fas fa-plus-circle text-xl"></i><span className="text-[8px] font-black uppercase">Post</span></button>
        )}
        <button onClick={() => { localStorage.clear(); setUser(null); }} className="text-red-200 hover:text-red-500 transition-colors"><i className="fas fa-power-off text-xl"></i></button>
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
