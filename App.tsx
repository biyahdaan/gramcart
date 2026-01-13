
import React, { useState, useEffect, useRef } from 'react';
import { Language, User, Translations, UserRole, Translation } from './types';
import { CATEGORIES } from './constants';
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
      if (res.ok) setData(await res.json());
    } catch (e) { console.error(e); } finally { setLoading(false); }
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
          images: [...prev.images, reader.result as string].slice(0, 5) // Limit to 5
        }));
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setServiceForm(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
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
        images: serviceForm.images,
        duration: serviceForm.duration
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
      <div className="max-w-md mx-auto min-h-screen bg-blue-600 flex items-center justify-center p-6">
        <div className="bg-white w-full p-8 rounded-[2.5rem] shadow-2xl">
          <h1 className="text-4xl font-black text-blue-600 italic text-center mb-6 tracking-tight">GramCart</h1>
          <form onSubmit={handleAuth} className="space-y-3">
            {authMode === 'register' ? (
              <>
                <input placeholder="Name" className="w-full bg-gray-50 p-4 rounded-2xl border border-gray-100 outline-none focus:border-blue-300" onChange={e => setAuthForm({...authForm, name: e.target.value})} required />
                <input placeholder="Mobile" className="w-full bg-gray-50 p-4 rounded-2xl border border-gray-100 outline-none focus:border-blue-300" onChange={e => setAuthForm({...authForm, mobile: e.target.value})} required />
              </>
            ) : (
              <input placeholder="Email or Mobile" className="w-full bg-gray-50 p-4 rounded-2xl border border-gray-100 outline-none focus:border-blue-300" onChange={e => setAuthForm({...authForm, identifier: e.target.value})} required />
            )}
            <input placeholder="Password" type="password" className="w-full bg-gray-50 p-4 rounded-2xl border border-gray-100 outline-none focus:border-blue-300" onChange={e => setAuthForm({...authForm, password: e.target.value})} required />
            {authMode === 'register' && (
              <div className="flex gap-2 p-1 bg-gray-50 rounded-2xl border border-gray-100">
                {['user', 'vendor'].map(r => (
                  <button key={r} type="button" onClick={() => setAuthForm({...authForm, role: r})} className={`flex-1 py-2 rounded-xl text-[10px] font-bold transition-all ${authForm.role === r ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400'}`}>{r.toUpperCase()}</button>
                ))}
              </div>
            )}
            <button className="w-full py-4 rounded-2xl font-black text-white bg-blue-600 shadow-xl active:scale-[0.98] transition-all" disabled={loading}>{loading ? '...' : (authMode === 'login' ? 'LOGIN' : 'SIGN UP')}</button>
          </form>
          <p className="text-center mt-5 text-[10px] font-black text-gray-400 cursor-pointer uppercase tracking-widest hover:text-blue-600 transition-colors" onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}>
            {authMode === 'login' ? "Create New Account" : "Back to Login"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto min-h-screen bg-gray-50 pb-24 font-sans relative">
      <header className={`p-6 rounded-b-[2.5rem] shadow-xl text-white transition-colors duration-500 ${view === 'home' || view === 'bookings' ? 'bg-blue-600' : 'bg-purple-600'}`}>
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-black italic tracking-tight">GramCart</h1>
          <LanguageSwitch current={lang} onChange={setLang} />
        </div>
        {view === 'home' && (
          <div className="flex gap-2 overflow-x-auto no-scrollbar py-2">
            <button onClick={() => fetchData('')} className="bg-white/20 px-4 py-2 rounded-full whitespace-nowrap text-[10px] font-bold backdrop-blur-md">ALL</button>
            {CATEGORIES.map(c => <button key={c.id} onClick={() => fetchData(c.id)} className="bg-white/20 px-4 py-2 rounded-full whitespace-nowrap text-[10px] font-bold uppercase backdrop-blur-md">{c.name}</button>)}
          </div>
        )}
      </header>

      <main className="p-6">
        {view === 'home' && (
          <div className="space-y-4">
            {data.map(vendor => (
              <div key={vendor._id} className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 animate-fade">
                <h3 className="font-black text-gray-800 text-lg mb-4">{vendor.businessName}</h3>
                <div className="space-y-3">
                  {vendor.services?.map((s: any) => (
                    <div key={s._id} className="bg-gray-50 p-4 rounded-2xl border border-gray-100 hover:border-blue-200 transition-all group">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex flex-col">
                            <p className="text-xs font-black text-gray-700">{s.title}</p>
                            <p className="text-[9px] font-bold text-gray-400 uppercase">{s.category}</p>
                        </div>
                        <p className="text-sm font-black text-blue-600">₹{s.rate}/<span className="text-[10px] font-normal">{s.unitType}</span></p>
                      </div>
                      
                      {s.images && s.images.length > 0 && (
                        <div className="flex gap-2 mb-3 mt-1 overflow-x-auto no-scrollbar">
                           {s.images.slice(0, 3).map((img: string, idx: number) => (
                             <img key={idx} src={img} className="w-16 h-16 rounded-xl object-cover border border-gray-100" />
                           ))}
                           {s.images.length > 3 && (
                             <div className="w-16 h-16 rounded-xl bg-gray-200 flex items-center justify-center text-[10px] font-black text-gray-500">+{s.images.length - 3}</div>
                           )}
                        </div>
                      )}

                      <div className="flex gap-2 mt-3">
                        <button onClick={() => setDetailTarget(s)} className="flex-1 bg-white border border-gray-200 text-gray-600 py-2.5 rounded-xl text-[10px] font-black uppercase hover:bg-gray-50 active:scale-95 transition-all">
                            Details
                        </button>
                        <button onClick={() => setBookingTarget(s)} className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl text-[10px] font-black uppercase shadow-md active:scale-95 transition-all hover:bg-blue-700">
                            Book Now
                        </button>
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
            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-purple-100">
              <h3 className="text-xs font-black text-purple-600 uppercase mb-5 tracking-widest flex items-center gap-2">
                 <i className="fas fa-plus-circle"></i> {serviceForm._id ? 'Edit' : 'Create'} Listing
              </h3>
              <form onSubmit={handleAddOrUpdateService} className="space-y-4">
                {/* Image Upload Section */}
                <div className="bg-purple-50 p-5 rounded-2xl border border-purple-100">
                  <p className="text-[10px] font-black text-purple-400 uppercase mb-3 flex justify-between">
                    Upload Photos (Up to 5)
                    <span>{serviceForm.images.length}/5</span>
                  </p>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {serviceForm.images.map((img, idx) => (
                      <div key={idx} className="relative w-16 h-16 group">
                        <img src={img} className="w-full h-full object-cover rounded-xl border border-purple-200" />
                        <button type="button" onClick={() => removeImage(idx)} className="absolute -top-1 -right-1 bg-red-500 text-white w-5 h-5 rounded-full flex items-center justify-center text-[8px] shadow-sm"><i className="fas fa-times"></i></button>
                      </div>
                    ))}
                    {serviceForm.images.length < 5 && (
                      <button type="button" onClick={() => fileInputRef.current?.click()} className="w-16 h-16 rounded-xl border-2 border-dashed border-purple-200 flex flex-col items-center justify-center text-purple-300 hover:border-purple-400 hover:text-purple-400 transition-all">
                        <i className="fas fa-camera text-sm"></i>
                        <span className="text-[8px] font-black mt-1 uppercase">Add</span>
                      </button>
                    )}
                  </div>
                  <input type="file" multiple accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageUpload} />
                </div>

                <input placeholder="Listing Title" className="w-full bg-gray-50 p-4 rounded-2xl border border-gray-100 outline-none focus:border-purple-300" value={serviceForm.title} onChange={e => setServiceForm({...serviceForm, title: e.target.value})} required />
                <div className="grid grid-cols-2 gap-3">
                  <select className="bg-gray-50 p-4 rounded-2xl border border-gray-100 outline-none text-[10px] font-bold" value={serviceForm.category} onChange={e => setServiceForm({...serviceForm, category: e.target.value})}>
                    {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <select className="bg-gray-50 p-4 rounded-2xl border border-gray-100 outline-none text-[10px] font-bold" value={serviceForm.unitType} onChange={e => setServiceForm({...serviceForm, unitType: e.target.value})}>
                    <option>Per Day</option><option>Per Piece</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input placeholder="Price (₹)" type="number" className="bg-gray-50 p-4 rounded-2xl border border-gray-100 outline-none focus:border-purple-300" value={serviceForm.rate} onChange={e => setServiceForm({...serviceForm, rate: e.target.value})} required />
                  <input placeholder="Business Contact" type="tel" className="bg-gray-50 p-4 rounded-2xl border border-gray-100 outline-none focus:border-purple-300" value={serviceForm.contactNumber} onChange={e => setServiceForm({...serviceForm, contactNumber: e.target.value})} required />
                </div>
                <div className="bg-purple-50 p-5 rounded-2xl border border-purple-100">
                  <p className="text-[10px] font-black text-purple-400 uppercase mb-3">Itemized Inventory</p>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {(PRESETS[serviceForm.category] || []).map(item => (
                      <button key={item} type="button" onClick={() => togglePresetItem(item)} className={`px-3 py-1.5 rounded-lg text-[9px] font-bold border transition-all ${serviceForm.itemsIncluded.includes(item) ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-gray-400 border-gray-200'}`}>{item}</button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input placeholder="Manual Entry..." className="flex-1 bg-white p-3 rounded-xl text-[10px] border border-gray-100 outline-none" value={serviceForm.customItem || ''} onChange={e => setServiceForm({...serviceForm, customItem: e.target.value})} />
                    <button type="button" onClick={addCustomItem} className="bg-purple-600 text-white px-5 py-2 rounded-xl text-[10px] font-black active:scale-95 transition-all">ADD</button>
                  </div>
                </div>
                <button className="w-full bg-purple-600 text-white py-4.5 rounded-2xl font-black text-[11px] shadow-lg shadow-purple-200 active:scale-[0.98] transition-all">PUBLISH SERVICE</button>
              </form>
            </div>
          </div>
        )}

        {view === 'bookings' && (
          <div className="space-y-4">
            <h2 className="font-black text-gray-800 text-lg mb-4 flex items-center justify-between">
              {user?.role === UserRole.VENDOR ? 'Orders Received' : 'My Bookings'}
              <span className="text-[10px] bg-blue-100 text-blue-600 px-3 py-1 rounded-full">{bookings.length} Total</span>
            </h2>
            
            {bookings.length === 0 && (
                <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-300">
                    <i className="fas fa-calendar-times text-4xl text-gray-200 mb-4"></i>
                    <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">No Activity Yet</p>
                </div>
            )}

            {bookings.map(b => (
              <div key={b._id} className={`bg-white p-5 rounded-3xl shadow-sm border-l-[6px] animate-slideIn ${b.status === 'pending' ? 'border-l-yellow-400' : b.status === 'approved' ? 'border-l-green-500' : 'border-l-red-500'}`}>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-wide">{b.serviceId?.title || 'Service Request'}</p>
                    <p className="text-sm font-black text-gray-800 mt-1">
                      {user?.role === UserRole.VENDOR ? `Client: ${b.customerId?.name}` : `Vendor: ${b.vendorId?.businessName}`}
                    </p>
                  </div>
                  <div className="text-right">
                      <span className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase inline-block ${b.status === 'pending' ? 'bg-yellow-50 text-yellow-600' : b.status === 'approved' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                        {b.status === 'pending' ? 'Waiting' : b.status}
                      </span>
                      <p className="text-[9px] text-gray-400 mt-1 font-bold">₹{b.totalAmount}</p>
                  </div>
                </div>
                
                <div className="space-y-3 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                  <div className="flex items-start gap-3">
                    <i className="fas fa-calendar-alt text-blue-400 mt-1 text-xs"></i>
                    <div>
                        <p className="text-[9px] font-black text-gray-400 uppercase">Event Schedule</p>
                        <p className="text-[10px] font-bold text-gray-600">{new Date(b.startDate).toLocaleDateString()} — {new Date(b.endDate).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <i className="fas fa-map-marker-alt text-red-400 mt-1 text-xs"></i>
                    <div>
                        <p className="text-[9px] font-black text-gray-400 uppercase">Service Location</p>
                        <p className="text-[10px] font-bold text-gray-600 leading-relaxed">{b.address}</p>
                    </div>
                  </div>

                  {(user?.role === UserRole.VENDOR || (user?.role === UserRole.USER && b.status === 'approved')) && (
                    <div className="bg-white p-3 rounded-xl border border-dashed border-blue-200 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <i className="fas fa-phone-alt text-green-500 text-xs"></i>
                        <span className="text-xs font-black text-gray-700">
                          {user?.role === UserRole.VENDOR ? b.customerId?.mobile : b.serviceId?.contactNumber}
                        </span>
                      </div>
                      <a href={`tel:${user?.role === UserRole.VENDOR ? b.customerId?.mobile : b.serviceId?.contactNumber}`} className="bg-green-500 text-white p-2 rounded-lg text-[10px]">
                        <i className="fas fa-phone"></i>
                      </a>
                    </div>
                  )}
                </div>

                {user?.role === UserRole.VENDOR && b.status === 'pending' && (
                  <div className="flex gap-3 mt-5">
                    <button onClick={() => updateBookingStatus(b._id, 'approved')} className="flex-1 bg-green-500 text-white py-3 rounded-2xl text-[10px] font-black uppercase shadow-lg shadow-green-100 active:scale-95 transition-all">Accept Order</button>
                    <button onClick={() => updateBookingStatus(b._id, 'rejected')} className="flex-1 bg-white text-red-500 border-2 border-red-50 py-3 rounded-2xl text-[10px] font-black uppercase active:scale-95 transition-all">Decline</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {view === 'my-services' && user?.role === UserRole.VENDOR && (
          <div className="space-y-4">
            <h2 className="font-black text-gray-800 text-lg mb-4 flex items-center gap-3">
                <i className="fas fa-store text-purple-600"></i> My Active Store
            </h2>
            {myServices.length === 0 && <p className="text-center py-10 text-gray-400 text-[10px] uppercase font-black tracking-widest">No Services Listed Yet</p>}
            {myServices.map(s => (
              <div key={s._id} className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 flex justify-between items-center animate-slideIn">
                <div className="flex items-center gap-3">
                  {s.images && s.images[0] && <img src={s.images[0]} className="w-10 h-10 rounded-lg object-cover" />}
                  <div>
                    <p className="font-black text-gray-800 text-xs">{s.title}</p>
                    <div className="flex gap-2 mt-1">
                      <span className="text-[9px] text-purple-600 font-black uppercase bg-purple-50 px-2 py-0.5 rounded">{s.category}</span>
                      <span className="text-[9px] text-gray-400 font-bold">₹{s.rate} / {s.unitType}</span>
                    </div>
                  </div>
                </div>
                <button onClick={() => { setServiceForm({ ...s, itemsIncluded: s.itemsIncluded || [], images: s.images || [], customItem: '' }); setView('vendor-dashboard'); }} className="bg-gray-50 text-gray-400 hover:text-purple-600 hover:bg-purple-50 px-4 py-2 rounded-xl text-[10px] font-black transition-colors uppercase">Edit</button>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Detail View Modal with Image Gallery */}
      {detailTarget && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[110] flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] overflow-hidden animate-slideUp shadow-2xl relative">
            <button onClick={() => setDetailTarget(null)} className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center text-white z-20"><i className="fas fa-times"></i></button>
            
            {/* Image Gallery */}
            <div className="relative h-64 bg-gray-100 overflow-x-auto snap-x snap-mandatory flex no-scrollbar">
              {detailTarget.images && detailTarget.images.length > 0 ? (
                detailTarget.images.map((img: string, idx: number) => (
                  <img key={idx} src={img} className="w-full h-full object-cover flex-shrink-0 snap-center" />
                ))
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-gray-300">
                  <i className="fas fa-image text-4xl mb-2"></i>
                  <p className="text-[10px] font-black uppercase">No Photos Available</p>
                </div>
              )}
              {detailTarget.images && detailTarget.images.length > 1 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                   {detailTarget.images.map((_: any, idx: number) => (
                     <div key={idx} className="w-1.5 h-1.5 rounded-full bg-white/50"></div>
                   ))}
                </div>
              )}
            </div>

            <div className="p-8">
              <div className="mb-6">
                  <p className="text-[10px] font-black text-blue-600 uppercase mb-1 tracking-widest">{detailTarget.category}</p>
                  <h3 className="text-xl font-black text-gray-800">{detailTarget.title}</h3>
                  <p className="text-sm font-bold text-gray-400 mt-1">₹{detailTarget.rate} / {detailTarget.unitType}</p>
              </div>

              <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100 mb-6 max-h-40 overflow-y-auto">
                  <h4 className="text-[10px] font-black text-gray-400 uppercase mb-4 tracking-wider">What's Included</h4>
                  {detailTarget.itemsIncluded?.length > 0 ? (
                      <ul className="space-y-3">
                          {detailTarget.itemsIncluded.map((item: string, idx: number) => (
                              <li key={idx} className="flex items-center gap-3 text-xs font-bold text-gray-600">
                                  <i className="fas fa-check-circle text-green-500 text-[10px]"></i>
                                  {item}
                              </li>
                          ))}
                      </ul>
                  ) : (
                      <p className="text-xs text-gray-400 italic">Base Service</p>
                  )}
              </div>

              <button onClick={() => { setBookingTarget(detailTarget); setDetailTarget(null); }} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-xs uppercase shadow-xl active:scale-95 transition-all">
                  Proceed to Booking
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Booking Checkout Modal */}
      {bookingTarget && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[120] flex items-end justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[3rem] p-8 pb-10 animate-slideUp shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-black text-xl text-gray-800">Complete Booking</h3>
              <button onClick={() => setBookingTarget(null)} className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400"><i className="fas fa-times"></i></button>
            </div>
            
            <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 mb-5">
                <p className="text-[9px] font-black text-blue-400 uppercase mb-2">Package Summary</p>
                <p className="text-[10px] font-bold text-blue-700 leading-relaxed">
                    {bookingTarget.itemsIncluded?.join(", ") || "Base Service"}
                </p>
            </div>

            <form onSubmit={handleBooking} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Event Start</label>
                    <input type="date" className="w-full bg-gray-50 p-4 rounded-2xl border border-gray-100 text-xs outline-none focus:border-blue-400" onChange={e => setBookingForm({...bookingForm, startDate: e.target.value})} required />
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Event End</label>
                    <input type="date" className="w-full bg-gray-50 p-4 rounded-2xl border border-gray-100 text-xs outline-none focus:border-blue-400" onChange={e => setBookingForm({...bookingForm, endDate: e.target.value})} required />
                </div>
              </div>
              <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Delivery Address</label>
                  <textarea placeholder="Tell us exactly where in the village..." className="w-full bg-gray-50 p-4 rounded-2xl border border-gray-100 text-xs h-28 outline-none focus:border-blue-400 resize-none" onChange={e => setBookingForm({...bookingForm, address: e.target.value})} required />
              </div>
              <div className="bg-blue-600 text-white p-5 rounded-3xl flex justify-between items-center shadow-lg shadow-blue-100">
                <div>
                    <p className="text-[10px] font-black opacity-70 uppercase">Daily Rate</p>
                    <p className="font-black">₹{bookingTarget.rate}</p>
                </div>
                <button className="bg-white text-blue-600 px-6 py-3 rounded-xl font-black text-xs uppercase shadow-sm active:scale-95 transition-all">Send Request</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floating Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/80 backdrop-blur-lg h-24 flex items-center justify-around border-t border-gray-100 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] z-50 rounded-t-[3rem] px-8">
        <button onClick={() => setView('home')} className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${view === 'home' ? 'text-blue-600 bg-blue-50 shadow-inner' : 'text-gray-300 hover:text-blue-400'}`}><i className="fas fa-th-large text-xl"></i></button>
        <button onClick={() => setView('bookings')} className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${view === 'bookings' ? 'text-blue-600 bg-blue-50 shadow-inner' : 'text-gray-300 hover:text-blue-400'}`}><i className="fas fa-paper-plane text-xl"></i></button>
        
        {user?.role === UserRole.VENDOR && (
          <>
            <button onClick={() => setView('my-services')} className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${view === 'my-services' ? 'text-purple-600 bg-purple-50 shadow-inner' : 'text-gray-300 hover:text-purple-400'}`}><i className="fas fa-warehouse text-xl"></i></button>
            <button onClick={() => { setServiceForm({ title: '', category: 'tent', rate: '', unitType: 'Per Day', duration: '1 Day', itemsIncluded: [], images: [], contactNumber: '', _id: '', customItem: '' }); setView('vendor-dashboard'); }} className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${view === 'vendor-dashboard' ? 'text-purple-600 bg-purple-50 shadow-inner' : 'text-gray-300 hover:text-purple-400'}`}><i className="fas fa-magic text-xl"></i></button>
          </>
        )}
        
        <button onClick={() => { localStorage.clear(); setUser(null); }} className="w-14 h-14 rounded-2xl flex items-center justify-center text-red-300 hover:text-red-500 transition-colors"><i className="fas fa-sign-out-alt text-xl"></i></button>
      </nav>

      <style>{`
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        .animate-slideUp { animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
        @keyframes slideIn { from { transform: translateX(-10px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        .animate-slideIn { animation: slideIn 0.3s ease-out; }
        @keyframes fade { from { opacity: 0; } to { opacity: 1; } }
        .animate-fade { animation: fade 0.3s ease-in; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
};

export default App;
